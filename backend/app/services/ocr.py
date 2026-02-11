import base64
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from an image using Ollama vision model."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                #"prompt": "Extract all text from this image exactly as written. Output ONLY the text content from the image. Do not add any instructions, preambles, or commentary.",
                "prompt": "OCR",
                "images": [b64_image],
                "stream": False,
            },
            headers={"Content-Type": "application/json"},
        )
        if response.status_code != 200:
            error_detail = response.text
            logger.error("Ollama OCR error (HTTP %s): %s", response.status_code, error_detail)
            raise RuntimeError(f"Ollama OCR failed (HTTP {response.status_code}): {error_detail}")
        data = response.json()
        raw = data.get("response", "")
        # Strip known OCR model preambles (e.g. deepseek-ocr adds "Do not change the text")
        for preamble in ("Do not change the text",):
            if raw.startswith(preamble):
                raw = raw[len(preamble):].lstrip("\n")
                break
        return raw.strip()
