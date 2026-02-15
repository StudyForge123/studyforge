from __future__ import annotations

from typing import List, Dict, Any, Optional
from openai import OpenAI

from app import config
from app.schemas.study import StudySessionOutput

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an expert teaching assistant creating engaging study materials.

Your task is to create slide-style study content that:
1. **Is grounded in the provided context** - All content must come from the given material
2. **Is well-structured** - Clear hierarchy with slides and bullet points
3. **Is pedagogically sound** - Build from fundamentals to complex ideas
4. **Includes knowledge checks** - Create questions to test understanding
5. **Has detailed speaker notes** - Provide additional context for self-study

Hard Rules:
- ONLY use information from the provided context chunks
- DO NOT invent facts or information not present in the context
- Create 3-5 slides covering the topic comprehensively
- Include 2-3 knowledge check questions
- Always reference source material in explanations
- Keep bullets concise and focused (3-6 bullets per slide)
"""


def _build_context(retrieved_chunks: List[Dict[str, Any]]) -> str:
    """Build context string from retrieved chunks."""
    parts = []
    for i, chunk in enumerate(retrieved_chunks):
        parts.append(f"\n=== CHUNK {i+1} (ID: {chunk['chunk_id']}) ===")
        parts.append(f"Source: {chunk['filename']}")
        if chunk.get('page_start'):
            parts.append(f"Pages: {chunk['page_start']}-{chunk['page_end']}")
        parts.append(f"\n{chunk['text']}\n")
    return "\n".join(parts)


def _build_user_prompt(
    topic: str,
    context: str,
    instructions: Optional[str] = None
) -> str:
    """Build user prompt for study session generation."""
    parts = [
        f"Create a comprehensive study session on: {topic}\n",
        "Requirements:",
        "- Create 3-5 slides with clear titles and concise bullet points",
        "- Include speaker notes for each slide to aid self-study",
        "- Generate 2-3 knowledge check questions with detailed explanations",
        "- Ensure all content is grounded in the provided material",
    ]
    
    if instructions:
        parts.append(f"\nAdditional Instructions: {instructions}")
    
    parts.append("\nContext Material:\n")
    parts.append(context)
    parts.append("\nGenerate the study session content now.")
    
    return "\n".join(parts)


def generate_study_session(
    retrieved_chunks: List[Dict[str, Any]],
    topic: str,
    instructions: Optional[str] = None
) -> StudySessionOutput:
    """
    Generate study session content using RAG with retrieved chunks.
    
    Args:
        retrieved_chunks: List of chunk metadata dicts from vector search
        topic: Topic or question for the study session
        instructions: Optional additional instructions
        
    Returns:
        StudySessionOutput with slides and knowledge checks grounded in retrieved chunks
    """
    if not retrieved_chunks:
        return StudySessionOutput(
            topic=topic,
            slides=[],
            knowledge_checks=[],
            source_chunk_ids=[]
        )
    
    context = _build_context(retrieved_chunks)
    user_prompt = _build_user_prompt(topic, context, instructions)
    
    # Use OpenAI structured output
    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        text_format=StudySessionOutput,
    )
    
    parsed = response.output_parsed
    
    # Extract and add source chunk IDs
    chunk_ids = [c["chunk_id"] for c in retrieved_chunks]
    parsed.source_chunk_ids = chunk_ids
    parsed.topic = topic
    
    # Add chunk IDs to knowledge checks if not present
    for kc in parsed.knowledge_checks:
        if not kc.source_chunk_ids:
            kc.source_chunk_ids = chunk_ids
    
    return parsed
