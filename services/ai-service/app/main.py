import base64
import io
import logging
import requests as http_requests

import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.preprocessing import preprocess_image
from app.triton_client import TritonInferenceClient
from app.explainability import generate_gradcam

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="Plant Disease Detection AI Service",
    description="Python inference router — HuggingFace Inference API + Triton backend",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Triton client (used when Triton server is running)
triton_client = TritonInferenceClient()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_label(raw_label: str) -> dict:
    """
    Convert a PlantVillage label like 'Tomato___Early_blight' into
    { "plant": "Tomato", "disease": "Early Blight", "is_healthy": false }
    """
    parts = raw_label.split("___")
    plant = parts[0].replace("_", " ").strip() if parts else "Unknown"
    disease_raw = parts[1].replace("_", " ").strip() if len(parts) > 1 else "Unknown"
    is_healthy = "healthy" in disease_raw.lower()
    disease = "Healthy" if is_healthy else disease_raw.title()
    return {"plant": plant.title(), "disease": disease, "is_healthy": is_healthy}


def _call_huggingface(image_bytes: bytes, content_type: str = "image/jpeg") -> list:
    """
    Send image bytes to the HuggingFace Serverless Inference API.
    Returns a list of { label, score } dicts sorted by score descending.
    Raises HTTPException on token / model errors.
    """
    if not settings.HUGGINGFACE_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="HUGGINGFACE_API_TOKEN is not set. Add it to services/ai-service/.env"
        )

    hf_url = f"https://router.huggingface.co/hf-inference/models/{settings.HF_MODEL_ID}"
    headers = {
        "Authorization": f"Bearer {settings.HUGGINGFACE_API_TOKEN}",
        "Content-Type": content_type
    }

    try:
        response = http_requests.post(hf_url, headers=headers, data=image_bytes, timeout=30)
    except http_requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="HuggingFace API request timed out.")
    except http_requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"HuggingFace API unreachable: {exc}")

    if response.status_code == 503:
        # Model is loading (cold start) — pass the estimated wait time back
        try:
            body = response.json()
            wait = body.get("estimated_time", 20)
        except Exception:
            wait = 20
        raise HTTPException(
            status_code=503,
            detail=f"Model is loading on HuggingFace servers. Retry in ~{wait:.0f}s."
        )

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid HuggingFace API token.")

    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail=f"HuggingFace API error {response.status_code}: {response.text[:200]}"
        )

    return response.json()  # list of { "label": str, "score": float }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "hf_model": settings.HF_MODEL_ID,
        "triton_url": settings.TRITON_SERVER_URL,
        "hf_token_set": bool(settings.HUGGINGFACE_API_TOKEN)
    }


@app.post("/infer")
async def infer_huggingface(file: UploadFile = File(...)):
    """
    HuggingFace Inference endpoint.
    Accepts a leaf image, calls the HuggingFace Serverless Inference API,
    and returns top-5 disease predictions with parsed labels and confidence scores.
    """
    # Accept octet-stream too — browsers sometimes send this for drag-dropped files
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp", "application/octet-stream"}
    content_type = (file.content_type or "").lower()

    # If content_type is missing or generic, infer from filename extension
    if content_type not in {"image/jpeg", "image/png", "image/jpg", "image/webp"}:
        filename_lower = (file.filename or "").lower()
        if not any(filename_lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")):
            if content_type not in ALLOWED_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported format '{content_type}'. Upload a JPEG or PNG image."
                )

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file received.")
        if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
            raise HTTPException(status_code=413, detail="Image too large. Max 10 MB.")

        logger.info(f"Received image ({len(image_bytes)} bytes), forwarding to HuggingFace...")

        raw_predictions = _call_huggingface(image_bytes, content_type or "application/octet-stream")

        # Enrich top-5 predictions with parsed plant / disease labels
        top_predictions = []
        for pred in raw_predictions[:5]:
            parsed = _parse_label(pred["label"])
            top_predictions.append({
                "rank": len(top_predictions) + 1,
                "raw_label": pred["label"],
                "plant": parsed["plant"],
                "disease": parsed["disease"],
                "is_healthy": parsed["is_healthy"],
                "confidence": round(pred["score"] * 100, 2),   # as percentage
                "confidence_raw": pred["score"],
            })

        top = top_predictions[0] if top_predictions else {}

        logger.info(f"Inference complete. Top result: {top.get('plant')} / {top.get('disease')} ({top.get('confidence')}%)")

        return {
            "status": "completed",
            "model": settings.HF_MODEL_ID,
            "top_prediction": top,
            "all_predictions": top_predictions,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected inference error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal inference error.")


@app.post("/api/v1/diagnose")
async def diagnose_triton(file: UploadFile = File(...)):
    """
    Legacy Triton Inference endpoint (for future production GPU backend).
    Accepts raw image uploads, preprocesses data, forwards to Triton,
    calculates Grad-CAM overlays, and returns predictions.
    """
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Supported formats are: JPEG, PNG."
        )

    try:
        contents = await file.read()
        tensor, original_padded = preprocess_image(contents)
        results = triton_client.predict(tensor)
        overlay_img = generate_gradcam(original_padded, results["boxes"])

        success, encoded_buf = cv2.imencode(".jpg", cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR))
        if not success:
            raise ValueError("Failed to encode visual overlay image.")

        base64_overlay = base64.b64encode(encoded_buf).decode("utf-8")
        overlay_data_uri = f"data:image/jpeg;base64,{base64_overlay}"

        return {
            "status": "completed",
            "species": results["species"],
            "disease": results["disease"],
            "boxes": results["boxes"],
            "explanation_overlay": overlay_data_uri
        }

    except ValueError as val_err:
        logger.error(f"Validation error: {val_err}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"Triton inference error: {e}")
        raise HTTPException(status_code=500, detail="Triton inference pipeline error.")


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Launching AI microservice on port {settings.API_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=settings.API_PORT)
