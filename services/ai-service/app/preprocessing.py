import cv2
import numpy as np
from app.config import settings

def preprocess_image(image_bytes: bytes) -> tuple[np.ndarray, np.ndarray]:
    """
    Decodes, resizes, pads, and normalizes image bytes.
    Returns:
        - normalized_tensor: shape (1, 3, H, W) float32 numpy array
        - original_image: shape (H, W, 3) uint8 numpy array (for visualization/Grad-CAM)
    """
    # 1. Decode image bytes
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR) # BGR format
    if img is None:
        raise ValueError("Uploaded image file is corrupt or has invalid headers.")

    # Convert to RGB for model processing
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w, _ = img_rgb.shape

    # 2. Resize with aspect ratio preservation (padding)
    target_size = settings.IMAGE_SIZE
    scale = target_size / max(h, w)
    new_h, new_w = int(h * scale), int(w * scale)
    
    resized = cv2.resize(img_rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    # Pad with black borders to make it square
    padded = np.zeros((target_size, target_size, 3), dtype=np.uint8)
    pad_y = (target_size - new_h) // 2
    pad_x = (target_size - new_w) // 2
    padded[pad_y:pad_y + new_h, pad_x:pad_x + new_w, :] = resized

    # 3. Normalize using standard ImageNet stats
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    
    normalized = padded.astype(np.float32) / 255.0
    normalized = (normalized - mean) / std

    # Change data layout from HWC to CHW (Channels-First) and add Batch dimension
    tensor = np.transpose(normalized, (2, 0, 1)) # (3, H, W)
    tensor = np.expand_dims(tensor, axis=0)      # (1, 3, H, W)

    return tensor.astype(np.float32), padded
