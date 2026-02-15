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
    delete_file,
    delete_class_data,
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

from app.ingest.chunking import chunk_text
from app.ingest.retrieval import get_vector_store

# ...

@router.post("/classes/{class_id}/upload")
async def api_upload_file(
    class_id: str, 
    file_type: str = "material", # syllabus | material | assessment
    file: UploadFile = File(...)
):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    normalized_file_type = (file_type or "material").strip().lower()
    if normalized_file_type not in {"syllabus", "material", "assessment"}:
        raise HTTPException(status_code=400, detail="file_type must be syllabus, material, or assessment")

    if normalized_file_type == "syllabus":
        existing_syllabi = await list_files(class_id, file_type="syllabus")
        if existing_syllabi:
            raise HTTPException(status_code=400, detail="Only one syllabus is allowed per class. Delete the existing syllabus first.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = UPLOAD_DIR / f"class_{class_id}_{normalized_file_type}_{safe_name}"
    content = await file.read()
    pdf_path.write_bytes(content)

    marked_text = extract_pdf_text_with_markers(pdf_path)

    text_path = TEXT_DIR / f"class_{class_id}_{normalized_file_type}_{safe_name}.txt"
    text_path.write_text(marked_text, encoding="utf-8")

    # RAG: Chunk and Index
    chunks = chunk_text(marked_text, chunk_prefix=f"{normalized_file_type}_{safe_name}")
    chunk_dicts = [
        {
            "chunk_id": c.chunk_id,
            "text": c.text,
            "page_start": c.page_start,
            "page_end": c.page_end,
            "filename": safe_name,
            "file_type": normalized_file_type
        } for c in chunks
    ]
    
    vs = get_vector_store(class_id)
    vs.add_chunks(chunk_dicts)

    file_id = await insert_file(
        class_id=class_id,
        file_type=normalized_file_type,
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )

    return {
        "file_id": file_id, 
        "pdf_path": str(pdf_path), 
        "text_path": str(text_path),
        "chunks_indexed": len(chunk_dicts)
    }

# Keep the legacy syllabus upload for backward compatibility with frontend if needed, 
# or just update the frontend to use the new one.
@router.post("/classes/{class_id}/upload/syllabus")
async def api_upload_syllabus(class_id: str, file: UploadFile = File(...)):
    return await api_upload_file(class_id, "syllabus", file)

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

        # Prefer syllabus, but fall back to any uploaded file
        syllabi = await list_files(cid, file_type="syllabus")
        if not syllabi:
            syllabi = await list_files(cid)  # try any file type
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
        raise HTTPException(status_code=400, detail="No files found for the provided classes. Please upload a syllabus or material PDF first.")

    out = generate_calendar(items, default_year=body.default_year)
    events = out.model_dump()["events"]
    
    # Cache the result
    await save_calendar_events(class_ids_key, events)
    
    return {"events": events}

@router.get("/classes/{class_id}/files")
async def api_list_files(class_id: str, file_type: str = None):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    files = await list_files(class_id, file_type=file_type)
    return {"files": files}

def _safe_unlink(path_str: str) -> None:
    if not path_str:
        return
    try:
        Path(path_str).unlink(missing_ok=True)
    except Exception:
        pass

def _vector_index_paths(class_id: str):
    base = Path("data/vector_db")
    return base / f"{class_id}.index", base / f"{class_id}.json"

def _reset_vector_index_files(class_id: str) -> None:
    index_path, metadata_path = _vector_index_paths(class_id)
    index_path.unlink(missing_ok=True)
    metadata_path.unlink(missing_ok=True)

async def _rebuild_vector_store_for_class(class_id: str) -> int:
    _reset_vector_index_files(class_id)
    remaining_files = await list_files(class_id)
    if not remaining_files:
        return 0

    vs = get_vector_store(class_id)
    total_chunks = 0

    for f in remaining_files:
        extracted_path = f.get("extracted_text_path")
        if not extracted_path:
            continue
        p = Path(extracted_path)
        if not p.exists():
            continue

        marked_text = p.read_text(encoding="utf-8", errors="ignore")
        chunks = chunk_text(marked_text, chunk_prefix=f"{f['file_type']}_{f['filename']}")
        chunk_dicts = [
            {
                "chunk_id": c.chunk_id,
                "text": c.text,
                "page_start": c.page_start,
                "page_end": c.page_end,
                "filename": f["filename"],
                "file_type": f["file_type"],
            }
            for c in chunks
        ]
        if chunk_dicts:
            vs.add_chunks(chunk_dicts)
            total_chunks += len(chunk_dicts)

    return total_chunks

@router.delete("/classes/{class_id}/files/{file_id}")
async def api_delete_file(class_id: str, file_id: str):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    deleted = await delete_file(file_id, class_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")

    _safe_unlink(deleted.get("pdf_path"))
    _safe_unlink(deleted.get("extracted_text_path"))
    chunks_indexed = await _rebuild_vector_store_for_class(class_id)
    return {"ok": True, "deleted_file_id": file_id, "chunks_indexed": chunks_indexed}

@router.delete("/classes/{class_id}")
async def api_delete_class(class_id: str):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    files = await list_files(class_id)
    for f in files:
        _safe_unlink(f.get("pdf_path"))
        _safe_unlink(f.get("extracted_text_path"))

    _reset_vector_index_files(class_id)
    result = await delete_class_data(class_id)
    if not result["class_deleted"]:
        raise HTTPException(status_code=500, detail="Failed to delete class")
    return {"ok": True, **result}

@router.get("/calendar/events")
async def api_get_calendar_events(class_ids: str):
    # expect class_ids as comma-separated string
    sorted_ids = sorted(class_ids.split(","))
    class_ids_key = ",".join(sorted_ids)
    
    cached = await get_calendar_events(class_ids_key)
    
    if cached is None:
        return {"events": []}
    return {"events": cached}
