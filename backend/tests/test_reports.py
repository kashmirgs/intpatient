import asyncio
import io
import json

import pytest


def parse_sse_events(text: str) -> list:
    """Parse SSE events from response text."""
    events = []
    for part in text.strip().split('\n\n'):
        line = part.strip()
        if line.startswith('data: '):
            events.append(json.loads(line[6:]))
    return events


def get_sse_result(text: str) -> dict:
    """Extract the 'complete' event result from SSE response text."""
    for event in parse_sse_events(text):
        if event.get("phase") == "complete":
            return event["result"]
    raise ValueError("No complete event in SSE stream")


class TestReportUpload:
    def test_upload_image_with_ocr_and_translation(self, client, mock_ocr, mock_uppermind_translate):
        """Test uploading an image triggers OCR and translation."""
        fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)

        response = client.post(
            "/api/reports/upload",
            files=[("files", ("report.png", fake_image, "image/png"))],
            data={"patient_note": "Blood test results"},
        )

        assert response.status_code == 200
        data = get_sse_result(response.text)
        assert data["record_type"] == "report"
        assert data["patient_note"] == "Blood test results"
        assert len(data["files"]) == 1

        file_data = data["files"][0]
        assert file_data["original_filename"] == "report.png"
        assert "translation" in file_data
        assert file_data["translation"]["original_text"] == "Extracted text from image"
        assert file_data["translation"]["translated_text"] == "Translated text content"
        assert file_data["translation"]["ocr_duration_ms"] >= 0
        assert file_data["translation"]["translation_duration_ms"] >= 0

        mock_ocr.assert_called_once()
        mock_uppermind_translate.assert_called_once()

    def test_upload_pdf_with_extraction_and_translation(self, client, mock_pdf_extract, mock_uppermind_translate):
        """Test uploading a PDF triggers text extraction and translation."""
        fake_pdf = io.BytesIO(b"%PDF-1.4" + b"\x00" * 100)

        response = client.post(
            "/api/reports/upload",
            files=[("files", ("report.pdf", fake_pdf, "application/pdf"))],
        )

        assert response.status_code == 200
        data = get_sse_result(response.text)
        assert len(data["files"]) == 1
        file_data = data["files"][0]
        assert file_data["file_type"] == "pdf"
        assert file_data["translation"]["original_text"] == "Extracted text from PDF"
        assert file_data["translation"]["translated_text"] == "Translated text content"

        mock_pdf_extract.assert_called_once()
        mock_uppermind_translate.assert_called_once()

    def test_upload_invalid_extension(self, client):
        """Test that invalid file extensions are rejected."""
        response = client.post(
            "/api/reports/upload",
            files=[("files", ("file.dcm", io.BytesIO(b"\x00" * 100), "application/dicom"))],
        )

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_upload_multiple_files(self, client, mock_ocr, mock_uppermind_translate):
        """Test uploading multiple report files."""
        files = [
            ("files", ("report1.jpg", io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 100), "image/jpeg")),
            ("files", ("report2.png", io.BytesIO(b"\x89PNG" + b"\x00" * 100), "image/png")),
        ]

        response = client.post("/api/reports/upload", files=files)

        assert response.status_code == 200
        data = get_sse_result(response.text)
        assert len(data["files"]) == 2


