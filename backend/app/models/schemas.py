from pydantic import BaseModel
from typing import Optional, List

class ClassBase(BaseModel):
    name: str
    professor: Optional[str] = None
    semester: Optional[str] = "Current"

class ClassCreate(ClassBase):
    pass

class ClassSchema(ClassBase):
    id: str
    nextExamDate: Optional[str] = None
    progress: float = 0.0
    
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    activeClasses: int
    upcomingDeadlines: int
    scheduledSessions: int

class CalendarEvent(BaseModel):
    date: str
    title: str

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    reply: str
