import io

import pytest


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
        data = response.json()
        assert data["record_type"] == "report"
        assert data["patient_note"] == "Blood test results"
        assert len(data["files"]) == 1

        file_data = data["files"][0]
        assert file_data["original_filename"] == "report.png"
        assert "translation" in file_data
        assert file_data["translation"]["original_text"] == "Extracted text from image"
        assert file_data["translation"]["translated_text"] == "Translated text content"

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
        data = response.json()
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
        data = response.json()
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
        record_id = upload_response.json()["id"]

        response = client.get(f"/api/reports/records/{record_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == record_id
        assert len(data["files"]) == 1
        assert "translations" in data["files"][0]
        assert len(data["files"][0]["translations"]) == 1

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
        file_id = upload_response.json()["files"][0]["id"]

        response = client.get(f"/api/reports/files/{file_id}")
        assert response.status_code == 200

    def test_download_file_not_found(self, client):
        """Test downloading a non-existent file returns 404."""
        response = client.get("/api/reports/files/999")
        assert response.status_code == 404
