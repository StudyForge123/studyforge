from __future__ import annotations

from typing import List, Dict, Any
from openai import OpenAI

from app import config
from app.schemas.calendar import CalendarOutput

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You extract academic calendar events from university syllabi.
Include exams, quizzes, assignments, projects, AND administrative dates (e.g., drop deadlines, holidays, tuition refund dates).

Hard Rules:
- Use ONLY the provided syllabus text.
- If an event date is not explicitly stated, OMIT it.
- Do NOT invent dates.
- Output due_date in ISO format YYYY-MM-DD.
- If only month/day is given, infer the year using the provided default_year.
- Keep course names exactly as provided.
- Include source filename for every event.
- For administrative dates, set type to 'administrative'.
"""

def _build_user_payload(items: List[Dict[str, Any]], default_year: int) -> str:
    """
    items = [
        {
            "course": str,
            "filename": str,
            "text": str
        }
    ]
    """
    parts = [f"default_year: {default_year}\n"]
    for item in items:
        parts.append(
            f"\n=== COURSE: {item['course']} | FILE: {item['filename']} ===\n"
        )
        parts.append(item["text"])
        parts.append("\n")
    return "".join(parts)


def generate_calendar(
    items: List[Dict[str, Any]],
    default_year: int
) -> CalendarOutput:
    """
    Generate structured calendar events from one or more syllabi.
    """

    user_content = _build_user_payload(items, default_year)

    response = client.responses.parse(
        model=config.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        text_format=CalendarOutput,  # Enforce structured Pydantic output
    )

    # Parsed structured result
    parsed = response.output_parsed
    for e in parsed.events:
        e.timezone = "America/New_York"
    return parsed


