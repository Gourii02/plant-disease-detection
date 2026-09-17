"""
schemas.py — Pydantic models that define the exact shape of our API responses.

What is Pydantic?
  FastAPI uses a library called Pydantic to validate and document data.
  You define a class that inherits from BaseModel and declare fields
  with type hints. FastAPI automatically:
  - Validates that responses match the declared shape
  - Generates the JSON schema shown in /docs
  - Serializes Python objects to JSON
"""

from pydantic import BaseModel
from typing import Optional


class PredictResponse(BaseModel):
    """
    The JSON your frontend will receive after calling POST /predict.

    Two possible shapes:

    When the model is confident (uncertain=False):
    {
        "uncertain": false,
        "disease": "Tomato with Early Blight",
        "confidence": 87.2,
        "severity": "moderate",
        "symptoms": ["Dark concentric rings", "Yellow halo"],
        "treatment": "Apply copper-based fungicide..."
    }

    When the model is NOT confident (uncertain=True):
    {
        "uncertain": true,
        "message": "Confidence too low (42%). Please retake the photo...",
        "confidence": 42.0,
        "disease": null,
        "severity": null,
        "symptoms": null,
        "treatment": null
    }

    All fields are declared Optional so the same class covers both shapes.
    """

    uncertain: bool
    confidence: float
    disease: Optional[str] = None
    severity: Optional[str] = None
    symptoms: Optional[list[str]] = None
    treatment: Optional[str] = None
    message: Optional[str] = None


class HealthResponse(BaseModel):
    """Simple response for GET /health."""

    status: str
