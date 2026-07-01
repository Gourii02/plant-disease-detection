# AI Inference & Explanation Service (Python)

This microservice handles real-time image preprocessing, schedules inferences on the Triton server, and generates visual explanations.

## Responsibilities
- Provide REST and gRPC interfaces for image ingestion.
- Preprocess input image binaries (decode, resize, normalize) using OpenCV and NumPy.
- Execute forward-pass inference calls to the Triton Inference Server.
- Generate post-inference visual saliency maps using Grad-CAM.
- Format coordinates of localized symptomatic areas identified by the YOLO detector.

## Technology Stack
- **FastAPI**: Lightweight, asynchronous web framework.
- **Triton Client**: gRPC adapter connecting to Triton Server instances.
- **PyTorch**: Required for Grad-CAM tensor operations and model definitions.
- **Celery**: Handles execution of heavy asynchronous batch diagnostics.
```
