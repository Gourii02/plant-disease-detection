import os
from pathlib import Path
from dotenv import load_dotenv

# Always load .env from the ai-service root, regardless of where uvicorn is launched from
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


class Settings:
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    # Triton (production inference server)
    TRITON_SERVER_URL: str = os.getenv("TRITON_SERVER_URL", "localhost:8001")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "plant_disease_model")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "1")
    IMAGE_SIZE: int = int(os.getenv("IMAGE_SIZE", 224))
    # HuggingFace Serverless Inference API (legacy / fallback)
    HUGGINGFACE_API_TOKEN: str = os.getenv("HUGGINGFACE_API_TOKEN", "")
    HF_MODEL_ID: str = os.getenv(
        "HF_MODEL_ID",
        "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
    )
    # Local Swin Transformer model — loaded at startup via transformers pipeline
    LOCAL_MODEL_ID: str = os.getenv("LOCAL_MODEL_ID", "plantdoctor/swin-tiny-patch4-window7-224-plant-doctor")
    # Multimodal Vision-Language Model (VLM) for Open-Set Diseases
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    # Celery / RabbitMQ
    RABBITMQ_BROKER_URL: str = os.getenv("RABBITMQ_BROKER_URL", "pyamqp://guest:guest@localhost:5672//")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    # Internal callback URL — Go core-service internal endpoint
    CORE_SERVICE_INTERNAL_URL: str = os.getenv("CORE_SERVICE_INTERNAL_URL", "http://localhost:8080")

settings = Settings()
