"""
main.py — The FastAPI application entry point.

This file:
  1. Creates the FastAPI app object
  2. Adds CORS middleware (so your React frontend can call the API)
  3. Loads the AI model once at startup
  4. Defines the two API routes: GET /health and POST /predict
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app import predict
from app.schemas import HealthResponse, PredictResponse

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
# This sends log messages to the console so you can see what's happening.
# Format: "2024-01-15 10:30:00 - app.main - INFO - Starting up..."
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# File validation constants
# ---------------------------------------------------------------------------

MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024  # 10 MB in bytes
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# ---------------------------------------------------------------------------
# Lifespan: load the model once at startup
# ---------------------------------------------------------------------------
# CONCEPT: What is a lifespan event?
#   FastAPI lets you run code when the server starts and stops.
#   The modern way (FastAPI 0.93+) is the @asynccontextmanager "lifespan".
#   Everything BEFORE `yield` runs at startup.
#   Everything AFTER `yield` runs at shutdown (nothing needed here).
#
#   This replaces the old @app.on_event("startup") which is deprecated.


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the HuggingFace model when the server starts."""
    logger.info("Server starting up — loading AI model...")
    try:
        predict.load_model()
        logger.info("Server is ready to accept requests.")
    except Exception as e:
        logger.error("FAILED to load model: %s", e)
    yield
    # Shutdown: nothing to clean up


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Plant Disease Detector API",
    description="Upload a plant leaf photo and get a disease diagnosis + treatment plan.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
# CONCEPT: What is CORS?
#   When your React app (running on http://localhost:5173) calls the backend
#   (http://localhost:8000), the browser sees these as different "origins"
#   (different port = different origin).
#
#   Browsers block cross-origin requests by default as a security measure.
#   CORS (Cross-Origin Resource Sharing) is the mechanism that lets the
#   server say "it's OK, I allow requests from these origins."
#
#   Without this, you'd see: "Access to fetch blocked by CORS policy" in
#   the browser console and all your frontend requests would silently fail.
#
# allow_origins: In production, replace "*" with your actual Vercel URL
#   e.g. ["https://plant-detector.vercel.app"]
#   During development, "*" (allow all) is fine.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)




@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    GET /health

    Returns {"status": "ok"} if the server is running.

    Used by:
    - Render (to check if the container is healthy before sending traffic)
    - You (to verify the server started correctly)
    """
    return HealthResponse(status="ok")


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict_disease(
    file: UploadFile = File(..., description="Plant leaf image (JPG or PNG, max 10MB)"),
) -> PredictResponse:
    """
    POST /predict

    Upload a plant leaf image and get a disease diagnosis.

    The `file` parameter comes from the multipart/form-data request body.
    FastAPI automatically parses this for you — you just declare it as
    `UploadFile` and FastAPI does the rest.

    Returns a JSON response with disease name, confidence, symptoms,
    and treatment. If confidence is below 60%, returns uncertain=True.
    """

    # ── Validation 1: File type ──────────────────────────────────────────
    # file.content_type is the MIME type sent by the browser (e.g. "image/jpeg").
    # We also check the filename extension as a second layer.
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{file.content_type}'. Only JPG and PNG images are accepted.",
        )

    if file.filename:
        suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: '{suffix}'. Only .jpg, .jpeg, and .png are accepted.",
            )

    # ── Validation 2: File size ──────────────────────────────────────────
    # We read the entire file into memory as bytes, then check the size.
    # This is fine for 10MB limit — large models need the whole image anyway.
    image_bytes = await file.read()

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(image_bytes) / 1024 / 1024:.1f} MB). Maximum allowed size is {MAX_FILE_SIZE_MB} MB.",
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    # ── Model availability check ──────────────────────────────────────────
    if predict.get_classifier() is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not ready. The server may still be starting up. Please try again in a few seconds.",
        )

    # ── Run inference ─────────────────────────────────────────────────────
    logger.info("Running inference on uploaded file: %s (%d bytes)", file.filename, len(image_bytes))
    try:
        result = predict.run_inference(image_bytes)
    except ValueError as e:
        # run_inference raises ValueError if the image is corrupted/unreadable
        raise HTTPException(
            status_code=422,
            detail=f"Could not process image: {e}",
        ) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    # FastAPI will validate `result` against PredictResponse and serialize to JSON
    return PredictResponse(**result)
