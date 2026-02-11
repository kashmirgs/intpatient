import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx


class TestUpperMindService:
    @pytest.mark.asyncio
    async def test_authenticate_success(self):
        """Test successful authentication with UpperMind."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"access_token": "abc123"}
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.uppermind import authenticate
            result = await authenticate("user", "pass")

            assert result == {"access_token": "abc123"}
            mock_client_instance.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_authenticate_failure(self):
        """Test authentication failure raises exception."""
        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post.side_effect = httpx.HTTPStatusError(
                "401", request=MagicMock(), response=MagicMock(status_code=401)
            )
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.uppermind import authenticate
            with pytest.raises(httpx.HTTPStatusError):
                await authenticate("bad", "creds")

    @pytest.mark.asyncio
    async def test_get_user_success(self):
        """Test fetching user info with valid token."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": 1, "username": "testuser"}
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.uppermind import get_user
            result = await get_user("valid-token")

            assert result["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_translate_success_response_field(self):
        """Test translation with response field in result."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": "Translated text"}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.uppermind import translate
            result = await translate("Hello", "token")

            assert result == "Translated text"

    @pytest.mark.asyncio
    async def test_translate_success_content_field(self):
        """Test translation with content field in result."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"content": "Translated text via content"}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.uppermind import translate
            result = await translate("Hello", "token")

            assert result == "Translated text via content"


class TestOCRService:
    @pytest.mark.asyncio
    async def test_extract_text_from_image(self):
        """Test OCR text extraction from image bytes."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": "Hello World"}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.ocr import extract_text_from_image
            result = await extract_text_from_image(b"fake-image-bytes")

            assert result == "Hello World"

    @pytest.mark.asyncio
    async def test_extract_text_empty_response(self):
        """Test OCR with empty response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": ""}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            from app.services.ocr import extract_text_from_image
            result = await extract_text_from_image(b"blank-image")

            assert result == ""


class TestPDFService:
    @pytest.mark.asyncio
    async def test_extract_from_pdf_with_text(self):
        """Test PDF extraction from a PDF with embedded text."""
        with patch("fitz.open") as mock_fitz_open:
            mock_page = MagicMock()
            mock_page.get_text.return_value = "This is a test document with sufficient text content."

            mock_doc = MagicMock()
            mock_doc.__len__ = MagicMock(return_value=1)
            mock_doc.__getitem__ = MagicMock(return_value=mock_page)
            mock_fitz_open.return_value = mock_doc

            from app.services.pdf import extract_from_pdf
            result = await extract_from_pdf(b"fake-pdf-bytes")

            assert "This is a test document" in result
            mock_doc.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_extract_from_pdf_scanned_page(self):
        """Test PDF extraction from a scanned PDF triggers OCR."""
        with patch("fitz.open") as mock_fitz_open, \
             patch("app.services.pdf.extract_text_from_image", new_callable=AsyncMock) as mock_ocr:

            mock_ocr.return_value = "OCR extracted text"

            mock_pix = MagicMock()
            mock_pix.tobytes.return_value = b"png-image-bytes"

            mock_page = MagicMock()
            mock_page.get_text.return_value = ""  # No text - scanned page
            mock_page.get_pixmap.return_value = mock_pix

            mock_doc = MagicMock()
            mock_doc.__len__ = MagicMock(return_value=1)
            mock_doc.__getitem__ = MagicMock(return_value=mock_page)
            mock_fitz_open.return_value = mock_doc

            from app.services.pdf import extract_from_pdf
            result = await extract_from_pdf(b"scanned-pdf")

            assert "OCR extracted text" in result
