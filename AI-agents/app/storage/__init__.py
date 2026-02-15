from __future__ import annotations

from app import config

# Choose storage backend based on configuration
if config.USE_LOCAL_STORAGE:
    from app.storage.local_store import (
        get_local_store as get_store,
        init_local_store as init_storage,
    )
    
    # Alias the methods to match MongoDB interface
    async def create_class(name: str) -> str:
        return await get_store().create_class(name)
    
    async def list_classes():
        return await get_store().list_classes()
    
    async def get_class(class_id: str):
        return await get_store().get_class(class_id)
    
    async def insert_file(class_id: str, file_type: str, filename: str, pdf_path: str, extracted_text_path: str) -> str:
        return await get_store().insert_file(class_id, file_type, filename, pdf_path, extracted_text_path)
    
    async def list_files(class_id: str, file_type=None):
        return await get_store().list_files(class_id, file_type)
    
    async def get_file(file_id: str):
        return await get_store().get_file(file_id)
    
    async def insert_chat_message(class_id: str, role: str, content: str, mode=None, metadata=None) -> str:
        return await get_store().insert_chat_message(class_id, role, content, mode, metadata)
    
    async def get_chat_history(class_id: str, limit: int = 50):
        return await get_store().get_chat_history(class_id, limit)
    
    async def clear_chat_history(class_id: str) -> int:
        return await get_store().clear_chat_history(class_id)
    
    async def init_mongo():
        """Compatibility alias for initialization."""
        await init_storage()

else:
    # Use MongoDB
    from app.storage.mongo import (
        create_class,
        list_classes,
        get_class,
        insert_file,
        list_files,
        get_file,
        insert_chat_message,
        get_chat_history,
        clear_chat_history,
        init_mongo,
    )

__all__ = [
    "create_class",
    "list_classes",
    "get_class",
    "insert_file",
    "list_files",
    "get_file",
    "insert_chat_message",
    "get_chat_history",
    "clear_chat_history",
    "init_mongo",
]
