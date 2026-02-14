from fastapi import APIRouter, Depends
from ...core.auth import get_current_user
from ...db.memory import db
from ...models.schemas import DashboardStats

router = APIRouter()

@router.get("/", response_model=DashboardStats)
def get_dashboard(current_user: dict = Depends(get_current_user)):
    return db.get_dashboard_stats()
