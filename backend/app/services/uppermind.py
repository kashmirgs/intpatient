import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def authenticate(username: str, password: str) -> dict:
    """Authenticate with UpperMind and return token data."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.UPPERMIND_URL}/auth/token",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        return response.json()


async def get_user(token: str) -> dict:
    """Get user info from UpperMind using a Bearer token."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPPERMIND_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return response.json()


async def translate(text: str, token: str) -> str:
    """Translate text via UpperMind non-interactive chat."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.UPPERMIND_URL}/chat/noninteractive",
            json={
                "content": text,
                "agent_id": settings.TRANSLATOR_AGENT_ID,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        if response.status_code != 200:
            error_detail = response.text
            logger.error("UpperMind translate error (HTTP %s): %s", response.status_code, error_detail)
            raise RuntimeError(f"Translation failed (HTTP {response.status_code}): {error_detail}")
        data = response.json()

        # Handle different possible response formats
        if isinstance(data, str):
            raw = data
        elif isinstance(data, dict):
            raw = data.get("ai_message") or data.get("response") or data.get("content") or data.get("text", "")
        else:
            raw = str(data)

        # Extract text after "assistantfinal" marker if present
        if "assistantfinal" in raw:
            raw = raw.split("assistantfinal", 1)[1]
        return raw.strip()
