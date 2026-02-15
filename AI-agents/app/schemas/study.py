from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional


class KnowledgeCheck(BaseModel):
    question: str
    answer: str
    explanation: str
    source_chunk_ids: List[str] = Field(default_factory=list)


class Slide(BaseModel):
    title: str
    bullets: List[str] = Field(default_factory=list)
    speaker_notes: Optional[str] = None
    

class StudySessionOutput(BaseModel):
    topic: str
    slides: List[Slide] = Field(default_factory=list)
    knowledge_checks: List[KnowledgeCheck] = Field(default_factory=list)
    source_chunk_ids: List[str] = Field(default_factory=list)
