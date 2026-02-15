from __future__ import annotations

from typing import List
from pydantic import BaseModel, Field


class Slide(BaseModel):
    title: str
    bullets: List[str] = Field(default_factory=list)
    speaker_notes: str = ""


class KnowledgeCheck(BaseModel):
    question: str
    answer: str
    explanation: str
    source_chunk_ids: List[str] = Field(default_factory=list)


class StudySessionOutput(BaseModel):
    slides: List[Slide] = Field(default_factory=list)
    knowledge_checks: List[KnowledgeCheck] = Field(default_factory=list)
