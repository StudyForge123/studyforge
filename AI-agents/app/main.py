from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_calendar import router as calendar_router
from app.api.routes_files import router as files_router
from app.api.routes_quiz import router as quiz_router
from app.api.routes_study import router as study_router
from app.api.routes_chat import router as chat_router

app = FastAPI(title="StudyForge API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(calendar_router)
app.include_router(files_router)
app.include_router(quiz_router)
app.include_router(study_router)
app.include_router(chat_router)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/dashboard")
def get_dashboard():
    """Dashboard stats endpoint (placeholder for MVP)."""
    return {
        "activeClasses": 0,
        "upcomingDeadlines": 0,
        "scheduledSessions": 0,
    }
