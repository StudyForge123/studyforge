from fastapi import APIRouter
from app.storage.mongo import list_classes

router = APIRouter(prefix="/api", tags=["dashboard"])

@router.get("/dashboard")
async def get_dashboard_stats():
    """
    Get statistics for the student dashboard.
    """
    classes = await list_classes()
    
    # In a real app, we'd query deadlines and sessions from the DB too.
    # For now, we mock them as 0 or static values.
    return {
        "activeClasses": len(classes),
        "upcomingDeadlines": 0,
        "scheduledSessions": 0
    }
