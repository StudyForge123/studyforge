from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.storage.mongo import get_class, get_all_chunks_map
from app.retrieval.vector_store import search_chunks
from app.agents.study_agent import generate_study_session

router = APIRouter(prefix="/api", tags=["study"])


class StudySessionRequest(BaseModel):
    class_id: str
    topic: Optional[str] = None
    question: Optional[str] = None


@router.post("/study/session")
async def api_study_session(body: StudySessionRequest):
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    chunk_map = await get_all_chunks_map(body.class_id)
    if not chunk_map:
        raise HTTPException(status_code=400, detail="No PDFs indexed for this class. Upload syllabus or materials first.")

    query = body.topic or body.question or "main concepts"
    chunks = search_chunks(body.class_id, query, k=15, class_chunk_map=chunk_map)
    if not chunks:
        raise HTTPException(status_code=400, detail="No relevant chunks found. Try uploading more materials.")

    out = generate_study_session(
        class_name=cls["name"],
        topic=body.topic,
        question=body.question,
        retrieved_chunks=chunks,
    )
    return out.model_dump()
