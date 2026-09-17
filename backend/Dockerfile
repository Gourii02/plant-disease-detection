# ════════════════════════════════════════════════════════════════════
# Dockerfile — Plant Disease Detector Backend
# ════════════════════════════════════════════════════════════════════
#
# CONCEPT: What is a Dockerfile?
#   A Dockerfile is a recipe — a list of instructions Docker executes
#   top-to-bottom to build an "image" (a snapshot of a system with
#   your code + dependencies already installed and ready to run).
#
#   Once built, that image is a sealed, self-contained box.
#   You run it as a "container" — an isolated process that behaves
#   identically on your laptop, on Render, on anyone's machine.
#
# CONCEPT: Layers and caching
#   Each instruction (FROM, RUN, COPY, etc.) creates a "layer".
#   Docker caches layers. If nothing in a layer changed, Docker skips
#   re-executing it on the next build — like using saved checkpoints.
#
#   This is why we copy requirements BEFORE code:
#   - Code changes constantly (every edit)
#   - Dependencies rarely change
#   - If we copied code first, every code change would bust the pip cache
#   - Putting deps first means pip runs only when requirements.docker.txt changes
# ════════════════════════════════════════════════════════════════════


# ── Step 1: Choose the base image ────────────────────────────────────────────
#
# FROM tells Docker what to start from. We don't build from scratch —
# we start with an image that already has Python 3.11 installed.
#
# "slim" = the smallest official Python image (no extra OS tools).
# Saves ~200MB vs the full python:3.11 image.
#
# Think of this like: "start with a fresh laptop that already has Python."
FROM python:3.11-slim


# ── Step 2: Set the working directory ────────────────────────────────────────
#
# WORKDIR is like `cd /app` inside the container.
# All subsequent COPY and RUN commands happen relative to this directory.
# If /app doesn't exist, Docker creates it automatically.
WORKDIR /app


# ── Step 3: Install system dependencies ──────────────────────────────────────
#
# The "slim" base image is missing a few system libraries that
# transformers/torch need. We install them here.
#
# --no-install-recommends: skip optional extras (keeps image smaller)
# rm -rf /var/lib/apt/lists/*: delete the apt package lists cache after
#   installing (they're not needed anymore and take space)
#
# libgomp1: OpenMP, required by torch for multi-threading
# libgl1:   OpenGL, required by some image processing libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*


# ── Step 4: Copy requirements file and install Python dependencies ────────────
#
# We copy ONLY requirements.docker.txt first (not the app code yet).
#
# Why? Docker layer caching. If we copy everything at once and then run
# pip install, any single code change (even adding a comment) would cause
# Docker to re-run pip install on the next build — taking 5–10 minutes.
#
# By copying requirements first, pip install is only re-run when
# requirements.docker.txt actually changes. Code changes hit a cached pip layer.
COPY requirements.docker.txt .

# Install from the PyTorch CPU-only wheel index (much smaller than GPU version).
#   --no-cache-dir: don't save pip's download cache inside the image
#                   (saves ~100–200MB in the final image size)
#   --extra-index-url: tells pip to also look at PyTorch's own package server
#                      for the +cpu variant of torch that isn't on PyPI
RUN pip install --no-cache-dir \
    -r requirements.docker.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu


# ── Step 5: Pre-download the HuggingFace model ───────────────────────────────
#
# CONCEPT: Why bake the model into the image?
#
#   Option A (bad): Download model at container STARTUP
#     - Every cold start waits 30–60 seconds for the download
#     - If HuggingFace's servers are slow, the container fails to start
#     - Not reproducible (model version could change)
#
#   Option B (good, what we do): Download model at BUILD time
#     - The model lives inside the Docker image (~14MB in the image layers)
#     - Container starts instantly — model already in cache
#     - Build takes longer (one time), but startup is fast every time
#
# This Python one-liner triggers transformers to download and cache the model.
# HuggingFace caches models to ~/.cache/huggingface/ by default.
# When we run the container, that cache directory is already present inside
# the image, so the pipeline loads from disk instantly.
RUN python -c "\
from transformers import pipeline; \
print('Downloading model — this runs once at build time...'); \
pipe = pipeline( \
    'image-classification', \
    model='linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification' \
); \
print('Model downloaded and cached successfully.')"


# ── Step 6: Copy the application code ────────────────────────────────────────
#
# NOW we copy the app code (after deps and model are cached).
# This layer will be invalidated every time you edit app/ files,
# but that's OK — it's a tiny, fast layer (just text files).
#
# .dockerignore (the file we created) prevents venv/, tests/, __pycache__/
# etc. from being included here.
COPY app/ ./app/


# ── Step 7: Declare the port ──────────────────────────────────────────────────
#
# EXPOSE documents that this container listens on port 8000.
# It doesn't actually open the port — that happens when you run the container
# with `-p 8000:8000`. Think of EXPOSE as documentation.
EXPOSE 8000


# ── Step 8: Define the startup command ───────────────────────────────────────
#
# CMD is the command that runs when `docker run` starts the container.
# Using the JSON array form (preferred) — avoids shell quoting issues.
#
# uvicorn:          The ASGI server that runs our FastAPI app
# app.main:app:     Python dotted path — file app/main.py, variable `app`
# --host 0.0.0.0:   ⚠️ CRITICAL — without this, uvicorn only listens on
#                   localhost INSIDE the container. Render's load balancer
#                   (which is outside the container) can't reach it.
#                   0.0.0.0 means "accept connections from any address".
# --port 8000:      Match the EXPOSE above and Render's port setting
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
