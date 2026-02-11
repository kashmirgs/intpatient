import base64
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_MODEL_CONFIGS = {
    "deepseek-ocr": {
        "prompt": "Extract the text in the image.",
        "preambles": ["Do not change the text"],
    },
    "glm-ocr": {
        "prompt": "OCR",
        "preambles": [],
    },
}

_DEFAULT_CONFIG = {
    "prompt": "OCR",
    "preambles": [],
}


async def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from an image using Ollama vision model."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    cfg = _MODEL_CONFIGS.get(settings.OLLAMA_MODEL, _DEFAULT_CONFIG)
    url = f"{settings.OLLAMA_URL}/api/generate"

    logger.info("Ollama OCR request to %s model=%s", url, settings.OLLAMA_MODEL)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": cfg["prompt"],
                    "images": [b64_image],
                    "stream": False,
                },
                headers={"Content-Type": "application/json"},
            )
    except Exception as exc:
        logger.exception(
            "Ollama connection failed: %s: %s (cause: %r)",
            type(exc).__name__, exc, exc.__cause__,
        )
        raise RuntimeError(f"Ollama connection failed: {type(exc).__name__}: {exc}") from exc

    if response.status_code != 200:
        error_detail = response.text
        logger.error("Ollama OCR error (HTTP %s): %s", response.status_code, error_detail)
        raise RuntimeError(f"Ollama OCR failed (HTTP {response.status_code}): {error_detail}")
    data = response.json()
    raw = data.get("response", "")
    for preamble in cfg["preambles"]:
        if raw.startswith(preamble):
            raw = raw[len(preamble):].lstrip("\n")
            break
    return raw.strip()
