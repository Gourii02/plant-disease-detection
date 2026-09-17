"""
test_health.py — Tests for the GET /health endpoint.

CONCEPT: How FastAPI testing works
  FastAPI comes with a built-in test client powered by `httpx`.
  - `TestClient` spins up the app in a test environment (no real server needed)
  - You call `client.get("/health")` just like `fetch("/health")` in the browser
  - The client returns a Response object with `.status_code` and `.json()`
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_200():
    """GET /health should return HTTP 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_correct_body():
    """GET /health should return JSON body {"status": "ok"}."""
    response = client.get("/health")
    assert response.json() == {"status": "ok"}
