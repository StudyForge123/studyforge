from __future__ import annotations

from fastapi import APIRouter
from app.storage.mongo import list_classes, get_calendar_events
from datetime import datetime

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
async def api_dashboard():
    classes = await list_classes()
    year = datetime.now().year
    all_events = []
    for c in classes:
        cid = c.get("id")
        if cid:
            events = await get_calendar_events([cid], year)
            all_events.extend(events)
    # Dedupe by title+date; count upcoming (due_date >= today)
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming = [e for e in all_events if e.get("due_date", "") >= today]
    return {
        "activeClasses": len(classes),
        "upcomingDeadlines": len(upcoming),
        "scheduledSessions": len(upcoming),  # MVP: use same count
    }
