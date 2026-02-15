import os
from dotenv import load_dotenv

# Load .env if present (local dev)
load_dotenv()

APP_ENV = os.getenv("APP_ENV", "dev")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")

# Storage: use local file-based storage if MongoDB is not configured
USE_LOCAL_STORAGE = os.getenv("USE_LOCAL_STORAGE", "true").lower() in ("true", "1", "yes")
MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB = os.getenv("MONGO_DB", "studyforge")

# Fail fast if missing key
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Put it in AI-agents/.env or export it in your shell.")
