import os

class Settings:
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    TRITON_SERVER_URL: str = os.getenv("TRITON_SERVER_URL", "localhost:8001")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "plant_disease_model")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "1")
    IMAGE_SIZE: int = int(os.getenv("IMAGE_SIZE", 224))

settings = Settings()
