from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Literal

EventType = Literal["assignment", "quiz", "exam", "reading", "project", "administrative", "other"]

class SourceRef(BaseModel):
    filename: str
    page_hint: Optional[str] = None

class CalendarEvent(BaseModel):
    title: str
    course: str
    type: EventType
    due_date: str  # YYYY-MM-DD
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None    # HH:MM
    timezone: str = "America/New_York"
    source: SourceRef

class CalendarOutput(BaseModel):
    events: List[CalendarEvent] = Field(default_factory=list)
