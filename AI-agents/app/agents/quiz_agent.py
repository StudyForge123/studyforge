from __future__ import annotations
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app import config
from app.schemas.quiz import QuizOutput
from app.ingest.retrieval import get_vector_store

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are an expert AI professor. Your task is to generate quiz questions based on the provided course material.

Hard Rules:
1. Grounding: Every question and explanation must be derived EXCLUSIVELY from the provided context.
2. Structure: Return questions in the requested JSON format.
3. Quality: Match the requested difficulty (easy, medium, hard).
4. References: Always include the source_chunk_ids for each question.
5. Hallucinations: If the context is insufficient for the requested number of questions or topic, generate only what is possible and explain why in the chat (though here you just return the valid JSON).
"""

def generate_quiz(
    class_id: str,
    num_questions: int,
    difficulty: str,
    topic: Optional[str] = None,
    instructions: Optional[str] = None
) -> QuizOutput:
    
    # 1. Retrieve relevant material
    query = topic if topic else "comprehensive core concepts"
    vs = get_vector_store(class_id)
    chunks = vs.search(query, top_k=10) # Retrieve enough context
    
    if not chunks:
        return QuizOutput(questions=[])
        
    context_parts = []
    for c in chunks:
        context_parts.append(f"--- SOURCE ID: {c['chunk_id']} ---\n{c['text']}\n")
    
    context_text = "\n".join(context_parts)
    
    # 2. Build User Prompt
    user_prompt = f"""
Generate a {difficulty} quiz with {num_questions} questions.
Topic: {topic if topic else 'General course content'}
Additional Instructions: {instructions if instructions else 'None'}

### CONTEXT MATERIAL:
{context_text}
"""

    # 3. Call OpenAI with structured output
    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        text_format=QuizOutput,
    )
    
    return response.output_parsed
