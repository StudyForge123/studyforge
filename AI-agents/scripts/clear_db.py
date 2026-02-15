import asyncio
from app.storage.mongo import init_mongo, get_db

async def clear_database():
    print("Connecting to MongoDB...")
    await init_mongo()
    db = get_db()
    
    print("Clearing 'classes' collection...")
    result_classes = await db.classes.delete_many({})
    print(f"Deleted {result_classes.deleted_count} classes.")
    
    print("Clearing 'files' collection...")
    result_files = await db.files.delete_many({})
    print(f"Deleted {result_files.deleted_count} files.")
    
    print("Database cleared successfully.")

if __name__ == "__main__":
    asyncio.run(clear_database())
