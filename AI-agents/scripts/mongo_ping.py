import asyncio
from app.storage.mongo import get_client
from app import config

async def main():
    client = get_client()
    res = await client.admin.command("ping")
    print("PING_OK", res)
    print("DB", config.MONGO_DB)

if __name__ == "__main__":
    asyncio.run(main())
