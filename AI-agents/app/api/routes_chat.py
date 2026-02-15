from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI

from app import config
from app.storage.mongo import save_chat_message, list_chat_history, get_file
from app.ingest.retrieval import get_vector_store

router = APIRouter(prefix="/api/chat", tags=["chat"])
client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are StudyForge AI, a helpful academic assistant.
Answer questions using ONLY the provided context from the student's class materials.
If the context doesn't contain enough information, say so honestly.
Be concise, accurate, and reference the source material when possible."""


class ChatRequest(BaseModel):
    class_id: str
    message: str
    file_id: Optional[str] = None


@router.post("/send")
async def api_chat_send(body: ChatRequest):
    if not body.class_id:
        raise HTTPException(status_code=400, detail="class_id is required")
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    # Save user message
    await save_chat_message(body.class_id, "user", body.message)

    filename_filter = None
    if body.file_id:
        f = await get_file(body.file_id, body.class_id)
        if not f:
            raise HTTPException(status_code=404, detail="Selected file not found for class")
        filename_filter = f["filename"]

    # Retrieve relevant chunks via RAG
    try:
        vs = get_vector_store(body.class_id)
        chunks = vs.search(body.message, top_k=5, filename=filename_filter)
    except Exception:
        chunks = []

    # Build context from retrieved chunks
    if chunks:
        context_parts = []
        for c in chunks:
            context_parts.append(f"[Source: {c.get('chunk_id', 'unknown')}]\n{c['text']}")
        context_text = "\n\n---\n\n".join(context_parts)
    else:
        context_text = "(No class materials indexed yet. Please upload PDFs for this class.)"

    # Get recent chat history for conversational context
    history = await list_chat_history(body.class_id, limit=10)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-8:]:  # Last 8 messages for context window
        messages.append({"role": h["role"], "content": h["message"]})

    messages.append({
        "role": "user",
        "content": f"### RETRIEVED CLASS MATERIAL:\n{context_text}\n\n### STUDENT QUESTION:\n{body.message}\n\n### ACTIVE FILE FILTER:\n{filename_filter if filename_filter else 'None (all class files)'}"
    })

    # Call OpenAI
    try:
        response = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=messages,
            max_tokens=1024,
        )
        reply = response.choices[0].message.content
    except Exception as e:
        reply = f"I'm sorry, I encountered an error generating a response: {str(e)}"

    # Save assistant reply
    await save_chat_message(body.class_id, "assistant", reply)
    return {"reply": reply}


@router.get("/history")
async def api_chat_history(class_id: str):
    if not class_id:
        raise HTTPException(status_code=400, detail="class_id is required")
    history = await list_chat_history(class_id)
    return {"history": history}
