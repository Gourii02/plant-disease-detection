#!/usr/bin/env python3
"""
export_to_onnx.py
=================
Exports the HuggingFace MobileNetV2 plant-disease classifier to ONNX format
so it can be served by the NVIDIA Triton Inference Server.

Usage:
    python ml/export_to_onnx.py

Output:
    ml/model_repository/plant_disease_model/1/model.onnx

Requirements (install once):
    pip install torch transformers optimum[onnxruntime]
"""

import os
import sys
import json
from pathlib import Path

import torch
from transformers import AutoFeatureExtractor, AutoModelForImageClassification

# ─── Configuration ────────────────────────────────────────────────────────────

# The same HuggingFace model already used by the /infer endpoint
HF_MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

# Output directory — matches the Triton model repository layout
OUTPUT_DIR = Path(__file__).parent / "model_repository" / "plant_disease_model" / "1"
OUTPUT_ONNX = OUTPUT_DIR / "model.onnx"
LABELS_FILE = Path(__file__).parent / "model_repository" / "plant_disease_model" / "labels.json"

# Input spec — must match triton config.pbtxt and preprocessing.py IMAGE_SIZE
INPUT_NAME = "input_1"
OUTPUT_NAME = "output"
IMAGE_SIZE = 224
BATCH_SIZE = 1


def main():
    print(f"Loading model: {HF_MODEL_ID}")
    print("This may take a minute on the first run (downloading ~14MB)...")

    # Load feature extractor and model from HuggingFace Hub
    try:
        extractor = AutoFeatureExtractor.from_pretrained(HF_MODEL_ID)
        model = AutoModelForImageClassification.from_pretrained(HF_MODEL_ID)
    except Exception as e:
        print(f"ERROR: Failed to load model from HuggingFace Hub: {e}", file=sys.stderr)
        print("Ensure you have internet access and a valid HuggingFace token if required.", file=sys.stderr)
        sys.exit(1)

    model.eval()
    print(f"Model loaded. Number of classes: {model.config.num_labels}")

    # Save the label mapping for triton_client.py reference
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LABELS_FILE.parent.mkdir(parents=True, exist_ok=True)
    label_map = model.config.id2label
    with open(LABELS_FILE, "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"Saved label map ({len(label_map)} classes) to: {LABELS_FILE}")

    # Create a dummy input tensor — shape: (batch, channels, height, width)
    dummy_input = torch.randn(BATCH_SIZE, 3, IMAGE_SIZE, IMAGE_SIZE)

    print(f"\nExporting to ONNX: {OUTPUT_ONNX}")
    print(f"  Input:  '{INPUT_NAME}'  shape={list(dummy_input.shape)}  dtype=float32")
    print(f"  Output: '{OUTPUT_NAME}' shape=[{BATCH_SIZE}, {model.config.num_labels}] dtype=float32")

    try:
        torch.onnx.export(
            model,
            dummy_input,
            str(OUTPUT_ONNX),
            opset_version=14,
            input_names=[INPUT_NAME],
            output_names=[OUTPUT_NAME],
            dynamic_axes={
                INPUT_NAME:  {0: "batch_size"},
                OUTPUT_NAME: {0: "batch_size"},
            },
            do_constant_folding=True,
        )
    except Exception as e:
        # Avoid encoding errors on Windows terminal by using ascii representation
        print(f"ERROR: ONNX export failed: {ascii(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

    file_size_mb = OUTPUT_ONNX.stat().st_size / (1024 * 1024)
    print(f"\n[SUCCESS] Export complete! Model saved to: {OUTPUT_ONNX} ({file_size_mb:.1f} MB)")
    print("\nNext step: restart the Triton container to pick up the new model:")
    print("  docker-compose restart triton")


if __name__ == "__main__":
    main()
