import logging
import os
from celery import Celery
from app.preprocessing import preprocess_image
from app.triton_client import TritonInferenceClient
from app.explainability import generate_gradcam

logger = logging.getLogger("celery-worker")

# Load broker endpoint from environment
RABBITMQ_BROKER = os.getenv("RABBITMQ_BROKER_URL", "pyamqp://guest:guest@localhost:5672//")

celery_app = Celery(
    "tasks",
    broker=RABBITMQ_BROKER,
    backend="rpc://"
)

# Initialize Triton client
triton_client = TritonInferenceClient()

@celery_app.task(name="tasks.process_batch_diagnosis")
def process_batch_diagnosis(job_id: str, image_paths: list) -> dict:
    """
    Asynchronous Celery task to process batch uploads.
    Preprocesses images, runs Triton serving inference, computes saliency overlays,
    and returns diagnostic status profiles.
    """
    logger.info(f"Starting Celery batch diagnosis job: {job_id} containing {len(image_paths)} images")
    results = []

    for idx, path in enumerate(image_paths):
        try:
            logger.info(f"Processing image {idx+1}/{len(image_paths)}: {path}")
            
            # Read image file from disk/object storage
            with open(path, "rb") as f:
                image_bytes = f.read()

            # 1. Preprocess image
            tensor, original_padded = preprocess_image(image_bytes)
            
            # 2. Triton serving inference
            infer_res = triton_client.predict(tensor)
            
            # 3. Explainable AI overlays
            overlay_img = generate_gradcam(original_padded, infer_res["boxes"])
            
            # Save visual explanation back to a localized storage directory
            output_dir = os.path.dirname(path)
            output_path = os.path.join(output_dir, f"explanation_{job_id}_{idx}.jpg")
            
            import cv2
            cv2.imwrite(output_path, cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR))

            results.append({
                "file_path": path,
                "status": "success",
                "species": infer_res["species"],
                "disease": infer_res["disease"],
                "boxes": infer_res["boxes"],
                "explanation_path": output_path
            })
            
        except Exception as e:
            logger.error(f"Failed to process image {path} in job {job_id}: {e}")
            results.append({
                "file_path": path,
                "status": "failed",
                "error": str(e)
            })

    # Return summary payload
    return {
        "job_id": job_id,
        "status": "completed",
        "results": results
    }
