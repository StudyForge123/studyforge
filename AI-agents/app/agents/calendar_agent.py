from __future__ import annotations

from typing import List, Dict, Any
<<<<<<< HEAD
<<<<<<< HEAD
from openai import OpenAI

from app import config
from app.schemas.calendar import CalendarOutput
=======
=======
>>>>>>> main
import re
from openai import OpenAI

from app import config
from app.schemas.calendar import CalendarOutput, CalendarEvent
<<<<<<< HEAD
>>>>>>> sulaiman
=======
>>>>>>> main

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You extract academic calendar events from university syllabi.
<<<<<<< HEAD
<<<<<<< HEAD

Hard Rules:
- Use ONLY the provided syllabus text.
- If an event date is not explicitly stated, OMIT it.
- Do NOT invent dates.
- Output due_date in ISO format YYYY-MM-DD.
- If only month/day is given, infer the year using the provided default_year.
- Keep course names exactly as provided.
- Include source filename for every event.
=======
=======
>>>>>>> main
Include exams, quizzes, assignments, projects, administrative dates, AND recurring events (Class Time, Office Hours).
If there is a weekly schedule table, you MUST read each row and include important dated items from it.

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
6. Weekly schedule tables:
   - If a table has rows like "Week of 08/23", treat those as anchor dates.
   - Include major deadlines (exams, final, major assignments, quizzes).
   - If the syllabus states recurring due rules (e.g., "Homework due Sundays 11:59pm", "Quiz due Mondays 10:30am"),
     emit recurring template events so they can be expanded into concrete due dates.
<<<<<<< HEAD
>>>>>>> sulaiman
=======
>>>>>>> main
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> main
from datetime import datetime, timedelta

def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()

def _infer_event_type(title: str) -> str:
    t = (title or "").lower()
    if any(k in t for k in ["midterm", "final", "exam", "test"]):
        return "exam"
    if "quiz" in t:
        return "quiz"
    if "reading" in t:
        return "reading"
    if any(k in t for k in ["homework", "assignment", "due", "deadline"]):
        return "assignment"
    if "project" in t:
        return "project"
    return "other"

def _to_hhmm(hour: int, minute: int, suffix: str | None) -> str:
    h = hour
    if suffix:
        s = suffix.lower()
        if s == "am" and h == 12:
            h = 0
        elif s == "pm" and h < 12:
            h += 12
    return f"{h:02d}:{minute:02d}"

def _extract_time_range(line: str) -> tuple[str | None, str | None]:
    rng = re.search(
        r"(\d{1,2}):(\d{2})\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})\s*(am|pm)?",
        line,
        flags=re.IGNORECASE,
    )
    if rng:
        start = _to_hhmm(int(rng.group(1)), int(rng.group(2)), rng.group(3))
        end = _to_hhmm(int(rng.group(4)), int(rng.group(5)), rng.group(6))
        return start, end
    single = re.search(r"\b(\d{1,2}):(\d{2})\s*(am|pm)\b", line, flags=re.IGNORECASE)
    if single:
        return _to_hhmm(int(single.group(1)), int(single.group(2)), single.group(3)), None
    return None, None

