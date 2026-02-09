import httpx

from app.config import settings


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
        response.raise_for_status()
        data = response.json()

        # Handle different possible response formats
        if isinstance(data, str):
            return data
        if isinstance(data, dict):
            return data.get("response") or data.get("content") or data.get("text", "")
        return str(data)
