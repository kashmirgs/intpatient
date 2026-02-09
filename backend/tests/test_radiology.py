import io

import pytest


class TestRadiologyUpload:
    def test_upload_valid_files(self, client):
        """Test uploading valid radiology images."""
        # Create a fake image file
        fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        fake_image.name = "test_xray.png"

        response = client.post(
            "/api/radiology/upload",
            files=[("files", ("test_xray.png", fake_image, "image/png"))],
            data={"patient_note": "Chest X-ray for patient"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["record_type"] == "radiology"
        assert data["patient_note"] == "Chest X-ray for patient"
        assert data["created_by"] == "testuser"
        assert len(data["files"]) == 1
        assert data["files"][0]["original_filename"] == "test_xray.png"
        assert data["files"][0]["file_type"] == "png"

    def test_upload_multiple_files(self, client):
        """Test uploading multiple radiology images."""
        files = [
            ("files", ("xray1.jpg", io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 100), "image/jpeg")),
            ("files", ("xray2.png", io.BytesIO(b"\x89PNG" + b"\x00" * 100), "image/png")),
        ]

        response = client.post("/api/radiology/upload", files=files)

        assert response.status_code == 200
        data = response.json()
        assert len(data["files"]) == 2

    def test_upload_without_patient_note(self, client):
        """Test uploading without a patient note (optional field)."""
        response = client.post(
            "/api/radiology/upload",
            files=[("files", ("scan.jpg", io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 50), "image/jpeg"))],
        )

        assert response.status_code == 200
        data = response.json()
        assert data["patient_note"] is None

    def test_upload_invalid_extension(self, client):
        """Test that invalid file extensions are rejected."""
        response = client.post(
            "/api/radiology/upload",
            files=[("files", ("document.pdf", io.BytesIO(b"fake pdf"), "application/pdf"))],
        )

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_upload_dcm_file(self, client):
        """Test uploading a DICOM file (valid extension)."""
        response = client.post(
            "/api/radiology/upload",
            files=[("files", ("scan.dcm", io.BytesIO(b"\x00" * 200), "application/dicom"))],
        )

        assert response.status_code == 200
        data = response.json()
        assert data["files"][0]["file_type"] == "dcm"


class TestRadiologyRecords:
    def test_list_records_empty(self, client):
        """Test listing records when none exist."""
        response = client.get("/api/radiology/records")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_records(self, client):
        """Test listing records after upload."""
        # Upload a file first
        client.post(
            "/api/radiology/upload",
            files=[("files", ("xray.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))],
            data={"patient_note": "Test note"},
        )

        response = client.get("/api/radiology/records")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["patient_note"] == "Test note"
        assert data[0]["file_count"] == 1

    def test_get_record_detail(self, client):
        """Test getting a specific record with file details."""
        # Upload a file first
        upload_response = client.post(
            "/api/radiology/upload",
            files=[("files", ("xray.png", io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png"))],
        )
        record_id = upload_response.json()["id"]

        response = client.get(f"/api/radiology/records/{record_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == record_id
        assert len(data["files"]) == 1
        assert "download_url" in data["files"][0]

    def test_get_record_not_found(self, client):
        """Test getting a non-existent record returns 404."""
        response = client.get("/api/radiology/records/999")
        assert response.status_code == 404


class TestRadiologyFileDownload:
    def test_download_file(self, client):
        """Test downloading an uploaded file."""
        # Upload a file first
        file_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        upload_response = client.post(
            "/api/radiology/upload",
            files=[("files", ("xray.png", io.BytesIO(file_content), "image/png"))],
        )
        file_id = upload_response.json()["files"][0]["id"]

        response = client.get(f"/api/radiology/files/{file_id}")
        assert response.status_code == 200

    def test_download_file_not_found(self, client):
        """Test downloading a non-existent file returns 404."""
        response = client.get("/api/radiology/files/999")
        assert response.status_code == 404
