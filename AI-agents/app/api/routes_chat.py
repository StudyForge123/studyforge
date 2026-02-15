from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.chat_agent import process_chat

router = APIRouter(prefix="/api", tags=["chat"])

class ChatRequest(BaseModel):
    mode: str
    message: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint for the AI study companion chat.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    response = process_chat(request.mode, request.message)
    return {"reply": response}
