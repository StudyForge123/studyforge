from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.auth import get_current_user

app = FastAPI(title=settings.PROJECT_NAME)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to SuperForge Backend"}

# Example protected route
@app.get("/api/me")
def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user.get("sub"), "username": current_user.get("username")}
