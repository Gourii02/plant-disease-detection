import base64
import cv2
import logging
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
    description="Python inference router connecting custom PyTorch backends via Triton",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI clients
triton_client = TritonInferenceClient()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "triton_url": settings.TRITON_SERVER_URL}

@app.post("/api/v1/diagnose")
async def diagnose(file: UploadFile = File(...)):
    """
    Accepts raw image uploads, preprocesses data, forwards queries to Triton, 
    calculates Grad-CAM overlays, and returns predictions.
    """
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid image format. Supported formats are: JPEG, PNG."
        )

    try:
        # Read raw image data
        contents = await file.read()
        
        # 1. Image preprocessing
        tensor, original_padded = preprocess_image(contents)
        
        # 2. Triton Server Inference
        results = triton_client.predict(tensor)
        
        # 3. Generate visual explainability Grad-CAM map
        overlay_img = generate_gradcam(original_padded, results["boxes"])
        
        # Encode visual overlay map to Base64 to return in JSON payload
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
        logger.error(f"Inference pipeline execution error: {e}")
        raise HTTPException(status_code=500, detail="Internal AI server inference pipeline error.")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Launching AI microservice on port {settings.API_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=settings.API_PORT)
