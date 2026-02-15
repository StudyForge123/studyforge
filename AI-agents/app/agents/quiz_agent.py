from __future__ import annotations

from typing import List, Dict, Any, Optional
from openai import OpenAI

from app import config
from app.schemas.quiz import QuizOutput, Difficulty

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a quiz generator for university courses.

Rules:
- Generate questions ONLY based on the provided context chunks.
- Each question must be grounded in the retrieved context.
- Include source chunk IDs in your response.
- Provide clear explanations that reference the context.
- For multiple choice questions, provide 4 options.
- Do NOT make up information not present in the context.
- If the context is insufficient, generate fewer questions or simpler ones.
"""


def generate_quiz(
    retrieved_chunks: List[Dict[str, Any]],
    num_questions: int,
    difficulty: Difficulty,
    topic: Optional[str] = None,
    instructions: Optional[str] = None,
) -> QuizOutput:
    """
    Generate a quiz based on retrieved chunks.
    
    Args:
        retrieved_chunks: List of chunk metadata from vector search
        num_questions: Number of questions to generate
        difficulty: easy/medium/hard
        topic: Optional topic focus
        instructions: Optional custom instructions
    """
    
    if not retrieved_chunks:
        return QuizOutput(
            questions=[],
            topic=topic,
            difficulty=difficulty
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
    user_parts = [
        f"Number of questions: {num_questions}",
        f"Difficulty: {difficulty}",
    ]
    if topic:
        user_parts.append(f"Topic focus: {topic}")
    if instructions:
        user_parts.append(f"Special instructions: {instructions}")
    
    user_parts.append("\nContext:\n" + context)
    
    user_content = "\n".join(user_parts)
    
    # Call OpenAI with structured output
    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        text_format=QuizOutput,
    )
    
    result = response.output_parsed
    result.topic = topic
    result.difficulty = difficulty
    
    return result
