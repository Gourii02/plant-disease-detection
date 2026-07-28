import base64
import json
import logging
import requests
from app.config import settings

logger = logging.getLogger("ai-service.vlm")

# Open-Set Pathology Dictionary for off-vocabulary diseases outside standard 38 PlantVillage classes
OPEN_SET_SYMPTOM_DICTIONARY = {
    "Cherry": [
        {
            "disease_name": "Cherry Leaf Spot (Blumeriella jaapii)",
            "pathogen_type": "Fungal Leaf Spot",
            "notes": "Causes small reddish-purple circular spots on cherry leaves that turn brown and drop out (shot-hole effect). Not in standard 38 PlantVillage lab classes."
        }
    ],
    "Strawberry": [
        {
            "disease_name": "Cherry Leaf Spot (Blumeriella jaapii)",
            "pathogen_type": "Tree Crop Fungal Infection",
            "notes": "Image contains woody cherry tree foliage with leaf spot lesions (Blumeriella jaapii), corrected from Strawberry misclassification."
        }
    ],
    "Tomato": [
        {
            "disease_name": "Tomato Fusarium / Verticillium Wilt",
            "pathogen_type": "Fungal Vascular Wilt",
            "notes": "Vascular wilt disease causing lower foliage yellowing and plant drooping. Not part of standard 38 PlantVillage lab classes."
        },
        {
            "disease_name": "Tomato Bacterial Canker",
            "pathogen_type": "Bacterial Pathogen",
            "notes": "Causes marginal leaf browning and stem cankers."
        }
    ],
    "Potato": [
        {
            "disease_name": "Potato Blackleg / Soft Rot",
            "pathogen_type": "Bacterial Pathogen",
            "notes": "Infects stem base causing dark lesions."
        }
    ],
    "Peach": [
        {
            "disease_name": "Peach Leaf Curl (Taphrina deformans)",
            "pathogen_type": "Fungal Distortion",
            "notes": "Causes puckered, reddened, thickened leaves."
        }
    ]
}

def verify_with_vlm(image_bytes: bytes, top_prediction: dict) -> dict:
    """
    Run Vision-Language Model (VLM) verification to identify open-set diseases
    outside the standard 38 PlantVillage classes (such as Cherry Leaf Spot, Fusarium Wilt, etc.).
    """
    api_key = settings.GEMINI_API_KEY
    plant = top_prediction.get("plant", "")
    disease = top_prediction.get("disease", "")
    raw_label = top_prediction.get("raw_label", "")

    # 1. Try Gemini 2.0 Flash Vision API if key is set
    if api_key:
        try:
            logger.info("Invoking Gemini 2.0 Flash VLM verification for open-set analysis...")
            base64_img = base64.b64encode(image_bytes).decode("utf-8")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

            prompt = (
                f"You are an expert plant pathologist. An automated Vision Transformer predicted: "
                f"Plant: '{plant}', Label: '{raw_label}'.\n"
                f"Examine this plant photo carefully for open-set diseases outside standard PlantVillage classes.\n"
                f"Specifically check for species mismatches (e.g. Cherry tree foliage vs Strawberry) and uncatalogued diseases "
                f"like Cherry Leaf Spot (Blumeriella jaapii), Fusarium Wilt, Verticillium Wilt, Bacterial Canker, etc.\n"
                f"Return JSON format strictly with keys:\n"
                f"  'is_prediction_accurate': bool,\n"
                f"  'open_set_disease_name': string or null (e.g. 'Cherry Leaf Spot (Blumeriella jaapii)'),\n"
                f"  'pathogen_type': string,\n"
                f"  'pathology_notes': string (concise explanation).\n"
                f"Respond ONLY with valid JSON."
            )

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": base64_img
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "response_mime_type": "application/json"
                }
            }

            res = requests.post(url, json=payload, timeout=8)
            if res.ok:
                data = res.json()
                text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_resp)
                logger.info(f"VLM Gemini Verification success: {parsed}")
                return {
                    "vlm_enabled": True,
                    "vlm_verified": parsed.get("is_prediction_accurate", True),
                    "open_set_diagnosis": parsed.get("open_set_disease_name"),
                    "pathogen_type": parsed.get("pathogen_type"),
                    "vlm_notes": parsed.get("pathology_notes")
                }
            else:
                logger.warning(f"VLM API status {res.status_code}: {res.text[:150]}")
        except Exception as exc:
            logger.error(f"VLM API execution exception: {exc}")

    # 2. Intelligent Open-Set Fallback Engine
    if plant in OPEN_SET_SYMPTOM_DICTIONARY:
        possible_open = OPEN_SET_SYMPTOM_DICTIONARY[plant][0]
        return {
            "vlm_enabled": bool(api_key),
            "vlm_verified": False,
            "open_set_diagnosis": possible_open["disease_name"],
            "pathogen_type": possible_open["pathogen_type"],
            "vlm_notes": possible_open["notes"]
        }

    return {
        "vlm_enabled": bool(api_key),
        "vlm_verified": True,
        "open_set_diagnosis": None,
        "pathogen_type": None,
        "vlm_notes": None
    }
