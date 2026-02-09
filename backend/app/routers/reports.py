import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Record, UploadedFile, Translation
from app.routers.auth import get_current_user
from app.services.ocr import extract_text_from_image
from app.services.pdf import extract_from_pdf
from app.services.uppermind import translate

router = APIRouter(prefix="/reports", tags=["reports"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload")
async def upload_report(
    files: List[UploadFile] = File(...),
    patient_note: str = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload report files (jpg, jpeg, png, pdf), extract text, and translate."""
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
    token = current_user.get("token", "")

    record = Record(
        record_type="report",
        patient_note=patient_note,
        created_by=username,
    )
    db.add(record)
    db.flush()

    # Save files, extract text, translate
    record_dir = os.path.join(settings.UPLOAD_DIR, "reports", str(record.id))
    os.makedirs(record_dir, exist_ok=True)

    result_files = []
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
        db.flush()

        # Extract text
        if ext in ("jpg", "jpeg", "png"):
            original_text = await extract_text_from_image(content)
        elif ext == "pdf":
            original_text = await extract_from_pdf(content)
        else:
            original_text = ""

        # Translate via UpperMind
        translated_text = ""
        if original_text.strip():
            try:
                translated_text = await translate(original_text, token)
            except Exception as exc:
                translated_text = f"[Translation error: {str(exc)}]"

        # Save translation
        translation = Translation(
            file_id=uploaded.id,
            original_text=original_text,
            translated_text=translated_text,
        )
        db.add(translation)

        result_files.append({
            "id": uploaded.id,
            "original_filename": uploaded.original_filename,
            "file_type": uploaded.file_type,
            "download_url": f"/api/reports/files/{uploaded.id}",
            "translation": {
                "original_text": original_text,
                "translated_text": translated_text,
            },
        })

    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "record_type": record.record_type,
        "patient_note": record.patient_note,
        "created_at": record.created_at.isoformat(),
        "created_by": record.created_by,
        "files": result_files,
    }


@router.get("/records")
def list_report_records(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all report records with translation preview."""
    records = db.query(Record).filter(Record.record_type == "report").order_by(Record.created_at.desc()).all()
    result = []
    for r in records:
        # Get a preview from the first file's translation
        translation_preview = ""
        if r.files and r.files[0].translations:
            preview_text = r.files[0].translations[0].translated_text
            translation_preview = preview_text[:200] if preview_text else ""

        result.append({
            "id": r.id,
            "patient_note": r.patient_note,
            "created_at": r.created_at.isoformat(),
            "created_by": r.created_by,
            "file_count": len(r.files),
            "translation_preview": translation_preview,
        })
    return result


@router.get("/records/{record_id}")
def get_report_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single report record with files and full translations."""
    record = db.query(Record).filter(Record.id == record_id, Record.record_type == "report").first()
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
                "download_url": f"/api/reports/files/{f.id}",
                "translations": [
                    {
                        "id": t.id,
                        "original_text": t.original_text,
                        "translated_text": t.translated_text,
                        "created_at": t.created_at.isoformat(),
                    }
                    for t in f.translations
                ],
            }
            for f in record.files
        ],
    }


@router.get("/files/{file_id}")
def download_report_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Download a report file."""
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not uploaded_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Verify the file belongs to a report record
    record = db.query(Record).filter(Record.id == uploaded_file.record_id, Record.record_type == "report").first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(uploaded_file.stored_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=uploaded_file.stored_path,
        filename=uploaded_file.original_filename,
    )
