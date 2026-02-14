from fastapi import APIRouter, Depends
from typing import List
from ...core.auth import get_current_user
from ...db.memory import db
from ...models.schemas import CalendarEvent

router = APIRouter()

@router.get("/", response_model=List[CalendarEvent])
def get_calendar(current_user: dict = Depends(get_current_user)):
    return db.calendar_events

@router.post("/{class_id}/calendar/generate")
def generate_calendar_from_syllabus(class_id: str, current_user: dict = Depends(get_current_user)):
    # Mock generation logic
    return {"message": "Calendar generation started", "status": "processing"}
