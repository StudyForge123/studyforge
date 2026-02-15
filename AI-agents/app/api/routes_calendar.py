from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.storage import (
    init_mongo,
    create_class,
    list_classes,
    get_class,
    insert_file,
    list_files,
)
from app.ingest.pdf_text import extract_pdf_text_with_markers
from app.ingest.chunking import chunk_text
from app.agents.calendar_agent import generate_calendar
from app.storage.vector_store import VectorStore
from app.storage.embeddings import generate_embeddings

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

    # Chunk text for indexing
    chunks = chunk_text(marked_text, chunk_prefix=f"syllabus_{class_id}")

    file_id = await insert_file(
        class_id=class_id,
        file_type="syllabus",
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )

    # Generate embeddings and index
    if chunks:
        chunk_texts = [c.text for c in chunks]
        embeddings = generate_embeddings(chunk_texts)
        
        # Load or create vector store
        vector_store = VectorStore(class_id)
        vector_store.load()
        
        # Add chunks
        vector_store.add_chunks(
            chunks=chunks,
            embeddings=embeddings,
            file_id=file_id,
            file_type="syllabus",
            filename=safe_name
        )

    return {
        "file_id": file_id,
        "pdf_path": str(pdf_path),
        "text_path": str(text_path),
        "chunks_indexed": len(chunks)
    }

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
        text = Path(s["extracted_text_path"]).read_text(encoding="utf-8", errors="ignore")

        items.append({
            "course": cls["name"],
            "filename": s["filename"],
            "text": text,
        })

    if not items:
        raise HTTPException(status_code=400, detail="No syllabi found for provided classes")

    out = generate_calendar(items, default_year=body.default_year)
    return out.model_dump()
