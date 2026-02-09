import os
import pytest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.routers.auth import get_current_user

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test_intpatient.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "token": "test-token-123",
    }


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    """Test client with dependency overrides."""
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session():
    """Direct database session for test assertions."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def mock_uppermind_auth():
    """Mock UpperMind authentication."""
    with patch("app.routers.auth.authenticate", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = {"access_token": "test-token-123"}
        yield mock_auth


@pytest.fixture()
def mock_uppermind_get_user():
    """Mock UpperMind get_user."""
    with patch("app.routers.auth.get_user", new_callable=AsyncMock) as mock_user:
        mock_user.return_value = {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
        }
        yield mock_user


@pytest.fixture()
def mock_uppermind_translate():
    """Mock UpperMind translate."""
    with patch("app.routers.reports.translate", new_callable=AsyncMock) as mock_translate:
        mock_translate.return_value = "Translated text content"
        yield mock_translate


@pytest.fixture()
def mock_ocr():
    """Mock OCR service."""
    with patch("app.routers.reports.extract_text_from_image", new_callable=AsyncMock) as mock:
        mock.return_value = "Extracted text from image"
        yield mock


@pytest.fixture()
def mock_pdf_extract():
    """Mock PDF extraction service."""
    with patch("app.routers.reports.extract_from_pdf", new_callable=AsyncMock) as mock:
        mock.return_value = "Extracted text from PDF"
        yield mock


@pytest.fixture(autouse=True)
def setup_upload_dirs(tmp_path):
    """Use temp directory for uploads during tests."""
    with patch("app.config.settings") as mock_settings:
        mock_settings.UPLOAD_DIR = str(tmp_path / "uploads")
        mock_settings.UPPERMIND_URL = "http://localhost:3000"
        mock_settings.OLLAMA_URL = "http://localhost:11434"
        mock_settings.OLLAMA_MODEL = "deepseek-ocr"
        mock_settings.TRANSLATOR_AGENT_ID = 1
        mock_settings.CORS_ORIGINS = "http://localhost:5173"
        mock_settings.DATABASE_URL = TEST_DATABASE_URL
        mock_settings.MAX_UPLOAD_SIZE_MB = 50
        os.makedirs(str(tmp_path / "uploads" / "radiology"), exist_ok=True)
        os.makedirs(str(tmp_path / "uploads" / "reports"), exist_ok=True)
        yield mock_settings
