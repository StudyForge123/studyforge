from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.storage import get_class
from app.storage.vector_store import VectorStore
from app.storage.embeddings import generate_embedding
from app.agents.study_agent import generate_study_session

router = APIRouter(prefix="/api", tags=["study"])


class StudySessionRequest(BaseModel):
    class_id: str
    topic: str
    instructions: Optional[str] = None
    top_k: int = 10  # Number of chunks to retrieve


@router.post("/study/session")
async def api_generate_study_session(body: StudySessionRequest):
    """
    Generate a study session with slides and knowledge checks using RAG.
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
    
    # Generate query embedding from topic
    query_embedding = generate_embedding(body.topic)
    
    # Retrieve relevant chunks
    retrieved = vector_store.search(
        query_embedding=query_embedding,
        top_k=body.top_k
    )
    
    if not retrieved:
        raise HTTPException(
            status_code=400,
            detail="No relevant content found for the requested topic"
        )
    
    # Extract chunk metadata
    chunks = [meta for meta, _ in retrieved]
    
    # Generate study session using agent
    session = generate_study_session(
        retrieved_chunks=chunks,
        topic=body.topic,
        instructions=body.instructions
    )
    
    return session.model_dump()
