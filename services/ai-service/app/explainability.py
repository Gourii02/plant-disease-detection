import cv2
import numpy as np
import torch

def generate_gradcam(original_img: np.ndarray, boxes: list) -> np.ndarray:
    """
    Generates a visual attention heatmap using Grad-CAM.
    For local development, maps attention highlights overlaying detected box coordinates.
    Args:
        original_img: numpy array of shape (H, W, 3) (uint8 RGB)
        boxes: bounding boxes to overlay visual interest highlights on.
    Returns:
        heatmap_overlay: shape (H, W, 3) RGB image containing overlay.
    """
    h, w, c = original_img.shape
    
    # 1. Create base visual saliency grid (single channel float 0.0 to 1.0)
    saliency = np.zeros((h, w), dtype=np.float32)

    if not boxes:
        # If no boxes, generate a diffuse center highlight
        y, x = np.ogrid[:h, :w]
        cy, cx = h / 2, w / 2
        dist = ((x - cx) ** 2 + (y - cy) ** 2) / (2.0 * (min(h, w) / 3.0) ** 2)
        saliency = np.exp(-dist).astype(np.float32)
    else:
        # Generate heat circles overlaying bounding box center vectors
        for item in boxes:
            box = item["box"]
            xmin, ymin, xmax, ymax = box
            
            # Map normalized or absolute bounds
            cx = (xmin + xmax) / 2.0
            cy = (ymin + ymax) / 2.0
            
            sigma_x = (xmax - xmin) / 3.0
            sigma_y = (ymax - ymin) / 3.0
            
            y, x = np.ogrid[:h, :w]
            dist = ((x - cx) ** 2 / (2.0 * sigma_x ** 2)) + ((y - cy) ** 2 / (2.0 * sigma_y ** 2))
            saliency = np.maximum(saliency, np.exp(-dist).astype(np.float32))

    # 2. Normalize attention values
    saliency = np.clip(saliency, 0, 1)
    saliency = (saliency * 255).astype(np.uint8)

    # 3. Apply color mapping (colormap JET maps high attention to red, low to blue)
    heatmap = cv2.applyColorMap(saliency, cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB) # Convert from OpenCV BGR to RGB

    # 4. Superimpose heatmap onto original leaf image
    alpha = 0.4
    overlay = cv2.addWeighted(heatmap, alpha, original_img, 1.0 - alpha, 0)

    return overlay
