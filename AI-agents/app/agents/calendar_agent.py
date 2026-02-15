from __future__ import annotations

from typing import List, Dict, Any
from openai import OpenAI

from app import config
from app.schemas.calendar import CalendarOutput

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You extract academic calendar events from university syllabi.
Include exams, quizzes, assignments, projects, administrative dates, AND recurring events (Class Time, Office Hours).

Hard Rules:
1. Use ONLY the provided syllabus text.
2. Recurring Events (Class Time, Office Hours):
   - Instead of listing every instance, extract a TEMPLATE.
   - Set 'recurrence' to "MWF", "TTh", "MW", "MTWThF", etc.
   - Set 'semester' to "Fall", "Spring", or "Summer" (Identify from text).
   - Set 'duration_weeks' to the semester length (default to 15 if unknown).
   - Leave 'due_date' empty for these templates.
3. Specific Dates (Exams, etc.):
   - Set 'due_date' in YYYY-MM-DD.
   - Set 'semester' as identified.
   - Leave 'recurrence' empty.
4. Handling "Week N":
   - Identify Semester (Fall/Spring/Summer). Fall: Start Aug 25. Spring: Start Jan 15. Summer: Start May 15.
   - Calculate: Start Date + (N-1) weeks. Use this as due_date.
5. Time Extraction:
   - Extract start_time and end_time (HH:MM).
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

from datetime import datetime, timedelta

def _expand_events(templates: List[Any], default_year: int) -> List[Any]:
    expanded = []
    for t in templates:
        if not t.recurrence:
            expanded.append(t)
            continue
        
        # Determine start date based on semester
        sem = (t.semester or "Fall").capitalize()
        if "Fall" in sem:
            month, day = 8, 25
        elif "Spring" in sem:
            month, day = 1, 15
        elif "Summer" in sem:
            month, day = 5, 15
        else:
            month, day = 8, 25

        start_date = datetime(default_year, month, day)
        
        day_map = {"M": 0, "T": 1, "W": 2, "Th": 3, "F": 4, "S": 5, "Su": 6}
        active_days = []
        
        # Parse recurrence pattern safely
        pattern = t.recurrence
        if "MTWThF" in pattern: active_days = [0, 1, 2, 3, 4]
        elif "MTWTh" in pattern: active_days = [0, 1, 2, 3]
        elif "MWF" in pattern: active_days = [0, 2, 4]
        elif "TTh" in pattern: active_days = [1, 3]
        elif "MW" in pattern: active_days = [0, 2]
        else:
            # Advanced parsing for things like "MTW"
            import re
            tokens = re.findall(r"(Th|Su|[MTWFS])", pattern)
            for tok in tokens:
                if tok in day_map:
                    active_days.append(day_map[tok])

        duration = t.duration_weeks or 15
        for week in range(duration):
            for day_offset in active_days:
                current = start_date + timedelta(weeks=week)
                days_ahead = day_offset - current.weekday()
                if days_ahead < 0: days_ahead += 7
                event_date = current + timedelta(days=days_ahead)
                
                new_event = t.model_copy()
                new_event.due_date = event_date.strftime("%Y-%m-%d")
                new_event.recurrence = None
                expanded.append(new_event)
    return expanded

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

    # Parsed structured templates
    parsed = response.output_parsed
    
    # Expand recurring templates into individual events
    expanded_events = _expand_events(parsed.events, default_year)
    
    parsed.events = expanded_events
    for e in parsed.events:
        e.timezone = "America/New_York"
    return parsed


