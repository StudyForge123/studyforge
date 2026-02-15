from __future__ import annotations
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app import config
from app.schemas.study import StudySessionOutput
from app.ingest.retrieval import get_vector_store

client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are an expert tutor. Your task is to generate a study session (slides + knowledge checks) based on the provided course material.

Hard Rules:
1. Grounding: All content must be derived EXCLUSIVELY from the provided context.
2. Structure: 
   - Slides: {title, bullets, speaker_notes}
   - Knowledge Checks: {question, answer, explanation, source_chunk_ids}
3. Clarity: Slides should be clear and concise. Speaker notes should provide depth.
4. References: Always include source_chunk_ids for knowledge checks.
"""

def generate_study_session(
    class_id: str,
    topic: str
) -> StudySessionOutput:
    
    # 1. Retrieve relevant material
    vs = get_vector_store(class_id)
    chunks = vs.search(topic, top_k=8)
    
    if not chunks:
        return StudySessionOutput(slides=[], knowledge_checks=[])
        
    context_parts = []
    for c in chunks:
        context_parts.append(f"--- SOURCE ID: {c['chunk_id']} ---\n{c['text']}\n")
    
    context_text = "\n".join(context_parts)
    
    # 2. Build User Prompt
    user_prompt = f"""
Generate a study session for the topic: "{topic}".
Include about 3-5 slides and 2-3 knowledge checks.

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
        text_format=StudySessionOutput,
    )
    
    return response.output_parsed
