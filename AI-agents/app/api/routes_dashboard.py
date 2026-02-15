from fastapi import APIRouter
from app.storage.mongo import list_classes

router = APIRouter(prefix="/api", tags=["dashboard"])

@router.get("/dashboard")
async def get_dashboard():
    classes = await list_classes()
    # Mock stats based on real data
    return {
        "activeClasses": len(classes),
        "upcomingDeadlines": 2, # Mock
        "scheduledSessions": 5, # Mock
    }
