# Model Card: Plant Disease Diagnostics

This model card details the primary deep learning network architectures used for identifying plant species, diagnosing disease categories, and localizing symptoms.

## 1. Model Architecture
### Primary Classifier (Multi-Task Learning Backbone)
* **Backbone**: EfficientNetV2-M (pre-trained on ImageNet-1K).
* **Classification Heads**:
  - **Species Classifier**: Fully connected projection layer ($N_{features} \rightarrow 10$ classes) followed by a Softmax activation.
  - **Disease Classifier**: Fully connected projection layer ($N_{features} \rightarrow 25$ classes) followed by a Softmax activation.
* **Loss Functions**:
  - Species Loss: Categorical Cross-Entropy.
  - Disease Loss: Focal Loss (to counteract class imbalances in rare disease patterns).
  - Total Loss: $L_{total} = w_{species} \cdot L_{species} + w_{disease} \cdot L_{disease}$ (weights adjusted dynamically via GradNorm).

### Localization Network (YOLOv8)
* **Model**: Ultralytics YOLOv8n (Nano version, 3.2M parameters).
* **Task**: Single-class object detection targeting leaf disease spots.
* **Loss Function**: Complete IoU (CIoU) loss for box regression paired with Binary Cross-Entropy (BCE) for objectness.

## 2. Intended Use & Boundaries
* **Intended Use**: Real-time diagnostic identification of agricultural diseases from close-up foliage images.
* **Out-of-Scope**: Macro-scale drone crop mapping (requires different spatial resolutions) and root-zone soil diagnostic prediction.
* **Target Platforms**:
  - Cloud serving: FP16 TensorRT optimized weights served on Triton.
  - Mobile client serving: INT8 quantized Flatbuffer models (.tflite) running locally.

## 3. Evaluation & Metrics
* **Core Targets**:
  - Classification Macro F1-score: $\ge 90.0\%$
  - Species Identification Top-1 Accuracy: $\ge 95.0\%$
  - Bounding Box IoU (mAP@0.5): $\ge 75.0\%$
  - Pointing Game (XAI visual focus target): $\ge 80.0\%$ of saliency highlights must overlap with manual crop annotations.

## 4. Hyperparameter Configurations
* **Optimizer**: AdamW ($\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$).
* **Learning Rate Schedule**: Cosine Annealing scheduler (Base $LR = 10^{-3}$, Min $LR = 10^{-6}$).
* **Batch Size**: 64 (distributed over 4 GPUs via PyTorch DDP).
* **Weight Decay**: $10^{-4}$.
