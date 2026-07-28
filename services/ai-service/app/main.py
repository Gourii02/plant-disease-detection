import io
import logging

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
from transformers import pipeline as hf_pipeline
from app.config import settings
from app.triton_client import TritonInferenceClient
from app.vlm_verifier import verify_with_vlm

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="Plant Disease Detection AI Service",
    description="ViT-Base inference (moudook/pdd, 99.32% accuracy) — local pipeline",
    version="3.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model loading ─────────────────────────────────────────────────────────────
# Loaded once at startup. First run downloads ~330 MB from HuggingFace Hub
# and caches them in ~/.cache/huggingface/hub.

_classifier = None
triton_client = TritonInferenceClient()


@app.on_event("startup")
async def load_model():
    global _classifier
    model_id = settings.LOCAL_MODEL_ID
    logger.info(f"Loading local ViT model: {model_id} ...")
    try:
        # Authenticate with HuggingFace Hub using existing token
        import os
        if settings.HUGGINGFACE_API_TOKEN:
            os.environ["HF_TOKEN"] = settings.HUGGINGFACE_API_TOKEN
            logger.info("HuggingFace authentication configured.")

        device = 0 if torch.cuda.is_available() else -1
        _classifier = hf_pipeline(
            "image-classification",
            model=model_id,
            device=device,
            top_k=5,
        )
        logger.info(f"Model '{model_id}' loaded on {'GPU' if device == 0 else 'CPU'}.")
    except Exception as exc:
        logger.error(f"Failed to load model '{model_id}': {exc}", exc_info=True)
        raise RuntimeError(f"Could not load model '{model_id}': {exc}") from exc


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_label(raw_label: str) -> dict:
    """
    Convert a HuggingFace plant disease label (including raw PlantVillage labels with '___')
    into clean, human-readable plant name, disease details, and standardized label.
    """
    label_str = raw_label
    # 1. Handle raw PlantVillage format (e.g. 'Potato___Early_blight')
    if "___" in label_str or "__" in label_str:
        delimiter = "___" if "___" in label_str else "__"
        parts = label_str.split(delimiter)
        crop_part = parts[0]
        disease_part = parts[1] if len(parts) > 1 else ""

        crop_clean = (
            crop_part.replace("Pepper,_bell", "Bell Pepper")
            .replace("Cherry_(including_sour)", "Cherry")
            .replace("Corn_(maize)", "Corn (Maize)")
            .replace("_", " ")
            .strip()
        )
        disease_clean = disease_part.replace("_", " ").strip()

        is_healthy = "healthy" in disease_clean.lower() or "healthy" in crop_clean.lower()

        if is_healthy:
            clean_plant = crop_clean
            clean_disease = "Healthy"
            display_label = f"Healthy {crop_clean}"
        else:
            clean_plant = crop_clean
            clean_disease = disease_clean.title()
            
            # Standardize display label to match TREATMENTS dictionary keys exactly
            crop_low = crop_clean.lower()
            dis_low = disease_clean.lower()
            
            if crop_low == "apple":
                if "scab" in dis_low:
                    display_label = "Apple Scab"
                elif "black rot" in dis_low:
                    display_label = "Apple with Black Rot"
                elif "cedar" in dis_low or "rust" in dis_low:
                    display_label = "Cedar Apple Rust"
                else:
                    display_label = f"Apple with {clean_disease}"
            elif crop_low == "corn (maize)":
                if "cercospora" in dis_low or "gray" in dis_low:
                    display_label = "Corn (Maize) with Cercospora and Gray Leaf Spot"
                elif "common rust" in dis_low:
                    display_label = "Corn (Maize) with Common Rust"
                elif "northern" in dis_low:
                    display_label = "Corn (Maize) with Northern Leaf Blight"
                else:
                    display_label = f"Corn (Maize) with {clean_disease}"
            elif crop_low == "tomato":
                if "yellow leaf curl" in dis_low:
                    display_label = "Tomato Yellow Leaf Curl Virus"
                elif "mosaic" in dis_low:
                    display_label = "Tomato Mosaic Virus"
                elif "spider" in dis_low or "mite" in dis_low:
                    display_label = "Tomato with Spider Mites or Two-spotted Spider Mite"
                else:
                    display_label = f"Tomato with {clean_disease}"
            elif "with" in dis_low:
                display_label = f"{crop_clean} {clean_disease}"
            else:
                display_label = f"{crop_clean} with {clean_disease}"

        return {
            "plant": clean_plant,
            "disease": clean_disease,
            "is_healthy": is_healthy,
            "display_label": display_label
        }

    # 2. Handle standard human-readable labels (e.g. 'Potato with Early Blight')
    raw_lower = label_str.lower()
    is_healthy = "healthy" in raw_lower

    if is_healthy:
        plant = label_str.replace("Healthy", "").replace("Plant", "").replace("plant", "").strip()
        disease = "Healthy"
        display_label = f"Healthy {plant}" if plant else "Healthy"
    else:
        display_label = label_str
        if " with " in raw_lower:
            parts = label_str.split(" with ")
            plant = parts[0].strip()
            disease = parts[1].strip()
        elif raw_lower.startswith("apple "):
            plant = "Apple"
            disease = label_str[6:].strip()
        elif raw_lower.startswith("cedar apple "):
            plant = "Apple"
            disease = "Cedar Apple Rust"
        elif raw_lower.startswith("cherry "):
            plant = "Cherry"
            disease = label_str[7:].strip()
        elif raw_lower.startswith("squash "):
            plant = "Squash"
            disease = label_str[7:].strip()
        elif raw_lower.startswith("strawberry "):
            plant = "Strawberry"
            disease = label_str[11:].strip()
        elif raw_lower.startswith("tomato "):
            plant = "Tomato"
            disease = label_str[7:].strip()
        else:
            plant = label_str
            disease = "Infection"

    return {
        "plant": plant.strip().title(),
        "disease": disease.strip().title(),
        "is_healthy": is_healthy,
        "display_label": display_label
    }


