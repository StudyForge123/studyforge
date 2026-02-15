from __future__ import annotations

from datetime import datetime, timedelta
import re
from typing import Any, Dict, List

from app.schemas.calendar import CalendarEvent, CalendarOutput

# Lines with these keywords are treated as non-event dates that should block events.
HOLIDAY_OR_NO_CLASS_TERMS = (
    "holiday",
    "no class",
    "no classes",
    "class cancelled",
    "class canceled",
    "campus closed",
    "university closed",
    "break",
    "recess",
    "spring break",
    "fall break",
    "winter break",
    "thanksgiving",
    "labor day",
    "memorial day",
    "independence day",
    "mlk",
)

# Event-oriented terms used when parsing table rows where date and event are split.
EVENT_SIGNAL_TERMS = (
    "deadline",
    "due",
    "assignment",
    "homework",
    "project",
    "quiz",
    "exam",
    "midterm",
    "final",
    "reading",
    "drop",
    "withdraw",
    "office hour",
    "office hours",
    "class",
    "lecture",
    "lab",
    "discussion",
    "paper",
    "presentation",
)


# ---------------------------
# Normalization + Date/Time
# ---------------------------
def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _normalize_year(raw_year: str | None, default_year: int) -> int:
    if not raw_year:
        return default_year
    y = int(raw_year)
    if len(raw_year) == 2:
        return 2000 + y
    return y


def _month_name_to_int(raw: str) -> int | None:
    cleaned = raw.replace(".", "").strip().lower()
    month_map = {
        "jan": 1,
        "january": 1,
        "feb": 2,
        "february": 2,
        "mar": 3,
        "march": 3,
        "apr": 4,
        "april": 4,
        "may": 5,
        "jun": 6,
        "june": 6,
        "jul": 7,
        "july": 7,
        "aug": 8,
        "august": 8,
        "sep": 9,
        "sept": 9,
        "september": 9,
        "oct": 10,
        "october": 10,
        "nov": 11,
        "november": 11,
        "dec": 12,
        "december": 12,
    }
    return month_map.get(cleaned)


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
    # 1pm-2:15pm, 1:00 pm to 2:00 pm, 13:00-14:15
    rng = re.search(
        r"(?P<sh>\d{1,2})(?::(?P<sm>\d{2}))?\s*(?P<ss>am|pm)?\s*(?:-|–|—|to)\s*(?P<eh>\d{1,2})(?::(?P<em>\d{2}))?\s*(?P<es>am|pm)?",
        line,
        flags=re.IGNORECASE,
    )
    if rng:
        sh = int(rng.group("sh"))
        sm = int(rng.group("sm") or "0")
        eh = int(rng.group("eh"))
        em = int(rng.group("em") or "0")
        ss = rng.group("ss")
        es = rng.group("es")
        if not ss and es:
            ss = es
        if not es and ss:
            es = ss
        return _to_hhmm(sh, sm, ss), _to_hhmm(eh, em, es)

    # 1pm / 1:30pm
    single = re.search(
        r"\b(?P<h>\d{1,2})(?::(?P<m>\d{2}))?\s*(?P<s>am|pm)\b",
        line,
        flags=re.IGNORECASE,
    )
    if single:
        return _to_hhmm(int(single.group("h")), int(single.group("m") or "0"), single.group("s")), None

    # 24h single time
    military = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", line)
    if military:
        return f"{int(military.group(1)):02d}:{int(military.group(2)):02d}", None

    return None, None


