from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional

class Slide(BaseModel):
    title: str
    bullets: List[str]
    speaker_notes: str

class KnowledgeCheck(BaseModel):
    question: str
    answer: str
    explanation: str
    source_chunk_ids: List[str]

class StudySessionOutput(BaseModel):
    slides: List[Slide]
    knowledge_checks: List[KnowledgeCheck]
