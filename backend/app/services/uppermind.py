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
    try:
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
            logger.info("UpperMind translate HTTP status: %s", response.status_code)
            logger.info("UpperMind translate raw HTTP body: %.500s", response.text)
            if response.status_code != 200:
                error_detail = response.text
                logger.error("UpperMind translate error (HTTP %s): %s", response.status_code, error_detail)
                raise RuntimeError(f"Translation failed (HTTP {response.status_code}): {error_detail}")
            data = response.json()

        # Debug: log raw API response
        logger.info("UpperMind raw response type: %s", type(data).__name__)
        logger.info("UpperMind raw response: %.500s", data)

        # Handle different possible response formats
        if isinstance(data, str):
            raw = data
        elif isinstance(data, dict):
            raw = data.get("ai_message") or data.get("response") or data.get("content") or data.get("text", "")
            logger.info("UpperMind parsed raw (field used): ai_message=%s, response=%s, content=%s, text=%s",
                        bool(data.get("ai_message")), bool(data.get("response")),
                        bool(data.get("content")), bool(data.get("text")))
        else:
            raw = str(data)

        logger.info("UpperMind raw before marker: %.300s", raw)

        # Extract text after "assistantfinal" marker if present
        if "assistantfinal" in raw:
            raw = raw.split("assistantfinal", 1)[1]
            logger.info("UpperMind after marker split: %.300s", raw)

        return raw.strip()
    except Exception:
        logger.exception("translate() failed")
        raise
