from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.agents.study_agent import generate_study_session
from app.storage.mongo import get_file

router = APIRouter(prefix="/api/study", tags=["study"])

class StudyRequest(BaseModel):
    class_id: str
    topic: str
    file_id: Optional[str] = None

@router.post("/session")
async def api_start_study_session(body: StudyRequest):
    try:
        filename_filter = None
        if body.file_id:
            f = await get_file(body.file_id, body.class_id)
            if not f:
                raise HTTPException(status_code=404, detail="Selected file not found for class")
            filename_filter = f["filename"]
        session = generate_study_session(body.class_id, body.topic, filename_filter=filename_filter)
        return session.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
