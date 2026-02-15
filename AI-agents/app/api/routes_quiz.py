from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.agents.quiz_agent import generate_quiz
from app.storage.mongo import get_file

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

class QuizRequest(BaseModel):
    class_id: str
    num_questions: int = 5
    difficulty: str = "medium"
    topic: Optional[str] = None
    instructions: Optional[str] = None
    file_id: Optional[str] = None

@router.post("/generate")
async def api_generate_quiz(body: QuizRequest):
    try:
        filename_filter = None
        if body.file_id:
            f = await get_file(body.file_id, body.class_id)
            if not f:
                raise HTTPException(status_code=404, detail="Selected file not found for class")
            filename_filter = f["filename"]
        quiz = generate_quiz(
            class_id=body.class_id,
            num_questions=body.num_questions,
            difficulty=body.difficulty,
            topic=body.topic,
            instructions=body.instructions,
            filename_filter=filename_filter,
        )
        return quiz.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
