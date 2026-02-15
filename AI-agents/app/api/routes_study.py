from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.study_agent import generate_study_session

router = APIRouter(prefix="/api/study", tags=["study"])

class StudyRequest(BaseModel):
    class_id: str
    topic: str

@router.post("/session")
async def api_start_study_session(body: StudyRequest):
    try:
        session = generate_study_session(body.class_id, body.topic)
        return session.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
