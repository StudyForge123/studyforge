# StudyForge Backend (AI-agents)

## Running the backend
- From `AI-agents` (or project root): `uvicorn app.main:app --reload --port 8080`
- Health: `http://localhost:8080/health` → `{"ok": true}`
- Frontend expects API at `http://localhost:8080` (see `frontend/student-study-app/.env`).

## Syllabus → Calendar flow
1. Create a class (`POST /api/classes` with `{"name": "..."}`).
2. Upload a syllabus PDF (`POST /api/classes/{class_id}/upload/syllabus`).
3. Backend extracts text, stores it, and (for RAG) chunks and indexes it.
4. Generate calendar (`POST /api/calendar/generate` with `{"class_ids": ["..."], "default_year": 2025}`).
5. The calendar agent analyzes the syllabus text and extracts events (assignments, projects, quizzes, exams, readings, deadlines) with `due_date` in YYYY-MM-DD; events are cached and returned.
6. Get cached events: `GET /api/calendar?class_ids=id1,id2&default_year=2025`.

Upload and text paths are stored as absolute so the server can be run from any working directory.

## Other features
- **Quiz** and **Study Session**: require class PDFs (syllabus/material/assessment); they use the same RAG index.
- **Chat**: per-class history stored in MongoDB.

## Running pdf_text locally
- `python -c "from app.ingest.pdf_text import extract_pdf_text_with_markers; print(extract_pdf_text_with_markers('data/uploads/test.pdf')[:1200])"` (run from `AI-agents` if using relative path)
