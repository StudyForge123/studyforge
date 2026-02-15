from __future__ import annotations

from typing import List, Dict, Any, Optional
from openai import OpenAI

from app import config
from app.schemas.quiz import QuizOutput, DifficultyLevel

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an expert quiz generator for academic courses.

Your task is to generate quiz questions that are:
1. **Grounded in the provided context** - Every question must be answerable from the given material
2. **Clear and unambiguous** - Questions should have one correct answer
3. **Educational** - Focus on key concepts and learning objectives
4. **Well-explained** - Provide detailed explanations that reference the source material

Hard Rules:
- ONLY use information from the provided context chunks
- DO NOT invent facts or information not present in the context
- For multiple choice questions, provide 4 options with only 1 correct answer
- Always cite which chunk(s) support your question in the explanation
- Match the requested difficulty level
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
    topic: Optional[str],
    difficulty: DifficultyLevel,
    num_questions: int,
    instructions: Optional[str],
    context: str
) -> str:
    """Build user prompt for quiz generation."""
    parts = [
        f"Generate {num_questions} quiz questions with the following requirements:\n",
        f"- Difficulty Level: {difficulty}",
        f"- Format: Multiple choice with 4 options each",
    ]
    
    if topic:
        parts.append(f"- Topic Focus: {topic}")
    
    if instructions:
        parts.append(f"- Additional Instructions: {instructions}")
    
    parts.append("\nContext Material:\n")
    parts.append(context)
    parts.append("\nGenerate the quiz questions now, ensuring each is grounded in the provided context.")
    
    return "\n".join(parts)


def generate_quiz(
    retrieved_chunks: List[Dict[str, Any]],
    num_questions: int = 5,
    difficulty: DifficultyLevel = "medium",
    topic: Optional[str] = None,
    instructions: Optional[str] = None
) -> QuizOutput:
    """
    Generate quiz questions using RAG with retrieved chunks.
    
    Args:
        retrieved_chunks: List of chunk metadata dicts from vector search
        num_questions: Number of questions to generate
        difficulty: Difficulty level (easy, medium, hard)
        topic: Optional topic to focus on
        instructions: Optional additional instructions
        
    Returns:
        QuizOutput with questions grounded in retrieved chunks
    """
    if not retrieved_chunks:
        return QuizOutput(
            questions=[],
            metadata={"error": "No relevant content found for quiz generation"}
        )
    
    context = _build_context(retrieved_chunks)
    user_prompt = _build_user_prompt(topic, difficulty, num_questions, instructions, context)
    
    # Use OpenAI structured output
    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        text_format=QuizOutput,
    )
    
    # Extract chunk IDs for metadata
    chunk_ids = [c["chunk_id"] for c in retrieved_chunks]
    
    parsed = response.output_parsed
    
    # Add source chunk IDs to each question if not already present
    for q in parsed.questions:
        if not q.source_chunk_ids:
            q.source_chunk_ids = chunk_ids
    
    # Add metadata
    parsed.metadata = {
        "difficulty": difficulty,
        "num_questions_requested": num_questions,
        "num_questions_generated": len(parsed.questions),
        "chunks_used": len(retrieved_chunks),
        "topic": topic,
    }
    
    return parsed
