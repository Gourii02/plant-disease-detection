# Machine Learning & MLOps Workspace

This directory acts as the central workspace for training models, versioning datasets, and deploying artifacts.

## Folder Overview
- **pipelines/**: Automated scripts for orchestrating data collection, model training, evaluation, and registry promotion (Kubeflow / Airflow).
- **models/**: Model definition files, local network configs, and scripts for quantizing weights (converting to ONNX/TFLite formats).
- **configs/**: Configuration JSON/YAML files storing learning rates, data splits, augmentations, and batch sizes.

## Model Cards & Documentation
Refer to:
* **[model_card.md](file:///C:/Users/Gourika%20Chakarverty/.gemini/antigravity-ide/scratch/plant-disease-detection/ml/model_card.md)**: Details architecture selection, target metrics, baseline training parameters, and evaluation benchmarks.
* **[dataset_strategy.md](file:///C:/Users/Gourika%20Chakarverty/.gemini/antigravity-ide/scratch/plant-disease-detection/ml/dataset_strategy.md)**: Outlines data collection pipelines, cleaning protocols, annotation schemas, and data augmentation practices.
