"""Generate quiz questions from retrieved class chunks using OpenAI."""
from __future__ import annotations

from typing import List, Dict, Any

from openai import OpenAI

from app import config
from app.schemas.quiz import QuizOutput, QuizQuestion

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a quiz generator for students. You MUST use ONLY the provided context chunks to create questions and answers.
- Each question must be answerable from the provided context. Do not invent facts.
- The explanation MUST cite or reference the retrieved context (e.g. "According to the material...") to ground the answer.
- Include source_chunk_ids for each question (the chunk IDs that support that question).
- Difficulty: easy = recall, medium = application, hard = analysis/synthesis.
- For MCQ, provide options list; for short answer, options can be empty."""


def build_context_block(chunks: List[Dict[str, Any]]) -> str:
    parts = []
    for c in chunks:
        parts.append(f"[Chunk {c.get('chunk_id', '')}]\n{c.get('text', '')}\n")
    return "\n".join(parts)


def generate_quiz(
    class_name: str,
    num_questions: int,
    difficulty: str,
    topic: str | None,
    instructions: str | None,
    retrieved_chunks: List[Dict[str, Any]],
) -> QuizOutput:
    if not retrieved_chunks:
        return QuizOutput(questions=[])

    context = build_context_block(retrieved_chunks)
    user = f"""Class: {class_name}
Number of questions: {num_questions}
Difficulty: {difficulty}
Topic (optional): {topic or 'any'}
Additional instructions: {instructions or 'None'}

Context from course materials:
{context}

Generate exactly {num_questions} questions. Each explanation must reference the context above. Set source_chunk_ids to the chunk IDs that support each question."""

    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        text_format=QuizOutput,
    )
    return response.output_parsed
