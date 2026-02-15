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

async def delete_class_data(class_id: str) -> Dict[str, Any]:
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(class_id)
    except Exception:
        return {"class_deleted": False, "files_deleted": 0, "chat_deleted": 0}

    class_res = await db.classes.delete_one({"_id": oid})
    files_res = await db.files.delete_many({"class_id": class_id})
    chat_res = await db.chat_history.delete_many({"class_id": class_id})
    return {
        "class_deleted": class_res.deleted_count > 0,
        "files_deleted": files_res.deleted_count,
        "chat_deleted": chat_res.deleted_count,
    }

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

async def delete_file(file_id: str, class_id: str) -> Optional[Dict[str, Any]]:
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(file_id)
    except Exception:
        return None

    deleted = await db.files.find_one_and_delete({"_id": oid, "class_id": class_id})
    if not deleted:
        return None
    deleted["id"] = str(deleted.pop("_id"))
    return deleted

async def get_file(file_id: str, class_id: str) -> Optional[Dict[str, Any]]:
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(file_id)
    except Exception:
        return None

    d = await db.files.find_one({"_id": oid, "class_id": class_id})
    if not d:
        return None
    d["id"] = str(d.pop("_id"))
    return d

# ---- Chat History ----

async def save_chat_message(class_id: str, role: str, message: str) -> None:
    db = get_db()
    doc = {
        "class_id": class_id,
        "role": role,  # user | assistant
        "message": message,
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    await db.chat_history.insert_one(doc)

async def list_chat_history(class_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    db = get_db()
    cur = db.chat_history.find({"class_id": class_id}).sort("created_at", 1).limit(limit)
    out = []
    async for d in cur:
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out

# ---- Calendar Caching ----

async def save_calendar_events(class_ids_key: str, events: List[Dict[str, Any]]) -> None:
    db = get_db()
    await db.calendar_cache.update_one(
        {"class_ids_key": class_ids_key},
        {"$set": {"events": events, "updated_at": __import__("datetime").datetime.utcnow()}},
        upsert=True
    )

async def get_calendar_events(class_ids_key: str) -> Optional[List[Dict[str, Any]]]:
    db = get_db()
    doc = await db.calendar_cache.find_one({"class_ids_key": class_ids_key})
    return doc["events"] if doc else None
