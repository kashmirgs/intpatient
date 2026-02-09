import base64

import httpx

from app.config import settings


async def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from an image using Ollama vision model."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": "Extract all text from this image. Return only the extracted text, nothing else.",
                "images": [b64_image],
                "stream": False,
            },
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")
