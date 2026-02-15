from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_calendar import router as calendar_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_chat import router as chat_router
from app.api.routes_quiz import router as quiz_router
from app.api.routes_study import router as study_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calendar_router)
app.include_router(dashboard_router)
app.include_router(chat_router)
app.include_router(quiz_router)
app.include_router(study_router)

@app.get("/health")
def health():
    return {"ok": True}
