from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid


class LocalStore:
    """
    Simple file-based storage for local MVP when MongoDB is not available.
    """
    
    def __init__(self, storage_dir: Path = Path("data/local_db")):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.classes_file = self.storage_dir / "classes.json"
        self.files_file = self.storage_dir / "files.json"
        self.chat_file = self.storage_dir / "chat_history.json"
        
        # Initialize files if they don't exist
        for f in [self.classes_file, self.files_file, self.chat_file]:
            if not f.exists():
                f.write_text("[]")
    
    def _load_json(self, path: Path) -> List[Dict[str, Any]]:
        return json.loads(path.read_text())
    
    def _save_json(self, path: Path, data: List[Dict[str, Any]]):
        path.write_text(json.dumps(data, indent=2, default=str))
    
    # ---- Classes ----
    
    async def create_class(self, name: str) -> str:
        classes = self._load_json(self.classes_file)
        class_id = str(uuid.uuid4())
        classes.append({
            "id": class_id,
            "name": name,
            "created_at": datetime.utcnow().isoformat()
        })
        self._save_json(self.classes_file, classes)
        return class_id
    
    async def list_classes(self) -> List[Dict[str, Any]]:
        return self._load_json(self.classes_file)
    
    async def get_class(self, class_id: str) -> Optional[Dict[str, Any]]:
        classes = self._load_json(self.classes_file)
        for c in classes:
            if c["id"] == class_id:
                return c
        return None
    
    # ---- Files ----
    
    async def insert_file(
        self,
        class_id: str,
        file_type: str,
        filename: str,
        pdf_path: str,
        extracted_text_path: str,
    ) -> str:
        files = self._load_json(self.files_file)
        file_id = str(uuid.uuid4())
        files.append({
            "id": file_id,
            "class_id": class_id,
            "file_type": file_type,
            "filename": filename,
            "pdf_path": pdf_path,
            "extracted_text_path": extracted_text_path,
            "created_at": datetime.utcnow().isoformat()
        })
        self._save_json(self.files_file, files)
        return file_id
    
    async def list_files(
        self, 
        class_id: str, 
        file_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        files = self._load_json(self.files_file)
        result = [f for f in files if f["class_id"] == class_id]
        if file_type:
            result = [f for f in result if f["file_type"] == file_type]
        # Sort by created_at descending
        result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return result
    
    async def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        files = self._load_json(self.files_file)
        for f in files:
            if f["id"] == file_id:
                return f
        return None
    
    # ---- Chat History ----
    
    async def insert_chat_message(
        self,
        class_id: str,
        role: str,
        content: str,
        mode: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        messages = self._load_json(self.chat_file)
        msg_id = str(uuid.uuid4())
        messages.append({
            "id": msg_id,
            "class_id": class_id,
            "role": role,
            "content": content,
            "mode": mode,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        })
        self._save_json(self.chat_file, messages)
        return msg_id
    
    async def get_chat_history(
        self,
        class_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        messages = self._load_json(self.chat_file)
        result = [m for m in messages if m["class_id"] == class_id]
        # Sort by created_at ascending (chronological)
        result.sort(key=lambda x: x.get("created_at", ""))
        return result[-limit:] if limit else result
    
    async def clear_chat_history(self, class_id: str) -> int:
        messages = self._load_json(self.chat_file)
        original_count = len(messages)
        messages = [m for m in messages if m["class_id"] != class_id]
        self._save_json(self.chat_file, messages)
        return original_count - len(messages)


# Global instance
_local_store: Optional[LocalStore] = None


def get_local_store() -> LocalStore:
    global _local_store
    if _local_store is None:
        _local_store = LocalStore()
    return _local_store


async def init_local_store():
    """Initialize local store (no-op for file-based storage)."""
    get_local_store()
