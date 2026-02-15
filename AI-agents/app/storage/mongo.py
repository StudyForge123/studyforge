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

async def get_file(file_id: str) -> Optional[Dict[str, Any]]:
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(file_id)
    except Exception:
        return None
    d = await db.files.find_one({"_id": oid})
    if not d:
        return None
    d["id"] = str(d.pop("_id"))
    return d

# ---- Chat History ----

async def insert_chat_message(
    class_id: str,
    role: str,  # "user" | "assistant"
    content: str,
    mode: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    db = get_db()
    doc = {
        "class_id": class_id,
        "role": role,
        "content": content,
        "mode": mode,
        "metadata": metadata or {},
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    res = await db.chat_history.insert_one(doc)
    return str(res.inserted_id)

async def get_chat_history(
    class_id: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    db = get_db()
    cur = db.chat_history.find({"class_id": class_id}).sort("created_at", -1).limit(limit)
    out = []
    async for d in cur:
        d["id"] = str(d.pop("_id"))
        out.append(d)
    # Reverse to get chronological order
    return list(reversed(out))

async def clear_chat_history(class_id: str) -> int:
    db = get_db()
    result = await db.chat_history.delete_many({"class_id": class_id})
    return result.deleted_count
