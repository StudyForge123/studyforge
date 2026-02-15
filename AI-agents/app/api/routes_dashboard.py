from datetime import date
from fastapi import APIRouter
from app.storage.mongo import list_classes, get_calendar_events

router = APIRouter(prefix="/api", tags=["dashboard"])

def _is_upcoming(ev) -> bool:
    raw = (ev.get("due_date") or ev.get("date") or "").strip()
    if not raw:
        return False
    try:
        ev_date = date.fromisoformat(raw[:10])
    except Exception:
        return False
    return ev_date >= date.today()

def _is_deadline(ev) -> bool:
    event_type = (ev.get("type") or "").lower()
    title = (ev.get("title") or ev.get("name") or "").lower()
    if event_type in {"assignment", "quiz", "exam", "project"}:
        return True
    keywords = ["deadline", "due", "drop", "withdraw", "midterm", "final", "last day"]
    return any(k in title for k in keywords)

def _is_session(ev) -> bool:
    title = (ev.get("title") or ev.get("name") or "").lower()
    session_keywords = ["class time", "office hour", "lecture", "lab", "discussion", "study session"]
    return bool(ev.get("start_time")) or any(k in title for k in session_keywords)

@router.get("/dashboard")
async def get_dashboard():
    classes = await list_classes()
    if not classes:
        return {
            "activeClasses": 0,
            "upcomingDeadlines": 0,
            "scheduledSessions": 0,
        }

    sorted_ids = sorted([c["id"] for c in classes if c.get("id")])
    class_ids_key = ",".join(sorted_ids)
    events = await get_calendar_events(class_ids_key) or []
    upcoming = [ev for ev in events if _is_upcoming(ev)]
    upcoming_deadlines = len([ev for ev in upcoming if _is_deadline(ev)])
    scheduled_sessions = len([ev for ev in upcoming if _is_session(ev)])

    return {
        "activeClasses": len(classes),
        "upcomingDeadlines": upcoming_deadlines,
        "scheduledSessions": scheduled_sessions,
    }