def _line_dates(line: str, default_year: int) -> List[datetime]:
    dates: List[datetime] = []
    for m in re.finditer(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", line):
        mm = int(m.group(1))
        dd = int(m.group(2))
        yy = m.group(3)
        year = default_year if yy is None else int(yy) + 2000 if len(yy) == 2 else int(yy)
        try:
            dates.append(datetime(year, mm, dd))
        except ValueError:
            continue

    month_re = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    for m in re.finditer(rf"\b{month_re}\s+(\d{{1,2}})(?:,\s*(\d{{4}}))?\b", line, flags=re.IGNORECASE):
        month_name = m.group(1)
        day = int(m.group(2))
        year = int(m.group(3)) if m.group(3) else default_year
        try:
            parsed = datetime.strptime(f"{month_name} {day} {year}", "%B %d %Y")
        except ValueError:
            try:
                parsed = datetime.strptime(f"{month_name} {day} {year}", "%b %d %Y")
            except ValueError:
                continue
        dates.append(parsed)
    return dates

def _extract_table_events(items: List[Dict[str, Any]], default_year: int) -> List[Dict[str, Any]]:
    supplemental: List[Dict[str, Any]] = []
    week_date_re = re.compile(r"^\s*(\d{1,2})/(\d{1,2})\b", re.MULTILINE)

    for item in items:
        text = item.get("text", "")
        if not text:
            continue

        weeks = []
        for m in week_date_re.finditer(text):
            month = int(m.group(1))
            day = int(m.group(2))
            try:
                weeks.append(datetime(default_year, month, day))
            except ValueError:
                continue
        weeks = sorted({w.date(): w for w in weeks}.values(), key=lambda d: d.date())

        lower = text.lower()
        has_weekly_hw = "homework" in lower and "sunday" in lower and "11:59" in lower
        has_weekly_quiz = ("pre-lecture" in lower or "pre lecture" in lower) and "monday" in lower and "10:30" in lower

        if has_weekly_hw:
            for wk in weeks:
                due = wk + timedelta(days=6)
                supplemental.append({
                    "title": "Homework Due",
                    "course": item.get("course", "Course"),
                    "type": "assignment",
                    "due_date": due.strftime("%Y-%m-%d"),
                    "start_time": "23:59",
                    "end_time": None,
                    "recurrence": None,
                    "semester": None,
                    "duration_weeks": None,
                    "timezone": "America/New_York",
                    "source": {"filename": item.get("filename", "syllabus"), "page_hint": "schedule"},
                })

        if has_weekly_quiz:
            for wk in weeks:
                supplemental.append({
                    "title": "Pre-Lecture Quiz Due",
                    "course": item.get("course", "Course"),
                    "type": "quiz",
                    "due_date": wk.strftime("%Y-%m-%d"),
                    "start_time": "10:30",
                    "end_time": None,
                    "recurrence": None,
                    "semester": None,
                    "duration_weeks": None,
                    "timezone": "America/New_York",
                    "source": {"filename": item.get("filename", "syllabus"), "page_hint": "schedule"},
                })

        # Capture any line with a date (table and non-table), with inferred event type.
        lines = text.splitlines()
        for ln in lines:
            line = _normalize_whitespace(ln)
            if not line:
                continue
            if line.lower().startswith("week of"):
                continue
            if len(line) < 6:
                continue
            dates = _line_dates(line, default_year)
            if not dates:
                continue
            start_time, end_time = _extract_time_range(line)
            # Prefer line text without leading date token for table rows.
            body = re.sub(r"^\s*\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*", "", line).strip()
            title = body if body else line
            if len(title) < 3:
                title = "Scheduled Course Event"
            event_type = _infer_event_type(title)

            for dt in dates:
                supplemental.append({
                    "title": title[:180],
                    "course": item.get("course", "Course"),
                    "type": event_type,
                    "due_date": dt.strftime("%Y-%m-%d"),
                    "start_time": start_time,
                    "end_time": end_time,
                    "recurrence": None,
                    "semester": None,
                    "duration_weeks": None,
                    "timezone": "America/New_York",
                    "source": {"filename": item.get("filename", "syllabus"), "page_hint": "schedule"},
                })

    return supplemental

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
<<<<<<< HEAD
>>>>>>> sulaiman
=======
>>>>>>> main

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

<<<<<<< HEAD
<<<<<<< HEAD
    # Parsed structured result
    parsed = response.output_parsed
    for e in parsed.events:
        e.timezone = "America/New_York"
    return parsed


=======
=======
>>>>>>> main
    # Parsed structured templates
    parsed = response.output_parsed
    
    # Expand recurring templates into individual events
    expanded_events = _expand_events(parsed.events, default_year)
    supplemental = _extract_table_events(items, default_year)
    
    # Merge deterministic supplemental schedule extraction and de-duplicate.
    merged = [e.model_dump() if hasattr(e, "model_dump") else e for e in expanded_events]
    merged.extend(supplemental)
    dedup = {}
    for ev in merged:
        key = (
            (ev.get("course") or "").strip().lower(),
            (ev.get("title") or "").strip().lower(),
            (ev.get("type") or "").strip().lower(),
            (ev.get("due_date") or "").strip(),
            (ev.get("start_time") or "").strip(),
        )
        dedup[key] = ev

    parsed.events = [CalendarEvent.model_validate(e) for e in dedup.values()]
    for e in parsed.events:
        e.timezone = "America/New_York"
    return parsed
<<<<<<< HEAD
>>>>>>> sulaiman
=======
>>>>>>> main
