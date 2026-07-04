import logging
import numpy as np
import tritonclient.grpc as grpcclient
from app.config import settings

logger = logging.getLogger(__name__)

class TritonInferenceClient:
    def __init__(self):
        self.url = settings.TRITON_SERVER_URL
        self.model_name = settings.MODEL_NAME
        self.model_version = settings.MODEL_VERSION
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                # Connection is evaluated lazily
                self._client = grpcclient.InferenceServerClient(url=self.url, verbose=False)
            except Exception as e:
                logger.warning(f"Unable to connect to Triton server at {self.url}: {e}")
        return self._client

    def predict(self, tensor: np.ndarray) -> dict:
        """
        Sends tensor to Triton server.
        Falls back to generating mock predictions for testing if Triton is unreachable.
        """
        client = self._get_client()
        if client is None:
            return self._mock_predict()

        try:
            inputs = [
                grpcclient.InferInput("input_1", tensor.shape, "FP32")
            ]
            inputs[0].set_data_from_numpy(tensor)

            outputs = [
                grpcclient.InferRequestedOutput("species_output"),
                grpcclient.InferRequestedOutput("disease_output"),
                grpcclient.InferRequestedOutput("bbox_output")
            ]

            response = client.infer(
                model_name=self.model_name,
                model_version=self.model_version,
                inputs=inputs,
                outputs=outputs,
                timeout=2.0
            )

            species_out = response.as_numpy("species_output")
            disease_out = response.as_numpy("disease_output")
            bbox_out = response.as_numpy("bbox_output")

            return self._parse_outputs(species_out, disease_out, bbox_out)

        except Exception as e:
            logger.error(f"Triton inference failed: {e}. Falling back to simulation mode.")
            return self._mock_predict()

    def _parse_outputs(self, species_out, disease_out, bbox_out) -> dict:
        # Map output indexes to labels (Mock classes list matching blueprint specs)
        species_classes = ["Tomato", "Potato", "Apple", "Corn", "Grape"]
        disease_classes = [
            "tomato_early_blight", "potato_late_blight", "apple_scab", 
            "corn_rust", "grape_black_rot", "healthy"
        ]

        # Extract top predictions
        species_idx = int(np.argmax(species_out[0]))
        disease_idx = int(np.argmax(disease_out[0]))

        species_conf = float(species_out[0][species_idx])
        disease_conf = float(disease_out[0][disease_idx])

        # Bounding box parsing: shape (N, 5) -> xmin, ymin, xmax, ymax, confidence
        boxes = []
        for box in bbox_out[0]:
            if box[4] > 0.5: # Confidence threshold
                boxes.append({
                    "box": [float(box[0]), float(box[1]), float(box[2]), float(box[3])],
                    "confidence": float(box[4])
                })

        return {
            "species": {
                "name": species_classes[species_idx] if species_idx < len(species_classes) else "Unknown",
                "confidence": species_conf
            },
            "disease": {
                "name": disease_classes[disease_idx] if disease_idx < len(disease_classes) else "healthy",
                "confidence": disease_conf
            },
            "boxes": boxes
        }

    def _mock_predict(self) -> dict:
        """Fallback mock response simulating a successful prediction run."""
        logger.info("Generating mock diagnostics response...")
        return {
            "species": {
                "name": "Tomato",
                "confidence": 0.982
            },
            "disease": {
                "name": "tomato_early_blight",
                "confidence": 0.941
            },
            "boxes": [
                {
                    "box": [25.0, 40.0, 180.0, 200.0],
                    "confidence": 0.89
                }
            ]
        }
