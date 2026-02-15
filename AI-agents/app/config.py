import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present (local dev)
load_dotenv()

APP_ENV = os.getenv("APP_ENV", "dev")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "studyforge")
DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
# Fail fast if missing key
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Put it in AI-agents/.env or export it in your shell.")
