from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app import config
from app.storage.mongo import (
    init_mongo,
    create_class,
    list_classes,
    get_class,
    insert_file,
    list_files,
    save_calendar_events,
    get_calendar_events,
)
from app.ingest.pdf_text import extract_pdf_text_with_markers
from app.ingest.reindex import reindex_class
from app.agents.calendar_agent import generate_calendar

router = APIRouter(prefix="/api", tags=["calendar", "classes"])

UPLOAD_DIR = config.DATA_DIR / "uploads"
TEXT_DIR = config.DATA_DIR / "uploads" / "_extracted"

class CreateClassRequest(BaseModel):
    name: str

class CalendarGenerateRequest(BaseModel):
    class_ids: List[str]
    default_year: int = datetime.now().year

@router.on_event("startup")
async def _startup():
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    await init_mongo()

@router.post("/classes")
async def api_create_class(body: CreateClassRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Class name required")
    class_id = await create_class(name)
    return {"class_id": class_id}

@router.get("/classes")
async def api_list_classes():
    return {"classes": await list_classes()}


@router.get("/classes/{class_id}")
async def api_get_class(class_id: str):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls

@router.post("/classes/{class_id}/upload/syllabus")
async def api_upload_syllabus(class_id: str, file: UploadFile = File(...)):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = (UPLOAD_DIR / f"class_{class_id}__{safe_name}").resolve()
    content = await file.read()
    pdf_path.write_bytes(content)

    marked_text = extract_pdf_text_with_markers(pdf_path)

    text_path = (TEXT_DIR / f"class_{class_id}__{safe_name}.txt").resolve()
    text_path.write_text(marked_text, encoding="utf-8")

    file_id = await insert_file(
        class_id=class_id,
        file_type="syllabus",
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )
    await reindex_class(class_id)
    return {"file_id": file_id, "pdf_path": str(pdf_path), "text_path": str(text_path)}


@router.post("/classes/{class_id}/upload/material")
async def api_upload_material(class_id: str, file: UploadFile = File(...)):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = (UPLOAD_DIR / f"class_{class_id}__material_{safe_name}").resolve()
    content = await file.read()
    pdf_path.write_bytes(content)
    marked_text = extract_pdf_text_with_markers(pdf_path)
    text_path = (TEXT_DIR / f"class_{class_id}__material_{safe_name}.txt").resolve()
    text_path.write_text(marked_text, encoding="utf-8")
    file_id = await insert_file(
        class_id=class_id,
        file_type="material",
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )
    await reindex_class(class_id)
    return {"file_id": file_id, "pdf_path": str(pdf_path), "text_path": str(text_path)}


@router.post("/classes/{class_id}/upload/assessment")
async def api_upload_assessment(class_id: str, file: UploadFile = File(...)):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = (UPLOAD_DIR / f"class_{class_id}__assessment_{safe_name}").resolve()
    content = await file.read()
    pdf_path.write_bytes(content)
    marked_text = extract_pdf_text_with_markers(pdf_path)
    text_path = (TEXT_DIR / f"class_{class_id}__assessment_{safe_name}.txt").resolve()
    text_path.write_text(marked_text, encoding="utf-8")
    file_id = await insert_file(
        class_id=class_id,
        file_type="assessment",
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )
    await reindex_class(class_id)
    return {"file_id": file_id, "pdf_path": str(pdf_path), "text_path": str(text_path)}


@router.get("/classes/{class_id}/files")
async def api_list_class_files(class_id: str, file_type: str = None):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    files = await list_files(class_id, file_type=file_type)
    return {"files": files}

@router.post("/calendar/generate")
async def api_generate_calendar(body: CalendarGenerateRequest):
    items = []
    for cid in body.class_ids:
        cls = await get_class(cid)
        if not cls:
            raise HTTPException(status_code=404, detail=f"Class not found: {cid}")

        syllabi = await list_files(cid, file_type="syllabus")
        if not syllabi:
            continue

        s = syllabi[0]  # most recent
        text_path = Path(s["extracted_text_path"])
        if not text_path.exists():
            raise HTTPException(
                status_code=400,
                detail=f"Syllabus text file not found for class {cid}. Re-upload the syllabus.",
            )
        text = text_path.read_text(encoding="utf-8", errors="ignore")

        items.append({
            "course": cls["name"],
            "filename": s["filename"],
            "text": text,
        })

    if not items:
        raise HTTPException(status_code=400, detail="No syllabi found for provided classes")

    out = generate_calendar(items, default_year=body.default_year)
    events_dict = [e.model_dump() for e in out.events]
    await save_calendar_events(body.class_ids, body.default_year, events_dict)
    return out.model_dump()


@router.get("/calendar")
async def api_get_calendar(class_ids: str = "", default_year: int = None):
    """Return cached calendar events for given class_ids (comma-separated) and year."""
    if default_year is None:
        default_year = datetime.now().year
    ids = [x.strip() for x in class_ids.split(",") if x.strip()]
    if not ids:
        return {"events": []}
    events = await get_calendar_events(ids, default_year)
    return {"events": events}
