"""
predict.py — All inference logic lives here, separate from the web server.

This keeps things clean: main.py handles HTTP, predict.py handles AI.

KEY CONCEPT: The HuggingFace `pipeline`
  transformers.pipeline("image-classification", model="...")
  is a high-level wrapper that handles:
    1. Downloading and caching the model weights
    2. Preprocessing the input image (resize to 224×224, normalize)
    3. Running the neural network forward pass
    4. Post-processing the output probabilities into a sorted list

  The output looks like:
    [
      {"label": "Tomato with Early Blight", "score": 0.872},
      {"label": "Tomato with Late Blight",  "score": 0.051},
      ...
    ]
  Scores are floats between 0 and 1 (they sum to ~1.0 across all 38 classes).
"""

import io
import json
import logging
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from transformers import MobileNetV2ImageProcessor, pipeline

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
CONFIDENCE_THRESHOLD = 60.0  # below this → return uncertain=True

# Load disease info once at module import time (not per request)
_DISEASE_INFO_PATH = Path(__file__).parent / "disease_info.json"
with _DISEASE_INFO_PATH.open() as f:
    DISEASE_INFO: dict = json.load(f)

# ---------------------------------------------------------------------------
# Model singleton
# ---------------------------------------------------------------------------

# This variable holds the loaded pipeline.
# It starts as None and is populated once at server startup.
_classifier = None


def load_model() -> None:
    """
    Download (first time only) and load the HuggingFace model into memory.

    Called ONCE when FastAPI starts up.

    We explicitly load MobileNetV2ImageProcessor instead of relying on auto-detection.
    The model's preprocessor_config.json was saved with transformers 4.27 and lacks
    the `image_processor_type` field that transformers 5.x requires for auto-discovery.
    Passing the processor directly bypasses that broken lookup entirely.
    """
    global _classifier
    logger.info("Loading HuggingFace model: %s", MODEL_ID)
    image_processor = MobileNetV2ImageProcessor.from_pretrained(MODEL_ID)
    _classifier = pipeline(
        "image-classification",
        model=MODEL_ID,
        image_processor=image_processor,
    )
    logger.info("Model loaded successfully.")


def get_classifier():
    """Return the loaded classifier, or None if not loaded yet."""
    return _classifier


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------


def run_inference(image_bytes: bytes) -> dict:
    """
    Run the plant disease classifier on raw image bytes.

    Args:
        image_bytes: The raw bytes of the uploaded image file.

    Returns:
        A dict matching the PredictResponse schema:
        - On confident prediction: disease, confidence, symptoms, treatment, severity
        - On uncertain prediction: uncertain=True, message, confidence

    Raises:
        ValueError: If the image cannot be opened (corrupted file).
        RuntimeError: If the model is not loaded.
    """
    if _classifier is None:
        raise RuntimeError("Model is not loaded. Server may still be starting up.")

    # Step 1: Decode the raw bytes into a PIL Image object.
    # PIL (Pillow) is the standard Python image library.
    # .convert("RGB") ensures we always have 3 color channels, even if
    # someone uploads a PNG with transparency (4 channels) or grayscale.
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as e:
        raise ValueError(f"Could not decode image: {e}") from e

    # Step 2: Run the classifier.
    # The pipeline handles all preprocessing internally:
    #   - Resize to 224×224 pixels
    #   - Normalize pixel values
    #   - Run the MobileNetV2 forward pass
    #   - Apply softmax to get probabilities
    # We get back all 38 predictions, sorted by score (highest first).
    results = _classifier(image)

    # Step 3: Extract the top (most confident) prediction.
    top = results[0]
    label: str = top["label"]
    score: float = top["score"] * 100  # convert 0.872 → 87.2

    logger.info("Top prediction: '%s' with confidence %.1f%%", label, score)

    # Step 4: Apply confidence threshold.
    if score < CONFIDENCE_THRESHOLD:
        logger.info("Confidence %.1f%% is below threshold %.1f%% — returning uncertain.", score, CONFIDENCE_THRESHOLD)
        return {
            "uncertain": True,
            "confidence": round(score, 1),
            "message": (
                f"Confidence too low ({score:.1f}%). "
                "Please retake the photo in better lighting with the leaf "
                "filling most of the frame and in focus."
            ),
        }

    # Step 5: Look up the disease in disease_info.json.
    # The model labels exactly match the keys in disease_info.json.
    info = DISEASE_INFO.get(label)
    if info is None:
        # This should never happen if disease_info.json is complete,
        # but we handle it gracefully just in case.
        logger.warning("Label '%s' not found in disease_info.json", label)
        return {
            "uncertain": True,
            "confidence": round(score, 1),
            "message": f"Detected '{label}' but no treatment info is available for this class.",
        }

    # Step 6: Build and return the successful response.
    return {
        "uncertain": False,
        "disease": label,
        "confidence": round(score, 1),
        "severity": info["severity"],
        "symptoms": info["symptoms"],
        "treatment": info["treatment"],
    }
