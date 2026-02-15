from __future__ import annotations

from typing import List, Dict, Any
from openai import OpenAI

from app import config
from app.schemas.study_session import StudySessionOutput

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a study session creator for university courses.

Your job is to create slide-style teaching content with knowledge checks.

Rules:
- Create content ONLY from the provided context chunks.
- Each slide should have a clear title and 3-5 bullet points.
- Speaker notes should elaborate on the bullets.
- Knowledge checks must be grounded in the context.
- Include source chunk IDs for traceability.
- Do NOT invent information not in the context.
- Aim for 3-5 slides per session.
- Create 2-3 knowledge check questions.
"""


def generate_study_session(
    retrieved_chunks: List[Dict[str, Any]],
    topic: str,
) -> StudySessionOutput:
    """
    Generate a study session with slides and knowledge checks.
    
    Args:
        retrieved_chunks: List of chunk metadata from vector search
        topic: Topic or question for the study session
    """
    
    if not retrieved_chunks:
        return StudySessionOutput(
            topic=topic,
            slides=[],
            knowledge_checks=[]
        )
    
    # Build context from chunks
    context_parts = []
    chunk_id_map = {}
    for i, chunk in enumerate(retrieved_chunks):
        chunk_id = chunk.get("chunk_id", f"chunk_{i}")
        chunk_id_map[i] = chunk_id
        context_parts.append(f"[{chunk_id}]\n{chunk['text']}\n")
    
    context = "\n---\n".join(context_parts)
    
    # Build user prompt
    user_content = f"""Topic: {topic}

Context:
{context}

Create a study session with slides and knowledge checks based on this topic and context."""
    
    # Call OpenAI with structured output
    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        text_format=StudySessionOutput,
    )
    
    result = response.output_parsed
    result.topic = topic
    
    return result
