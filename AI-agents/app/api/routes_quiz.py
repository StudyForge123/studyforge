from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.agents.quiz_agent import generate_quiz

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

class QuizRequest(BaseModel):
    class_id: str
    num_questions: int = 5
    difficulty: str = "medium"
    topic: Optional[str] = None
    instructions: Optional[str] = None

@router.post("/generate")
async def api_generate_quiz(body: QuizRequest):
    try:
        quiz = generate_quiz(
            class_id=body.class_id,
            num_questions=body.num_questions,
            difficulty=body.difficulty,
            topic=body.topic,
            instructions=body.instructions
        )
        return quiz.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
