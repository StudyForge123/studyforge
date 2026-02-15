from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

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
from app.agents.calendar_agent import generate_calendar

router = APIRouter(prefix="/api", tags=["calendar"])

UPLOAD_DIR = Path("data/uploads")
TEXT_DIR = Path("data/uploads/_extracted")

class CreateClassRequest(BaseModel):
    name: str

class CalendarGenerateRequest(BaseModel):
    class_ids: List[str]
    default_year: int = datetime.now().year

@router.on_event("startup")
async def _startup():
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

@router.post("/classes/{class_id}/upload/syllabus")
async def api_upload_syllabus(class_id: str, file: UploadFile = File(...)):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = UPLOAD_DIR / f"class_{class_id}__{safe_name}"
    content = await file.read()
    pdf_path.write_bytes(content)

    marked_text = extract_pdf_text_with_markers(pdf_path)

    text_path = TEXT_DIR / f"class_{class_id}__{safe_name}.txt"
    text_path.write_text(marked_text, encoding="utf-8")

    file_id = await insert_file(
        class_id=class_id,
        file_type="syllabus",
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )

    return {"file_id": file_id, "pdf_path": str(pdf_path), "text_path": str(text_path)}

@router.post("/calendar/generate")
async def api_generate_calendar(body: CalendarGenerateRequest):
    items = []
    # Sort IDs to ensure consistent key for the same set of classes
    sorted_ids = sorted(body.class_ids)
    class_ids_key = ",".join(sorted_ids)

    for cid in body.class_ids:
        cls = await get_class(cid)
        if not cls:
            raise HTTPException(status_code=404, detail=f"Class not found: {cid}")

        syllabi = await list_files(cid, file_type="syllabus")
        if not syllabi:
            continue

        s = syllabi[0]  # most recent
        text = Path(s["extracted_text_path"]).read_text(encoding="utf-8", errors="ignore")

        items.append({
            "course": cls["name"],
            "filename": s["filename"],
            "text": text,
        })

    if not items:
        raise HTTPException(status_code=400, detail="No syllabi found for provided classes")

    out = generate_calendar(items, default_year=body.default_year)
    events = out.model_dump()["events"]
    
    # Cache the result
    await save_calendar_events(class_ids_key, events)
    
    return {"events": events}

@router.get("/calendar/events")
async def api_get_calendar_events(class_ids: str):
    print(f"DEBUG: api_get_calendar_events called with ids: {class_ids}")
    # expect class_ids as comma-separated string
    sorted_ids = sorted(class_ids.split(","))
    class_ids_key = ",".join(sorted_ids)
    
    print(f"DEBUG: Querying cache with key: {class_ids_key}")
    cached = await get_calendar_events(class_ids_key)
    print(f"DEBUG: Cache result: {'Found' if cached else 'Not Found'}")
    
    if cached is None:
        return {"events": []}
    return {"events": cached}
