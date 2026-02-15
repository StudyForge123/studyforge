from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Literal

EventType = Literal["assignment", "quiz", "exam", "reading", "project", "other"]

class SourceRef(BaseModel):
    filename: str
    page_hint: Optional[str] = None

class CalendarEvent(BaseModel):
    title: str
    course: str
    type: EventType
    due_date: Optional[str] = None  # YYYY-MM-DD
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None    # HH:MM
    recurrence: Optional[str] = None   # e.g. "MWF", "TTh", "Weekly"
    semester: Optional[str] = None     # e.g. "Fall", "Spring", "Summer"
    duration_weeks: Optional[int] = None # e.g. 15
    timezone: str = "America/New_York"
    source: SourceRef

class CalendarOutput(BaseModel):
    events: List[CalendarEvent] = Field(default_factory=list)
