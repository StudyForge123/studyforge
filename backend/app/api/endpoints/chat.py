from fastapi import APIRouter, Depends
from ...core.auth import get_current_user
from ...models.schemas import ChatMessage, ChatResponse

router = APIRouter()

@router.post("/", response_model=ChatResponse)
def chat_with_ai(payload: ChatMessage, current_user: dict = Depends(get_current_user)):
    # Integration point with AI Agents would go here
    return {"reply": f"I received your message: '{payload.message}'. This is a mock response from the backend AI agent."}
