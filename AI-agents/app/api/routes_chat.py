from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.storage.mongo import get_class, add_chat_message, get_chat_history

router = APIRouter(prefix="/api", tags=["chat"])


class ChatSendRequest(BaseModel):
    class_id: str
    message: str
    session_id: Optional[str] = None


@router.post("/chat/send")
async def api_chat_send(body: ChatSendRequest):
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if not (body.message or "").strip():
        raise HTTPException(status_code=400, detail="Message required")

    await add_chat_message(body.class_id, "user", body.message.strip(), session_id=body.session_id)
    # MVP: echo or simple placeholder; could wire to an LLM later with RAG
    reply = f"Thanks for your message about class '{cls['name']}'. (StudyForge MVP: chat reply not yet connected to AI.)"
    await add_chat_message(body.class_id, "assistant", reply, session_id=body.session_id)
    return {"reply": reply}


@router.get("/chat/history")
async def api_chat_history(class_id: str, session_id: str = None, limit: int = 100):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    messages = await get_chat_history(class_id, session_id=session_id, limit=limit)
    return {"class_id": class_id, "messages": messages}
