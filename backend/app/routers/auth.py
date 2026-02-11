import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.services.uppermind import authenticate, get_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


async def get_current_user(request: Request) -> dict:
    """Dependency that validates the Bearer token via UpperMind and returns the user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.split(" ", 1)[1]
    try:
        user = await get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {**user, "token": token}


@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate with UpperMind and return access token + user info."""
    try:
        auth_data = await authenticate(body.username, body.password)
    except Exception as exc:
        logger.exception("Login failed for user=%s", body.username)
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(exc)}")

    access_token = auth_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="No access token received")

    try:
        user = await get_user(access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Failed to fetch user info")

    return {"access_token": access_token, "user": user}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Return current user info (validates the token)."""
    user_data = {k: v for k, v in current_user.items() if k != "token"}
    return user_data
