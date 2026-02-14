import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SuperForge Backend"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"] # Add frontend URL

    # Cognito
    COGNITO_REGION: str = os.getenv("COGNITO_REGION", "us-east-1")
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "")
    COGNITO_APP_CLIENT_ID: str = os.getenv("COGNITO_APP_CLIENT_ID", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
