from fastapi import FastAPI
from app import config  # noqa: F401

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True, "env": config.APP_ENV, "model": config.OPENAI_MODEL}
