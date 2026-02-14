from fastapi import FastAPI
from app.api.routes_calendar import router as calendar_router

app = FastAPI()
app.include_router(calendar_router)

@app.get("/health")
def health():
    return {"ok": True}
