from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.storage.mongo import (
    get_class,
    insert_chat_message,
    get_chat_history,
    clear_chat_history
)
from app.storage.vector_store import VectorStore
from app.storage.embeddings import generate_embedding
from app.agents.quiz_agent import generate_quiz
from app.agents.study_agent import generate_study_session

router = APIRouter(prefix="/api", tags=["chat"])


class ChatSendRequest(BaseModel):
    class_id: str
    message: str
    mode: str = "Study Session"  # "Study Session" | "Practice Quiz" | "Practice Exam"


class ChatHistoryResponse(BaseModel):
    messages: List[dict]


@router.post("/chat/send")
async def api_chat_send(body: ChatSendRequest):
    """
    Send a chat message and get AI response based on mode.
    Stores chat history per class.
    """
    # Validate class exists
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Store user message
    await insert_chat_message(
        class_id=body.class_id,
        role="user",
        content=body.message,
        mode=body.mode
    )
    
    # Load vector store
    vector_store = VectorStore(body.class_id)
    loaded = vector_store.load()
    
    if not loaded or vector_store.index is None or vector_store.index.ntotal == 0:
        error_msg = "No indexed content found for this class. Please upload material PDFs first."
        await insert_chat_message(
            class_id=body.class_id,
            role="assistant",
            content=error_msg,
            mode=body.mode
        )
        return {"response": error_msg, "error": True}
    
    # Generate response based on mode
    try:
        if body.mode == "Practice Quiz":
            # Generate quiz
            query_embedding = generate_embedding(body.message)
            retrieved = vector_store.search(query_embedding=query_embedding, top_k=8)
            chunks = [meta for meta, _ in retrieved]
            
            quiz = generate_quiz(
                retrieved_chunks=chunks,
                num_questions=3,
                difficulty="medium",
                topic=body.message
            )
            
            # Format response
            response = f"Generated quiz on: {body.message}\n\n"
            for i, q in enumerate(quiz.questions, 1):
                response += f"**Question {i}:** {q.question}\n"
                if q.options:
                    for j, opt in enumerate(q.options, 1):
                        response += f"{j}. {opt}\n"
                response += f"\n**Answer:** {q.answer}\n"
                response += f"**Explanation:** {q.explanation}\n\n"
            
            await insert_chat_message(
                class_id=body.class_id,
                role="assistant",
                content=response,
                mode=body.mode,
                metadata={"quiz": quiz.model_dump()}
            )
            
            return {"response": response, "quiz": quiz.model_dump()}
            
        elif body.mode == "Practice Exam":
            # Generate harder quiz with more questions
            query_embedding = generate_embedding(body.message)
            retrieved = vector_store.search(query_embedding=query_embedding, top_k=15)
            chunks = [meta for meta, _ in retrieved]
            
            quiz = generate_quiz(
                retrieved_chunks=chunks,
                num_questions=5,
                difficulty="hard",
                topic=body.message
            )
            
            response = f"Generated exam on: {body.message}\n\n"
            for i, q in enumerate(quiz.questions, 1):
                response += f"**Question {i}:** {q.question}\n"
                if q.options:
                    for j, opt in enumerate(q.options, 1):
                        response += f"{j}. {opt}\n"
                response += f"\n**Answer:** {q.answer}\n"
                response += f"**Explanation:** {q.explanation}\n\n"
            
            await insert_chat_message(
                class_id=body.class_id,
                role="assistant",
                content=response,
                mode=body.mode,
                metadata={"quiz": quiz.model_dump()}
            )
            
            return {"response": response, "quiz": quiz.model_dump()}
            
        else:  # Study Session
            # Generate study session
            query_embedding = generate_embedding(body.message)
            retrieved = vector_store.search(query_embedding=query_embedding, top_k=10)
            chunks = [meta for meta, _ in retrieved]
            
            session = generate_study_session(
                retrieved_chunks=chunks,
                topic=body.message
            )
            
            # Format response
            response = f"Study Session: {session.topic}\n\n"
            for i, slide in enumerate(session.slides, 1):
                response += f"**Slide {i}: {slide.title}**\n"
                for bullet in slide.bullets:
                    response += f"• {bullet}\n"
                if slide.speaker_notes:
                    response += f"\n_Notes: {slide.speaker_notes}_\n"
                response += "\n"
            
            if session.knowledge_checks:
                response += "\n**Knowledge Checks:**\n\n"
                for i, kc in enumerate(session.knowledge_checks, 1):
                    response += f"{i}. {kc.question}\n"
                    response += f"   Answer: {kc.answer}\n"
                    response += f"   Explanation: {kc.explanation}\n\n"
            
            await insert_chat_message(
                class_id=body.class_id,
                role="assistant",
                content=response,
                mode=body.mode,
                metadata={"session": session.model_dump()}
            )
            
            return {"response": response, "session": session.model_dump()}
            
    except Exception as e:
        error_msg = f"Error generating response: {str(e)}"
        await insert_chat_message(
            class_id=body.class_id,
            role="assistant",
            content=error_msg,
            mode=body.mode
        )
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/chat/history")
async def api_chat_history(class_id: str, limit: int = 50):
    """Get chat history for a class."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    messages = await get_chat_history(class_id, limit)
    return ChatHistoryResponse(messages=messages)


@router.delete("/chat/history/{class_id}")
async def api_clear_chat_history(class_id: str):
    """Clear chat history for a class."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    count = await clear_chat_history(class_id)
    return {"deleted": count}
