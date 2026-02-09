import pytest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from tests.conftest import override_get_db


@pytest.fixture()
def auth_client():
    """Client without the get_current_user override (for testing auth flow)."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestLogin:
    def test_login_success(self, auth_client, mock_uppermind_auth, mock_uppermind_get_user):
        """Test successful login returns token and user info."""
        response = auth_client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "testpass",
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["access_token"] == "test-token-123"
        assert "user" in data
        assert data["user"]["username"] == "testuser"

        mock_uppermind_auth.assert_called_once_with("testuser", "testpass")
        mock_uppermind_get_user.assert_called_once_with("test-token-123")

    def test_login_failure(self, auth_client):
        """Test login with invalid credentials returns 401."""
        with patch("app.routers.auth.authenticate", new_callable=AsyncMock) as mock_auth:
            mock_auth.side_effect = Exception("Invalid credentials")

            response = auth_client.post("/api/auth/login", json={
                "username": "baduser",
                "password": "badpass",
            })

            assert response.status_code == 401

    def test_login_missing_fields(self, auth_client):
        """Test login with missing fields returns 422."""
        response = auth_client.post("/api/auth/login", json={
            "username": "testuser",
        })
        assert response.status_code == 422


class TestMe:
    def test_me_success(self, client):
        """Test /me endpoint with valid auth returns user info."""
        response = client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    def test_me_no_token(self, auth_client):
        """Test /me without authorization header returns 401."""
        response = auth_client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_invalid_token(self, auth_client):
        """Test /me with invalid token returns 401."""
        with patch("app.routers.auth.get_user", new_callable=AsyncMock) as mock_user:
            mock_user.side_effect = Exception("Invalid token")

            response = auth_client.get(
                "/api/auth/me",
                headers={"Authorization": "Bearer invalid-token"},
            )
            assert response.status_code == 401
