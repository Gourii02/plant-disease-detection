"""
test_predict.py — Tests for POST /predict.

CRITICAL: We mock the model here.
============================================================
The HuggingFace model is ~14MB + PyTorch is ~1.5GB.
We do NOT want GitHub Actions (or your laptop's pytest run) to
download all that just to run tests.

The solution is `unittest.mock.patch`:
  - We replace `predict._classifier` with a fake function
  - The fake function returns a hardcoded result that looks exactly like
    what the real model would return
  - The rest of the code (validation, thresholding, disease lookup) runs
    for real — only the actual neural network call is replaced

This is standard practice in professional software development:
  "Mock external dependencies; test your own logic."
============================================================

CONCEPT: How `patch` works
  `@patch("app.predict._classifier", fake_classifier)`
  temporarily replaces `app.predict._classifier` with `fake_classifier`
  for the duration of that test function. After the test, it's restored.
"""

import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_fake_image_bytes(color: tuple = (100, 150, 80)) -> bytes:
    """
    Create a tiny valid JPEG image in memory (no file needed).

    PIL lets us create an image programmatically:
    - Image.new("RGB", (10, 10), color) → 10×10 pixel solid-color image
    - We save it to a BytesIO buffer (in-memory file) as JPEG
    - .getvalue() extracts the raw bytes we can upload in tests
    """
    img = Image.new("RGB", (10, 10), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


def make_fake_classifier(label: str = "Tomato with Early Blight", score: float = 0.87):
    """
    Create a callable mock that looks like the HuggingFace pipeline.

    The real pipeline returns:
      [{"label": "Tomato with Early Blight", "score": 0.87}, ...]

    Our mock returns the same structure.
    """
    mock = MagicMock()
    # When called with any argument (the image), return a list of dicts
    mock.return_value = [{"label": label, "score": score}]
    return mock


# ---------------------------------------------------------------------------
# Tests: successful confident prediction
# ---------------------------------------------------------------------------


def test_predict_confident_success():
    """
    A valid JPEG uploaded with a confident model prediction should return:
    - HTTP 200
    - uncertain=False
    - disease, confidence, symptoms, treatment
    """
    fake_clf = make_fake_classifier("Tomato with Early Blight", 0.87)

    with patch("app.predict._classifier", fake_clf):
        response = client.post(
            "/predict",
            files={"file": ("leaf.jpg", make_fake_image_bytes(), "image/jpeg")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["uncertain"] is False
    assert body["disease"] == "Tomato with Early Blight"
    assert body["confidence"] == pytest.approx(87.0, abs=0.2)
    assert isinstance(body["symptoms"], list)
    assert len(body["symptoms"]) > 0
    assert isinstance(body["treatment"], str)
    assert body["severity"] in ("none", "moderate", "severe")


def test_predict_png_accepted():
    """PNG files should also be accepted (not just JPEG)."""
    img = Image.new("RGB", (10, 10), (80, 120, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    fake_clf = make_fake_classifier("Healthy Tomato Plant", 0.92)

    with patch("app.predict._classifier", fake_clf):
        response = client.post(
            "/predict",
            files={"file": ("leaf.png", buf.getvalue(), "image/png")},
        )

    assert response.status_code == 200
    assert response.json()["disease"] == "Healthy Tomato Plant"


# ---------------------------------------------------------------------------
# Tests: uncertain prediction (low confidence)
# ---------------------------------------------------------------------------


def test_predict_uncertain_low_confidence():
    """
    If the model's top score is below 60%, response should have uncertain=True
    and a helpful message, not disease details.
    """
    fake_clf = make_fake_classifier("Apple Scab", 0.42)  # 42% < 60% threshold

    with patch("app.predict._classifier", fake_clf):
        response = client.post(
            "/predict",
            files={"file": ("leaf.jpg", make_fake_image_bytes(), "image/jpeg")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["uncertain"] is True
    assert body["confidence"] == pytest.approx(42.0, abs=0.2)
    assert "message" in body
    assert body["disease"] is None


def test_predict_exactly_at_threshold():
    """A score of exactly 60.0% should NOT be uncertain (threshold is <60)."""
    fake_clf = make_fake_classifier("Potato with Early Blight", 0.60)

    with patch("app.predict._classifier", fake_clf):
        response = client.post(
            "/predict",
            files={"file": ("leaf.jpg", make_fake_image_bytes(), "image/jpeg")},
        )

    assert response.status_code == 200
    assert response.json()["uncertain"] is False


# ---------------------------------------------------------------------------
# Tests: invalid file type
# ---------------------------------------------------------------------------


def test_predict_rejects_pdf():
    """Uploading a PDF should return HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("document.pdf", b"fake pdf content", "application/pdf")},
    )
    assert response.status_code == 400
    assert "type" in response.json()["detail"].lower()


def test_predict_rejects_gif():
    """Uploading a GIF (wrong image type) should return HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("animated.gif", b"fake gif", "image/gif")},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tests: file size limits
# ---------------------------------------------------------------------------


def test_predict_rejects_oversized_file():
    """
    A file larger than 10MB should return HTTP 400.
    We generate 11MB of dummy bytes to simulate an oversized upload.
    """
    oversized = b"x" * (11 * 1024 * 1024)  # 11MB of 'x'
    response = client.post(
        "/predict",
        files={"file": ("big.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "large" in response.json()["detail"].lower()


def test_predict_rejects_empty_file():
    """An empty file (0 bytes) should return HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tests: corrupted image
# ---------------------------------------------------------------------------


def test_predict_rejects_corrupted_image():
    """
    Bytes that claim to be JPEG but aren't actually a valid image
    should return HTTP 422 (unprocessable entity).
    """
    fake_clf = make_fake_classifier()

    with patch("app.predict._classifier", fake_clf):
        response = client.post(
            "/predict",
            files={"file": ("corrupted.jpg", b"this is not an image", "image/jpeg")},
        )

    assert response.status_code == 422
