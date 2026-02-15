from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.storage.mongo import get_class, get_all_chunks_map
from app.retrieval.vector_store import search_chunks
from app.agents.quiz_agent import generate_quiz

router = APIRouter(prefix="/api", tags=["quiz"])


class QuizGenerateRequest(BaseModel):
    class_id: str
    num_questions: int = 5
    difficulty: str = "medium"
    topic: Optional[str] = None
    instructions: Optional[str] = None


@router.post("/quiz/generate")
async def api_generate_quiz(body: QuizGenerateRequest):
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    chunk_map = await get_all_chunks_map(body.class_id)
    if not chunk_map:
        raise HTTPException(status_code=400, detail="No PDFs indexed for this class. Upload syllabus or materials first.")

    query = body.topic or "key concepts and facts"
    chunks = search_chunks(body.class_id, query, k=15, class_chunk_map=chunk_map)
    if not chunks:
        raise HTTPException(status_code=400, detail="No relevant chunks found. Try uploading more materials.")

    out = generate_quiz(
        class_name=cls["name"],
        num_questions=body.num_questions,
        difficulty=body.difficulty,
        topic=body.topic,
        instructions=body.instructions,
        retrieved_chunks=chunks,
    )
    return out.model_dump()
