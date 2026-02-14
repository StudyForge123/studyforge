from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"service": "AI Agents", "status": "running"}

@app.get("/health")
def read_root():
    return {"ok" : True}