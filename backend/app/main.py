from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.auth import get_current_user

# Import Endpoints
from .api.endpoints import dashboard, classes, calendar, chat

app = FastAPI(title=settings.PROJECT_NAME)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS, # Check if this list covers localhost:5173
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to SuperForge Backend"}

# Include Routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(classes.router, prefix="/api/classes", tags=["classes"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
# Placeholder for quiz and study if you want to add them later or now
# app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"]) 
# app.include_router(study.router, prefix="/api/study", tags=["study"])
