## StudyForge

- **Backend (API):** See `AI-agents/README.md`. Run from `AI-agents`: `uvicorn app.main:app --reload --port 8080`. Requires MongoDB and OpenAI API key.
- **Frontend:** See below.

## How to run the frontend (Vite)
1. Go to `frontend/student-study-app`
2. Open terminal
3. Run `npm install` (only if first time)
4. Run `npm run dev`
5. Open the link in your browser (e.g. http://localhost:5173). Set `VITE_API_BASE_URL=http://localhost:8080` in `.env` so it talks to the backend.
