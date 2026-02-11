import asyncio
import json
import logging
import os
import time
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Record, UploadedFile, Translation
from app.routers.auth import get_current_user
from app.services.ocr import extract_text_from_image
from app.services.pdf import extract_from_pdf
from app.services.uppermind import translate

logger = logging.getLogger(__name__)

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

    # Save files to disk and DB
    record_dir = os.path.join(settings.UPLOAD_DIR, "reports", str(record.id))
    os.makedirs(record_dir, exist_ok=True)

    file_items = []
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

        file_items.append({
            "uploaded_id": uploaded.id,
            "filename": f.filename,
            "ext": ext,
            "content": content,
        })

    db.commit()

    async def _process_stream():
        total = len(file_items)
        ocr_results = [None] * total

        # Phase 1 - OCR (sequential)
        for i, item in enumerate(file_items):
            start = time.monotonic()
            try:
                if item["ext"] in ("jpg", "jpeg", "png"):
                    text = await extract_text_from_image(item["content"])
                elif item["ext"] == "pdf":
                    text = await extract_from_pdf(item["content"])
                else:
                    text = ""
                ocr_results[i] = {"text": text, "failed": False, "duration_ms": int((time.monotonic() - start) * 1000)}
            except Exception as exc:
                logger.exception("OCR failed for file %s", item["filename"])
                ocr_results[i] = {"text": f"[OCR error: {repr(exc)}]", "failed": True, "duration_ms": int((time.monotonic() - start) * 1000)}
            yield f"data: {json.dumps({'phase': 'ocr', 'done': i + 1, 'total': total})}\n\n"

        # Phase 2 - Translation (parallel, max 4)
        semaphore = asyncio.Semaphore(4)
        progress_queue = asyncio.Queue()
        translatable = [i for i in range(total) if not ocr_results[i]["failed"] and ocr_results[i]["text"].strip()]
        translate_total = len(translatable)
        translate_results = [{"text": "", "duration_ms": 0} for _ in range(total)]

        if translate_total > 0:
            async def translate_task(idx):
                async with semaphore:
                    start = time.monotonic()
                    try:
                        text = await translate(ocr_results[idx]["text"], token)
                    except Exception as exc:
                        text = f"[Translation error: {repr(exc)}]"
                    translate_results[idx] = {"text": text, "duration_ms": int((time.monotonic() - start) * 1000)}
                await progress_queue.put(idx)

            tasks = [asyncio.create_task(translate_task(i)) for i in translatable]
            for done_count in range(1, translate_total + 1):
                await progress_queue.get()
                yield f"data: {json.dumps({'phase': 'translation', 'done': done_count, 'total': translate_total})}\n\n"
            await asyncio.gather(*tasks)

        # Phase 3 - DB save + final event
        result_files = []
        for i, item in enumerate(file_items):
            t = Translation(
                file_id=item["uploaded_id"],
                original_text=ocr_results[i]["text"],
                translated_text=translate_results[i]["text"],
                ocr_duration_ms=ocr_results[i]["duration_ms"],
                translation_duration_ms=translate_results[i]["duration_ms"],
            )
            db.add(t)
            result_files.append({
                "id": item["uploaded_id"],
                "original_filename": item["filename"],
                "file_type": item["ext"],
                "download_url": f"/api/reports/files/{item['uploaded_id']}",
                "translation": {
                    "original_text": ocr_results[i]["text"],
                    "translated_text": translate_results[i]["text"],
                    "ocr_duration_ms": ocr_results[i]["duration_ms"],
                    "translation_duration_ms": translate_results[i]["duration_ms"],
                },
            })
        db.commit()

        yield f"data: {json.dumps({'phase': 'complete', 'result': {'id': record.id, 'record_type': record.record_type, 'patient_note': record.patient_note, 'created_at': record.created_at.isoformat(), 'created_by': record.created_by, 'files': result_files}})}\n\n"

    return StreamingResponse(_process_stream(), media_type="text/event-stream")


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
                        "ocr_duration_ms": t.ocr_duration_ms,
                        "translation_duration_ms": t.translation_duration_ms,
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