def _line_dates(line: str, default_year: int) -> List[datetime]:
    line = _normalize_whitespace(line)
    if not line:
        return []

    dates: List[datetime] = []
    seen = set()

    def _push(year: int, month: int, day: int) -> None:
        try:
            parsed = datetime(year, month, day)
        except ValueError:
            return
        key = parsed.date().isoformat()
        if key in seen:
            return
        seen.add(key)
        dates.append(parsed)

    # MM/DD[/YY]
    for m in re.finditer(r"\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12][0-9]|3[01])(?:[/-](\d{2,4}))?\b", line):
        month = int(m.group(1))
        day = int(m.group(2))
        year = _normalize_year(m.group(3), default_year)
        _push(year, month, day)

    # Month DD[, YYYY]
    month_re = r"(jan(?:uary)?\.?|feb(?:ruary)?\.?|mar(?:ch)?\.?|apr(?:il)?\.?|may|jun(?:e)?\.?|jul(?:y)?\.?|aug(?:ust)?\.?|sep(?:t)?(?:ember)?\.?|oct(?:ober)?\.?|nov(?:ember)?\.?|dec(?:ember)?\.?)"
    for m in re.finditer(rf"\b{month_re}\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:,\s*(\d{{2,4}}))?\b", line, flags=re.IGNORECASE):
        month = _month_name_to_int(m.group(1))
        if month is None:
            continue
        day = int(m.group(2))
        year = _normalize_year(m.group(3), default_year)
        _push(year, month, day)

    # DD Month [YYYY]
    for m in re.finditer(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_re}(?:,\s*(\d{{2,4}}))?\b", line, flags=re.IGNORECASE):
        day = int(m.group(1))
        month = _month_name_to_int(m.group(2))
        if month is None:
            continue
        year = _normalize_year(m.group(3), default_year)
        _push(year, month, day)

    return dates


# ---------------------------
# Event Inference (strict)
# ---------------------------
def _infer_event_type(title: str) -> str:
    lower = (title or "").lower()
    if any(k in lower for k in ("midterm", "final", "exam", "test")):
        return "exam"
    if "quiz" in lower:
        return "quiz"
    if "reading" in lower:
        return "reading"
    if "project" in lower:
        return "project"
    if any(k in lower for k in ("assignment", "homework", "deadline", "due", "drop", "withdraw")):
        return "assignment"
    return "other"


def _is_holiday_or_no_class_line(line: str) -> bool:
    lower = (line or "").lower()
    return any(term in lower for term in HOLIDAY_OR_NO_CLASS_TERMS)


def _line_has_event_signal(line: str) -> bool:
    lower = (line or "").lower()
    return any(term in lower for term in EVENT_SIGNAL_TERMS)