# _call_huggingface removed — inference is now local via transformers pipeline.


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": settings.LOCAL_MODEL_ID,
        "model_loaded": _classifier is not None,
        "device": "gpu" if torch.cuda.is_available() else "cpu",
    }


def center_crop_image(img: Image.Image) -> Image.Image:
    """Crop image to central square to focus on the primary leaf subject and strip outer background foliage."""
    w, h = img.size
    if w == h:
        return img
    min_dim = min(w, h)
    left = (w - min_dim) / 2
    top = (h - min_dim) / 2
    right = (w + min_dim) / 2
    bottom = (h + min_dim) / 2
    return img.crop((left, top, right, bottom))


@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    """
    Primary inference endpoint — ViT / Swin Transformer.
    Accepts a leaf image, runs center-square focus crop, runs inference,
    and returns top-5 disease predictions with parsed labels and confidence scores.
    """
    if _classifier is None:
        raise HTTPException(status_code=503, detail="Model is still loading. Retry in a few seconds.")

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp", "application/octet-stream"}
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        filename_lower = (file.filename or "").lower()
        if not any(filename_lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format '{content_type}'. Upload a JPEG, PNG, or WebP image."
            )

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file received.")
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image too large. Max 10 MB.")

        # Decode with PIL — transformers pipeline accepts PIL Images
        try:
            raw_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not decode image. Ensure it is a valid JPEG/PNG/WebP.")

        # Apply center-square focus crop to strip background noise
        cropped_image = center_crop_image(raw_image)

        logger.info(f"Running Swin/ViT inference on image ({len(image_bytes)} bytes, cropped to {cropped_image.size})...")
        raw_predictions = _classifier(cropped_image)  # returns list of {label, score}


        # Enrich top-5 predictions with structured plant/disease metadata
        top_predictions = []
        for pred in raw_predictions[:5]:
            parsed = _parse_label(pred["label"])
            top_predictions.append({
                "rank": len(top_predictions) + 1,
                "raw_label": parsed["display_label"],
                "raw_label_original": pred["label"],
                "plant": parsed["plant"],
                "disease": parsed["disease"],
                "is_healthy": parsed["is_healthy"],
                "confidence": round(pred["score"] * 100, 2),  # as percentage
                "confidence_raw": pred["score"],
            })


        top = top_predictions[0] if top_predictions else {}

        # OOD Guard — flag as unsupported if model isn't confident
        OOD_THRESHOLD = 40.0  # percent
        is_unsupported = top.get("confidence", 0) < OOD_THRESHOLD
        warning = None
        if is_unsupported:
            warning = (
                f"Low confidence ({top.get('confidence', 0):.1f}%). "
                "This plant may not be in the supported crops list. "
                "Supported: Apple, Blueberry, Cherry, Corn, Grape, Orange, "
                "Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato."
            )

        # Open-Set VLM Verification for uncatalogued disease detection
        vlm_res = verify_with_vlm(image_bytes, top)

        logger.info(
            f"Inference complete. Top: {top.get('plant')} / {top.get('disease')} "
            f"({top.get('confidence')}%) — OOD: {is_unsupported}"
        )

        return {
            "status": "completed",
            "model": settings.LOCAL_MODEL_ID,
            "top_prediction": top,
            "all_predictions": top_predictions,
            "is_unsupported_plant": is_unsupported,
            "warning": warning,
            "vlm_result": vlm_res,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected inference error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal inference error.")


# NOTE: Legacy Triton /api/v1/diagnose endpoint removed.
# The Triton GPU backend (triton_client.py) is preserved for future production use.
# To re-enable: restore cv2 + base64 imports and the diagnose_triton handler.


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Launching AI microservice on port {settings.API_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=settings.API_PORT)
