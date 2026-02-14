## Running the backend
- run `uvicorn app.main:app --reload --port 8001`
- check health at `http://localhost:8001/health`
- you should see `{"ok": true, "env": "dev", "model": "gpt-4.1-mini"}`