def _strip_leading_date_tokens(line: str) -> str:
    cleaned = line
    for _ in range(3):
        prev = cleaned
        cleaned = re.sub(r"^\s*(?:week\s+of\s+|week\s+\d+\s*[:.-]?\s*)", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^\s*(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12][0-9]|3[01])(?:[/-]\d{2,4})?\s*[:|,\-–—]?\s*", "", cleaned)
        cleaned = re.sub(
            r"^\s*(?:jan(?:uary)?\.?|feb(?:ruary)?\.?|mar(?:ch)?\.?|apr(?:il)?\.?|may|jun(?:e)?\.?|jul(?:y)?\.?|aug(?:ust)?\.?|sep(?:t)?(?:ember)?\.?|oct(?:ober)?\.?|nov(?:ember)?\.?|dec(?:ember)?\.?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{2,4})?\s*[:|,\-–—]?\s*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        if cleaned == prev:
            break
    return _normalize_whitespace(cleaned)


def _looks_like_anchor_line(line: str, stripped: str) -> bool:
    lower = line.lower()
    if "week of" in lower or lower.startswith("week "):
        return True
    if "|" in line or "\t" in line:
        return True
    # Date-only or date-list rows often represent table anchors.
    if not stripped or len(stripped) < 4:
        return True
    return bool(re.fullmatch(r"(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*(?:[-–—,/]\s*)?)+", line.strip()))


def _expand_holiday_date_range(line: str, dates: List[datetime]) -> List[datetime]:
    # For lines like "Spring Break: Mar 11 - Mar 15", block all dates in range.
    if len(dates) < 2:
        return dates
    lower = line.lower()
    if not any(k in lower for k in ("-", "to", "through", "thru")):
        return dates

    start = min(dates)
    end = max(dates)
    delta_days = (end.date() - start.date()).days
    if delta_days <= 1 or delta_days > 45:
        return dates

    expanded = [start + timedelta(days=i) for i in range(delta_days + 1)]
    return expanded


def _build_event(
    item: Dict[str, Any],
    title: str,
    due_date: datetime,
    start_time: str | None,
    end_time: str | None,
    page_hint: str,
) -> Dict[str, Any]:
    # Required behavior: if no time is provided, use 11:59 PM.
    event_start = start_time or "23:59"
    return {
        "title": (title or "Course Event")[:180],
        "course": item.get("course", "Course"),
        "type": _infer_event_type(title),
        "due_date": due_date.strftime("%Y-%m-%d"),
        "start_time": event_start,
        "end_time": end_time,
        "recurrence": None,
        "semester": None,
        "duration_weeks": None,
        "timezone": "America/New_York",
        "source": {"filename": item.get("filename", "syllabus"), "page_hint": page_hint},
    }


def _extract_events_from_item(item: Dict[str, Any], default_year: int) -> List[Dict[str, Any]]:
    text = item.get("text", "")
    if not text:
        return []

    events: List[Dict[str, Any]] = []
    excluded_dates: set[str] = set()

    # Anchor support for table-like extraction where date is one row and event text appears below.
    anchor_dates: List[datetime] = []
    anchor_ttl = 0

    for raw_line in text.splitlines():
        line = _normalize_whitespace(raw_line)
        if not line:
            anchor_dates = []
            anchor_ttl = 0
            continue
        if line.startswith("=== Page"):
            continue

        dates = _line_dates(line, default_year)
        blocked = _is_holiday_or_no_class_line(line)

        if dates:
            if blocked:
                for d in _expand_holiday_date_range(line, dates):
                    excluded_dates.add(d.strftime("%Y-%m-%d"))
                anchor_dates = []
                anchor_ttl = 0
                continue

            start_time, end_time = _extract_time_range(line)
            stripped = _strip_leading_date_tokens(line)

            # Date row with little/no body: keep as anchor for following table lines.
            if _looks_like_anchor_line(line, stripped):
                anchor_dates = dates
                anchor_ttl = 7
                continue

            title = stripped or "Course Event"
            for dt in dates:
                events.append(_build_event(item, title, dt, start_time, end_time, "dated-line"))

            # Allow following lines to reuse this date when text is split across lines.
            anchor_dates = dates
            anchor_ttl = 4
            continue

        # No date in current line: only use anchor dates if line looks like event content.
        if anchor_dates and anchor_ttl > 0:
            if blocked:
                for d in anchor_dates:
                    excluded_dates.add(d.strftime("%Y-%m-%d"))
                anchor_dates = []
                anchor_ttl = 0
                continue

            if _line_has_event_signal(line):
                start_time, end_time = _extract_time_range(line)
                title = _strip_leading_date_tokens(line) or "Course Event"
                for dt in anchor_dates:
                    events.append(_build_event(item, title, dt, start_time, end_time, "table-anchor"))

            anchor_ttl -= 1
            if anchor_ttl <= 0:
                anchor_dates = []

    # Final filtering: remove events that fall on blocked dates or are themselves no-class markers.
    filtered = []
    for ev in events:
        ev_date = (ev.get("due_date") or "").strip()
        title = (ev.get("title") or "").lower()
        if not ev_date:
            continue
        if ev_date in excluded_dates:
            continue
        if _is_holiday_or_no_class_line(title):
            continue
        filtered.append(ev)

    return filtered


def generate_calendar(items: List[Dict[str, Any]], default_year: int) -> CalendarOutput:
    """
    Build calendar events strictly from explicit syllabus dates.

    Rules enforced:
    - Only explicit dated information is converted to calendar events.
    - Missing time defaults to 23:59.
    - Holiday/no-class dates are excluded.
    - No recurrence inference or weekly assumptions.
    """
    merged: List[Dict[str, Any]] = []
    for item in items:
        merged.extend(_extract_events_from_item(item, default_year))

    # Keep multiple events on same date; only remove exact duplicates.
    dedup: Dict[tuple, Dict[str, Any]] = {}
    for ev in merged:
        key = (
            (ev.get("course") or "").strip().lower(),
            (ev.get("title") or "").strip().lower(),
            (ev.get("type") or "").strip().lower(),
            (ev.get("due_date") or "").strip(),
            (ev.get("start_time") or "").strip(),
            (ev.get("end_time") or "").strip(),
        )
        dedup[key] = ev

    events = [CalendarEvent.model_validate(e) for e in dedup.values()]
    events.sort(
        key=lambda e: (
            e.due_date or "9999-12-31",
            e.start_time or "99:99",
            (e.course or "").lower(),
            (e.title or "").lower(),
        )
    )

    for e in events:
        e.timezone = "America/New_York"
        e.recurrence = None
        e.semester = None
        e.duration_weeks = None

    return CalendarOutput(events=events)