class TestReportRecords:
    def test_list_records_empty(self, client):
        """Test listing records when none exist."""
        response = client.get("/api/reports/records")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_records_with_preview(self, client, mock_ocr, mock_uppermind_translate):
        """Test listing records includes translation preview."""
        # Upload a file first
        client.post(
            "/api/reports/upload",
            files=[("files", ("report.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))],
            data={"patient_note": "Test report"},
        )

        response = client.get("/api/reports/records")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["patient_note"] == "Test report"
        assert "translation_preview" in data[0]
        assert data[0]["file_count"] == 1

    def test_get_record_detail(self, client, mock_ocr, mock_uppermind_translate):
        """Test getting a specific report record with full translations."""
        upload_response = client.post(
            "/api/reports/upload",
            files=[("files", ("report.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))],
        )
        record_id = get_sse_result(upload_response.text)["id"]

        response = client.get(f"/api/reports/records/{record_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == record_id
        assert len(data["files"]) == 1
        assert "translations" in data["files"][0]
        assert len(data["files"][0]["translations"]) == 1
        t = data["files"][0]["translations"][0]
        assert t["ocr_duration_ms"] >= 0
        assert t["translation_duration_ms"] >= 0

    def test_get_record_not_found(self, client):
        """Test getting a non-existent record returns 404."""
        response = client.get("/api/reports/records/999")
        assert response.status_code == 404


class TestReportFileDownload:
    def test_download_file(self, client, mock_ocr, mock_uppermind_translate):
        """Test downloading an uploaded report file."""
        file_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        upload_response = client.post(
            "/api/reports/upload",
            files=[("files", ("report.png", io.BytesIO(file_content), "image/png"))],
        )
        file_id = get_sse_result(upload_response.text)["files"][0]["id"]

        response = client.get(f"/api/reports/files/{file_id}")
        assert response.status_code == 200

    def test_download_file_not_found(self, client):
        """Test downloading a non-existent file returns 404."""
        response = client.get("/api/reports/files/999")
        assert response.status_code == 404


class TestSSEEvents:
    def test_sse_event_structure(self, client, mock_ocr, mock_uppermind_translate):
        """Test SSE events have correct structure and ordering."""
        files = [
            ("files", ("report1.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png")),
            ("files", ("report2.jpg", io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 50), "image/jpeg")),
        ]

        response = client.post("/api/reports/upload", files=files)
        assert response.status_code == 200

        events = parse_sse_events(response.text)
        # Should have: 2 OCR events + 2 translation events + 1 complete = 5
        assert len(events) == 5

        ocr_events = [e for e in events if e["phase"] == "ocr"]
        translation_events = [e for e in events if e["phase"] == "translation"]
        complete_events = [e for e in events if e["phase"] == "complete"]

        assert len(ocr_events) == 2
        assert len(translation_events) == 2
        assert len(complete_events) == 1

        # OCR events come first
        ocr_indices = [events.index(e) for e in ocr_events]
        translation_indices = [events.index(e) for e in translation_events]
        assert max(ocr_indices) < min(translation_indices)

        # done values should be {1, 2}
        assert {e["done"] for e in ocr_events} == {1, 2}
        assert all(e["total"] == 2 for e in ocr_events)
        assert {e["done"] for e in translation_events} == {1, 2}
        assert all(e["total"] == 2 for e in translation_events)

    def test_ocr_runs_sequentially(self, client, mock_uppermind_translate):
        """Test OCR tasks run sequentially (one at a time)."""
        from unittest.mock import AsyncMock, patch

        max_concurrent = 0
        current_concurrent = 0
        lock = asyncio.Lock()

        original_mock = AsyncMock(return_value="Extracted text")

        async def tracked_ocr(content):
            nonlocal max_concurrent, current_concurrent
            async with lock:
                current_concurrent += 1
                if current_concurrent > max_concurrent:
                    max_concurrent = current_concurrent
            await asyncio.sleep(0.05)
            async with lock:
                current_concurrent -= 1
            return original_mock.return_value

        with patch("app.routers.reports.extract_text_from_image", side_effect=tracked_ocr):
            files = [
                ("files", (f"report{i}.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))
                for i in range(8)
            ]
            response = client.post("/api/reports/upload", files=files)

        assert response.status_code == 200
        assert max_concurrent == 1

    def test_ocr_error_isolation(self, client, mock_uppermind_translate):
        """Test that OCR error in one file doesn't block others."""
        from unittest.mock import AsyncMock, patch

        call_count = 0

        async def selective_ocr(content):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise RuntimeError("OCR service down")
            return "Extracted text"

        with patch("app.routers.reports.extract_text_from_image", side_effect=selective_ocr):
            files = [
                ("files", (f"report{i}.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))
                for i in range(3)
            ]
            response = client.post("/api/reports/upload", files=files)

        assert response.status_code == 200
        data = get_sse_result(response.text)
        assert len(data["files"]) == 3

        # One file should have OCR error
        ocr_errors = [f for f in data["files"] if f["translation"]["original_text"].startswith("[OCR error:")]
        successful = [f for f in data["files"] if not f["translation"]["original_text"].startswith("[OCR error:")]
        assert len(ocr_errors) == 1
        assert len(successful) == 2

        # Successful files should have translation
        for f in successful:
            assert f["translation"]["translated_text"] == "Translated text content"

        # OCR error file should have no translation
        assert ocr_errors[0]["translation"]["translated_text"] == ""

    def test_translation_error_isolation(self, client, mock_ocr):
        """Test that translation error in one file doesn't block others."""
        from unittest.mock import AsyncMock, patch

        call_count = 0

        async def selective_translate(text, token):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("Translation service down")
            return "Translated text"

        with patch("app.routers.reports.translate", side_effect=selective_translate):
            files = [
                ("files", (f"report{i}.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))
                for i in range(3)
            ]
            response = client.post("/api/reports/upload", files=files)

        assert response.status_code == 200
        data = get_sse_result(response.text)

        translation_errors = [
            f for f in data["files"]
            if f["translation"]["translated_text"].startswith("[Translation error:")
        ]
        successful = [
            f for f in data["files"]
            if not f["translation"]["translated_text"].startswith("[Translation error:")
        ]
        assert len(translation_errors) == 1
        assert len(successful) == 2
        for f in successful:
            assert f["translation"]["translated_text"] == "Translated text"

    def test_empty_ocr_skips_translation(self, client, mock_uppermind_translate):
        """Test that files with empty OCR results skip translation."""
        from unittest.mock import AsyncMock, patch

        with patch("app.routers.reports.extract_text_from_image", new_callable=AsyncMock) as mock_ocr_empty:
            mock_ocr_empty.return_value = ""

            response = client.post(
                "/api/reports/upload",
                files=[("files", ("report.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))],
            )

        assert response.status_code == 200
        events = parse_sse_events(response.text)

        # Should have OCR events but NO translation events
        translation_events = [e for e in events if e["phase"] == "translation"]
        assert len(translation_events) == 0

        mock_uppermind_translate.assert_not_called()

        data = get_sse_result(response.text)
        assert data["files"][0]["translation"]["translated_text"] == ""
