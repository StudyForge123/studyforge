from __future__ import annotations

from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.storage import get_class, insert_file, list_files
from app.storage.vector_store import VectorStore
from app.storage.embeddings import generate_embeddings
from app.ingest.pdf_text import extract_pdf_text_with_markers
from app.ingest.chunking import chunk_text

router = APIRouter(prefix="/api", tags=["files"])

UPLOAD_DIR = Path("data/uploads")
TEXT_DIR = Path("data/uploads/_extracted")


class FileListResponse(BaseModel):
    files: List[dict]


@router.post("/classes/{class_id}/upload/material")
async def upload_material(class_id: str, file: UploadFile = File(...)):
    """Upload a class material PDF and index it."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    # Save PDF
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = UPLOAD_DIR / f"class_{class_id}_material_{safe_name}"
    content = await file.read()
    pdf_path.write_bytes(content)

    # Extract text
    marked_text = extract_pdf_text_with_markers(pdf_path)
    text_path = TEXT_DIR / f"class_{class_id}_material_{safe_name}.txt"
    text_path.write_text(marked_text, encoding="utf-8")

    # Chunk text
    chunks = chunk_text(marked_text, chunk_prefix=f"material_{class_id}")

    # Insert file record
    file_id = await insert_file(
        class_id=class_id,
        file_type="material",
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
            file_type="material",
            filename=safe_name
        )

    return {
        "file_id": file_id,
        "pdf_path": str(pdf_path),
        "text_path": str(text_path),
        "chunks_indexed": len(chunks)
    }


@router.post("/classes/{class_id}/upload/assessment")
async def upload_assessment(class_id: str, file: UploadFile = File(...)):
    """Upload an assessment PDF (past quiz/test) and index it."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    # Save PDF
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = UPLOAD_DIR / f"class_{class_id}_assessment_{safe_name}"
    content = await file.read()
    pdf_path.write_bytes(content)

    # Extract text
    marked_text = extract_pdf_text_with_markers(pdf_path)
    text_path = TEXT_DIR / f"class_{class_id}_assessment_{safe_name}.txt"
    text_path.write_text(marked_text, encoding="utf-8")

    # Chunk text
    chunks = chunk_text(marked_text, chunk_prefix=f"assessment_{class_id}")

    # Insert file record
    file_id = await insert_file(
        class_id=class_id,
        file_type="assessment",
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
            file_type="assessment",
            filename=safe_name
        )

    return {
        "file_id": file_id,
        "pdf_path": str(pdf_path),
        "text_path": str(text_path),
        "chunks_indexed": len(chunks)
    }


@router.get("/classes/{class_id}/files")
async def get_class_files(class_id: str):
    """Get all files for a class."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    files = await list_files(class_id)
    return FileListResponse(files=files)


@router.get("/classes/{class_id}/vector-stats")
async def get_vector_stats(class_id: str):
    """Get vector store statistics for a class."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    vector_store = VectorStore(class_id)
    loaded = vector_store.load()
    
    if not loaded:
        return {"error": "No vector store found for this class", "stats": None}
    
    return {"stats": vector_store.get_stats()}
