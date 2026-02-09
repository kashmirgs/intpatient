import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Record, UploadedFile
from app.routers.auth import get_current_user

router = APIRouter(prefix="/radiology", tags=["radiology"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "dcm"}


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload")
async def upload_radiology(
    files: List[UploadFile] = File(...),
    patient_note: str = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload radiology images (jpg, jpeg, png, bmp, dcm)."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Validate extensions
    for f in files:
        ext = _get_extension(f.filename)
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {f.filename}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )

    # Create record
    username = current_user.get("username", current_user.get("email", "unknown"))
    record = Record(
        record_type="radiology",
        patient_note=patient_note,
        created_by=username,
    )
    db.add(record)
    db.flush()  # get record.id

    # Save files
    record_dir = os.path.join(settings.UPLOAD_DIR, "radiology", str(record.id))
    os.makedirs(record_dir, exist_ok=True)

    saved_files = []
    for f in files:
        ext = _get_extension(f.filename)
        stored_name = f"{uuid.uuid4().hex}.{ext}"
        stored_path = os.path.join(record_dir, stored_name)

        content = await f.read()
        with open(stored_path, "wb") as out:
            out.write(content)

        uploaded = UploadedFile(
            record_id=record.id,
            original_filename=f.filename,
            stored_path=stored_path,
            file_type=ext,
        )
        db.add(uploaded)
        saved_files.append(uploaded)

    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "record_type": record.record_type,
        "patient_note": record.patient_note,
        "created_at": record.created_at.isoformat(),
        "created_by": record.created_by,
        "files": [
            {
                "id": f.id,
                "original_filename": f.original_filename,
                "file_type": f.file_type,
                "download_url": f"/api/radiology/files/{f.id}",
            }
            for f in record.files
        ],
    }


@router.get("/records")
def list_radiology_records(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all radiology records."""
    records = db.query(Record).filter(Record.record_type == "radiology").order_by(Record.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "patient_note": r.patient_note,
            "created_at": r.created_at.isoformat(),
            "created_by": r.created_by,
            "file_count": len(r.files),
        }
        for r in records
    ]


@router.get("/records/{record_id}")
def get_radiology_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single radiology record with its files."""
    record = db.query(Record).filter(Record.id == record_id, Record.record_type == "radiology").first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    return {
        "id": record.id,
        "record_type": record.record_type,
        "patient_note": record.patient_note,
        "created_at": record.created_at.isoformat(),
        "created_by": record.created_by,
        "files": [
            {
                "id": f.id,
                "original_filename": f.original_filename,
                "file_type": f.file_type,
                "download_url": f"/api/radiology/files/{f.id}",
            }
            for f in record.files
        ],
    }


@router.get("/files/{file_id}")
def download_radiology_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Download a radiology file."""
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not uploaded_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Verify the file belongs to a radiology record
    record = db.query(Record).filter(Record.id == uploaded_file.record_id, Record.record_type == "radiology").first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(uploaded_file.stored_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=uploaded_file.stored_path,
        filename=uploaded_file.original_filename,
    )
