import base64
import json
import logging
import os

import cv2
import httpx
from celery import Celery

from app.config import settings
from app.explainability import generate_gradcam
from app.preprocessing import preprocess_image
from app.triton_client import TritonInferenceClient

logger = logging.getLogger("celery-worker")

# Celery app — broker is RabbitMQ, result backend is Redis (durable persistence)
celery_app = Celery(
    "tasks",
    broker=settings.RABBITMQ_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,          # acknowledge only after the task completes
    worker_prefetch_multiplier=1, # process one job at a time per worker
)

# Initialize Triton client (falls back to mock if Triton is unreachable)
triton_client = TritonInferenceClient()


def _post_callback(diagnosis_id: str, user_id: int, species: str, disease: str,
                   confidence: float, explanation_b64: str) -> None:
    """
    POST the completed inference result back to the Go core-service internal endpoint.
    The Go handler will update the DB and fire the WebSocket push to the client.
    """
    callback_url = f"{settings.CORE_SERVICE_INTERNAL_URL}/internal/diagnose/complete"
    payload = {
        "diagnosis_id": diagnosis_id,
        "user_id": user_id,
        "species": species,
        "disease": disease,
        "confidence": confidence,
        # Store the Grad-CAM overlay as a data-URI in explanation_url
        "explanation_url": f"data:image/jpeg;base64,{explanation_b64}" if explanation_b64 else "",
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(callback_url, json=payload)
            resp.raise_for_status()
        logger.info(f"Callback successful for diagnosis {diagnosis_id}: {resp.status_code}")
    except Exception as exc:
        # Non-fatal — the DB record will remain as "pending" until the client polls
        logger.error(f"Failed to POST callback for diagnosis {diagnosis_id}: {exc}")


@celery_app.task(name="tasks.process_diagnosis", bind=True, max_retries=3)
def process_diagnosis(self, diagnosis_id: str, user_id: int, image_url: str) -> dict:
    """
    Asynchronous Celery task for a single image inference job.

    Flow:
      1. Fetch image bytes from the provided image_url
      2. Preprocess into a normalized tensor
      3. Send to Triton (falls back to mock if Triton is unreachable)
      4. Generate Grad-CAM overlay
      5. POST result to Go core-service /internal/diagnose/complete
    """
    logger.info(f"[{diagnosis_id}] Starting async inference for user {user_id}, image: {image_url}")

    try:
        # 1. Fetch image bytes
        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(image_url)
                response.raise_for_status()
                image_bytes = response.content
        except Exception as fetch_err:
            logger.error(f"[{diagnosis_id}] Failed to fetch image from {image_url}: {fetch_err}")
            raise self.retry(exc=fetch_err, countdown=5)

        # 2. Preprocess
        tensor, original_padded = preprocess_image(image_bytes)

        # 3. Triton inference (or mock fallback)
        infer_res = triton_client.predict(tensor)

        species_name = infer_res["species"]["name"]
        disease_name = infer_res["disease"]["name"]
        confidence = infer_res["disease"]["confidence"]

        # 4. Grad-CAM overlay → encode to base64
        overlay_img = generate_gradcam(original_padded, infer_res["boxes"])
        success, encoded_buf = cv2.imencode(".jpg", cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR))
        explanation_b64 = base64.b64encode(encoded_buf.tobytes()).decode("utf-8") if success else ""

        logger.info(
            f"[{diagnosis_id}] Inference complete: {species_name} / {disease_name} "
            f"({confidence:.2%} confidence)"
        )

        # 5. Notify Go core-service
        _post_callback(
            diagnosis_id=diagnosis_id,
            user_id=user_id,
            species=species_name,
            disease=disease_name,
            confidence=confidence,
            explanation_b64=explanation_b64,
        )

        return {
            "diagnosis_id": diagnosis_id,
            "status": "completed",
            "species": species_name,
            "disease": disease_name,
            "confidence": confidence,
        }

    except Exception as exc:
        logger.error(f"[{diagnosis_id}] Unhandled error in process_diagnosis: {exc}", exc_info=True)
        # Post a failure callback so the Go side can mark the record as failed
        _post_callback_failed(diagnosis_id, user_id, str(exc))
        raise


def _post_callback_failed(diagnosis_id: str, user_id: int, error_msg: str) -> None:
    """Notify Go that this job failed so it can update status to 'failed'."""
    callback_url = f"{settings.CORE_SERVICE_INTERNAL_URL}/internal/diagnose/complete"
    payload = {
        "diagnosis_id": diagnosis_id,
        "user_id": user_id,
        "species": "unknown",
        "disease": "inference_failed",
        "confidence": 0.0,
        "explanation_url": "",
        "error": error_msg,
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(callback_url, json=payload)
    except Exception:
        pass  # best-effort only


@celery_app.task(name="tasks.process_batch_diagnosis")
def process_batch_diagnosis(job_id: str, image_paths: list) -> dict:
    """
    Batch diagnosis task — processes multiple local image files.
    Used for bulk uploads from object storage (future feature).
    """
    logger.info(f"Starting batch job: {job_id} ({len(image_paths)} images)")
    results = []

    for idx, path in enumerate(image_paths):
        try:
            logger.info(f"[{job_id}] Processing image {idx + 1}/{len(image_paths)}: {path}")

            with open(path, "rb") as f:
                image_bytes = f.read()

            tensor, original_padded = preprocess_image(image_bytes)
            infer_res = triton_client.predict(tensor)
            overlay_img = generate_gradcam(original_padded, infer_res["boxes"])

            output_dir = os.path.dirname(path)
            output_path = os.path.join(output_dir, f"explanation_{job_id}_{idx}.jpg")
            cv2.imwrite(output_path, cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR))

            results.append({
                "file_path": path,
                "status": "success",
                "species": infer_res["species"],
                "disease": infer_res["disease"],
                "boxes": infer_res["boxes"],
                "explanation_path": output_path,
            })

        except Exception as e:
            logger.error(f"[{job_id}] Failed to process {path}: {e}")
            results.append({"file_path": path, "status": "failed", "error": str(e)})

    return {"job_id": job_id, "status": "completed", "results": results}
