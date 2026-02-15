from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # [!code ++]
from app.api.routes_calendar import router as calendar_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_chat import router as chat_router

app = FastAPI()

# [!code ++]
# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calendar_router)
app.include_router(dashboard_router)
app.include_router(chat_router)

@app.get("/health")
def health():
    return {"ok": True}