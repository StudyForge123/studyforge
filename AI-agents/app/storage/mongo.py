from __future__ import annotations

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app import config

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(config.MONGO_URI)
    return _client

def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[config.MONGO_DB]
    return _db

async def init_mongo() -> None:
    db = get_db()
    # Indexes for quick lookup
    await db.classes.create_index("created_at")
    await db.files.create_index([("class_id", 1), ("file_type", 1), ("created_at", -1)])
    await db.chunks.create_index([("class_id", 1)])
    await db.chat_messages.create_index([("class_id", 1), ("created_at", 1)])
    await db.calendar_events.create_index([("class_ids", 1), ("default_year", 1)])

# ---- Classes ----

async def create_class(name: str) -> str:
    db = get_db()
    doc = {"name": name, "created_at": __import__("datetime").datetime.utcnow()}
    res = await db.classes.insert_one(doc)
    return str(res.inserted_id)

async def list_classes() -> List[Dict[str, Any]]:
    db = get_db()
    cur = db.classes.find({}, {"name": 1, "created_at": 1}).sort("created_at", -1)
    out = []
    async for d in cur:
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out

async def get_class(class_id: str) -> Optional[Dict[str, Any]]:
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(class_id)
    except Exception:
        return None
    d = await db.classes.find_one({"_id": oid})
    if not d:
        return None
    d["id"] = str(d.pop("_id"))
    return d

# ---- Files ----

async def insert_file(
    class_id: str,
    file_type: str,
    filename: str,
    pdf_path: str,
    extracted_text_path: str,
) -> str:
    db = get_db()
    doc = {
        "class_id": class_id,
        "file_type": file_type,   # syllabus | material | assessment
        "filename": filename,
        "pdf_path": pdf_path,
        "extracted_text_path": extracted_text_path,
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    res = await db.files.insert_one(doc)
    return str(res.inserted_id)

async def list_files(class_id: str, file_type: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_db()
    q: Dict[str, Any] = {"class_id": class_id}
    if file_type:
        q["file_type"] = file_type

    cur = db.files.find(q).sort("created_at", -1)
    out = []
    async for d in cur:
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out


# ---- Chunks (for RAG) ----

async def insert_chunks(class_id: str, chunks: List[Dict[str, Any]]) -> None:
    """Insert or replace chunks for a class. Each chunk has chunk_id, text, page_start, page_end, file_id."""
    db = get_db()
    await db.chunks.delete_many({"class_id": class_id})
    if not chunks:
        return
    import datetime
    docs = [
        {"class_id": class_id, "chunk_id": c["chunk_id"], "text": c["text"], "page_start": c.get("page_start"), "page_end": c.get("page_end"), "file_id": c.get("file_id"), "created_at": datetime.datetime.utcnow()}
        for c in chunks
    ]
    await db.chunks.insert_many(docs)


async def get_chunks_by_ids(class_id: str, chunk_ids: List[str]) -> List[Dict[str, Any]]:
    db = get_db()
    out = []
    async for d in db.chunks.find({"class_id": class_id, "chunk_id": {"$in": chunk_ids}}):
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out


async def get_all_chunks_map(class_id: str) -> Dict[str, Dict[str, Any]]:
    """Return dict chunk_id -> {text, page_start, page_end, file_id} for RAG retrieval."""
    db = get_db()
    out = {}
    async for d in db.chunks.find({"class_id": class_id}):
        cid = d.get("chunk_id")
        if cid:
            out[cid] = {"text": d.get("text", ""), "page_start": d.get("page_start"), "page_end": d.get("page_end"), "file_id": d.get("file_id")}
    return out


# ---- Chat ----

async def add_chat_message(class_id: str, role: str, content: str, session_id: Optional[str] = None) -> str:
    import datetime
    db = get_db()
    sid = session_id or "default"
    doc = {"class_id": class_id, "session_id": sid, "role": role, "content": content, "created_at": datetime.datetime.utcnow()}
    res = await db.chat_messages.insert_one(doc)
    return str(res.inserted_id)


async def get_chat_history(class_id: str, session_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    db = get_db()
    q: Dict[str, Any] = {"class_id": class_id}
    if session_id:
        q["session_id"] = session_id
    cur = db.chat_messages.find(q).sort("created_at", 1)
    out = []
    async for d in cur:
        if len(out) >= limit:
            break
        d["id"] = str(d.pop("_id"))
        out.append({"role": d["role"], "content": d["content"], "created_at": d["created_at"].isoformat() if hasattr(d["created_at"], "isoformat") else str(d["created_at"])})
    return out


# ---- Calendar cache ----

async def save_calendar_events(class_ids: List[str], default_year: int, events: List[Dict[str, Any]]) -> None:
    db = get_db()
    key = sorted(class_ids)
    await db.calendar_events.delete_many({"class_ids": key, "default_year": default_year})
    if not events:
        return
    import datetime
    await db.calendar_events.insert_one({"class_ids": key, "default_year": default_year, "events": events, "updated_at": datetime.datetime.utcnow()})


async def get_calendar_events(class_ids: List[str], default_year: int) -> List[Dict[str, Any]]:
    db = get_db()
    key = sorted(class_ids)
    doc = await db.calendar_events.find_one({"class_ids": key, "default_year": default_year}, sort=[("updated_at", -1)])
    return doc["events"] if doc else []
