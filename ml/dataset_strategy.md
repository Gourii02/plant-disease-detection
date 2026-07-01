# Dataset Strategy & Curation Guidelines

This document outlines the pipeline stages used to construct, clean, annotate, and augment the plant disease diagnostics training dataset.

## 1. Raw Ingestion & Sourcing
* **PlantVillage Dataset**: Ground truth source for baseline leaf classifications under controlled lighting.
* **IPM Agricultural Extension Databases**: Real-world field images representing natural outdoor variance.
* **Beta Ingress Logs**: User-submitted crop photographs (filtered and anonymized).

## 2. Ingestion Cleaning Protocols
To prevent noise, corrupt datasets, and non-crop samples from entering training, all incoming raw images run through a validation check:
1. **Dimension Filtering**: Reject images with resolutions under $640 \times 480$ pixels.
2. **Quality Check**: Calculate Laplacian variance to detect motion blur. Images with variance below 100 are flagged and removed.
3. **Semantic Filtering**: Run a lightweight MobileNet binary classifier (Leaf vs. Non-Leaf) to automatically filter out pictures of hands, soil, tractor parts, or household animals.

## 3. Data Annotation Rules
* **Format**: All classifications mapped in JSON schemas. Bounding boxes are exported using COCO coordinates ($[x, y, w, h]$ normalized to range $[0,1]$).
* **Double-Blind Labeling**: Each candidate training image must be diagnosed by two distinct agronomists.
  - If labels agree: Image is accepted into the gold set.
  - If labels conflict: Image is routed to an expert plant pathologist for final arbitration.

## 4. Training Augmentation Pipeline
To generalize model performance across dynamic field profiles, apply the following Albumentations transforms on-the-fly during PyTorch training loops:
* **Spatial Transforms**: Random Horizontal/Vertical flips, random rotation (up to $\pm 180^{\circ}$), perspective shifts.
* **Color Transforms**: Light adjustments ($\pm 10\%$ brightness and contrast). Huey adjustments are strictly restricted to preserve crop yellowing/rust signatures.
* **Regularization Transforms**: Mixup (alpha=0.2) and CutMix (alpha=1.0) applied to 30% of incoming mini-batches.
* **Background Substitution**: Cut the leaf bounding masks out and drop them onto pre-indexed backgrounds of soil, dry weed, or rocks.
