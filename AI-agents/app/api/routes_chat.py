from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(body: ChatRequest):
    return {"reply": f"Received: {body.message}. I am a placeholder for now."}
