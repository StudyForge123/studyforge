"""Generate study session (slides + knowledge checks) from retrieved chunks."""
from __future__ import annotations

from typing import List, Dict, Any

from openai import OpenAI

from app import config
from app.schemas.study import StudySessionOutput, Slide, KnowledgeCheck

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a study session generator. Create slide-style teaching content and knowledge checks using ONLY the provided context.
- Slides: title, bullets (3-6 per slide), speaker_notes. Content must come from the context.
- Knowledge checks: question, answer, explanation. The explanation MUST reference the retrieved context. Include source_chunk_ids for each check.
- Do not invent facts. Ground every slide and check in the provided chunks."""


def build_context_block(chunks: List[Dict[str, Any]]) -> str:
    parts = []
    for c in chunks:
        parts.append(f"[Chunk {c.get('chunk_id', '')}]\n{c.get('text', '')}\n")
    return "\n".join(parts)


def generate_study_session(
    class_name: str,
    topic: str | None,
    question: str | None,
    retrieved_chunks: List[Dict[str, Any]],
) -> StudySessionOutput:
    if not retrieved_chunks:
        return StudySessionOutput(slides=[], knowledge_checks=[])

    context = build_context_block(retrieved_chunks)
    focus = topic or question or "main concepts from the materials"
    user = f"""Class: {class_name}
Focus: {focus}

Context from course materials:
{context}

Generate 3-6 slides (title, bullets, speaker_notes) and 2-4 knowledge check questions. All content must be grounded in the context. Set source_chunk_ids for each knowledge check."""

    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        text_format=StudySessionOutput,
    )
    return response.output_parsed
