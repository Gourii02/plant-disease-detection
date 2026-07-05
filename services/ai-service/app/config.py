import os

class Settings:
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    # Triton (production inference server — future)
    TRITON_SERVER_URL: str = os.getenv("TRITON_SERVER_URL", "localhost:8001")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "plant_disease_model")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "1")
    IMAGE_SIZE: int = int(os.getenv("IMAGE_SIZE", 224))
    # HuggingFace Serverless Inference API
    HUGGINGFACE_API_TOKEN: str = os.getenv("HUGGINGFACE_API_TOKEN", "")
    HF_MODEL_ID: str = os.getenv(
        "HF_MODEL_ID",
        "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
    )

settings = Settings()
