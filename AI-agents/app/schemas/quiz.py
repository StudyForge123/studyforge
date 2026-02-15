from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional

class QuizQuestion(BaseModel):
    question: str
    options: Optional[List[str]] = None
    answer: str
    explanation: str
    source_chunk_ids: List[str]

class QuizOutput(BaseModel):
    questions: List[QuizQuestion]
