from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Literal

DifficultyLevel = Literal["easy", "medium", "hard"]


class QuizQuestion(BaseModel):
    question: str
    options: Optional[List[str]] = None  # For multiple choice
    answer: str
    explanation: str
    source_chunk_ids: List[str] = Field(default_factory=list)
    

class QuizOutput(BaseModel):
    questions: List[QuizQuestion] = Field(default_factory=list)
    metadata: Optional[dict] = None
