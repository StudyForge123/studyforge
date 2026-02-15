from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.storage import get_class
from app.storage.vector_store import VectorStore
from app.storage.embeddings import generate_embedding
from app.agents.quiz_agent import generate_quiz
from app.schemas.quiz import DifficultyLevel

router = APIRouter(prefix="/api", tags=["quiz"])


class QuizGenerateRequest(BaseModel):
    class_id: str
    num_questions: int = 5
    difficulty: DifficultyLevel = "medium"
    topic: Optional[str] = None
    instructions: Optional[str] = None
    top_k: int = 10  # Number of chunks to retrieve


@router.post("/quiz/generate")
async def api_generate_quiz(body: QuizGenerateRequest):
    """
    Generate a quiz using RAG retrieval from class materials.
    """
    # Validate class exists
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Load vector store
    vector_store = VectorStore(body.class_id)
    loaded = vector_store.load()
    
    if not loaded or vector_store.index is None or vector_store.index.ntotal == 0:
        raise HTTPException(
            status_code=400,
            detail="No indexed content found for this class. Please upload material PDFs first."
        )
    
    # Build query from topic or use generic query
    query_text = body.topic if body.topic else f"Generate quiz questions for {cls['name']}"
    
    # Generate query embedding
    query_embedding = generate_embedding(query_text)
    
    # Retrieve relevant chunks (prefer material and assessment PDFs)
    retrieved = vector_store.search(
        query_embedding=query_embedding,
        top_k=body.top_k
    )
    
    if not retrieved:
        raise HTTPException(
            status_code=400,
            detail="No relevant content found for quiz generation"
        )
    
    # Extract chunk metadata (drop distances)
    chunks = [meta for meta, _ in retrieved]
    
    # Generate quiz using agent
    quiz = generate_quiz(
        retrieved_chunks=chunks,
        num_questions=body.num_questions,
        difficulty=body.difficulty,
        topic=body.topic,
        instructions=body.instructions
    )
    
    return quiz.model_dump()
