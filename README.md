<<<<<<< HEAD
<<<<<<< HEAD
## How to run vite for frontend
1. Go to `studyforge -> frontend -> student-study-app`
2. Open terminal 
3. run npm `install` (only if it is the first time)
4. run `npm dev`
5. ctrl + click the link or copy and paste the link in your browser

---

## How to run backend fast api
1. Go to `studyforge -> AI-agents`
2. Run `.venv/bin/activate`
3. Run `uvicorn app.main:app --reload`
=======
=======
>>>>>>> main
# StudyForge

StudyForge is an AI-assisted student learning platform that helps students organize classes, upload course PDFs, generate calendars from syllabi, chat with class materials, and create study sessions and practice quizzes grounded in uploaded documents.

This repository contains:
- A FastAPI backend (`AI-agents/`) for ingestion, storage, retrieval, and AI generation.
- A React + Vite frontend (`frontend/student-study-app/`) for the student UI.

## What The App Does

- Class management:
  - Create classes
  - List classes
  - Delete classes
- File management:
  - Upload PDF files by type (`syllabus`, `material`, `assessment`)
  - Enforce one syllabus per class
  - List files per class
  - Delete files
- Calendar generation:
  - Extracts dates/events from syllabus text
  - Includes deterministic extraction for weekly/date tables
  - Caches calendar events per class-set in MongoDB
- AI chat:
  - RAG-backed chat over indexed class materials
  - Optional file-scoped chat (use one selected file only)
- AI study session:
  - Generates slides + knowledge checks from class content
  - Optional file-scoped generation
- AI quiz generation:
  - Generates quiz questions with options/answers/explanations/source chunk IDs
  - Optional file-scoped generation
- Frontend UX features:
  - Dashboard statistics and navigation
  - Calendar with important deadlines highlighted
  - Expandable day-level calendar modal
  - Responsive layout + collapsible sidebar + collapsible prompt box
  - Voice input (speech-to-text) and optional voice reply (text-to-speech, browser dependent)

## Tech Stack

### Backend
- Language: Python 3.11+
- Framework: FastAPI
- Server: Uvicorn
- DB: MongoDB via Motor
- PDF parsing: `pypdf`
- Vector search: FAISS (`faiss-cpu`)
- AI SDK: OpenAI Python SDK (`openai`)

### Frontend
- Language: JavaScript
- Framework: React
- Build tool: Vite
- Styling: Tailwind CSS

### Infrastructure (optional/in-progress)
- Terraform files exist under `infrastructure/`.

## Models Used

Configured in `AI-agents/app/config.py`:
- Chat/generation model: `OPENAI_MODEL` (default: `gpt-4.1-mini`)
- Embeddings model: `OPENAI_EMBED_MODEL` (default: `text-embedding-3-large`)

Model usage:
- Chat: OpenAI Chat Completions API
- Quiz/Study/Calendar structured generation: OpenAI Responses API with Pydantic parsing
- Embeddings for vector DB: OpenAI Embeddings API

## High-Level Architecture

1. User uploads PDF to a class.
2. Backend extracts and normalizes text (`pdf_text.py`), preserving page markers.
3. Backend chunks text (`chunking.py`) and stores vectors + metadata in a FAISS index per class (`retrieval.py`).
4. File metadata is stored in MongoDB (`storage/mongo.py`).
5. For chat/quiz/study:
   - Query is embedded
   - Top chunks are retrieved from FAISS
   - Retrieved context is sent to the model
   - Structured or textual output is returned to frontend
6. For calendar:
   - Syllabus text is parsed by model + deterministic date extraction logic
   - Events are expanded/deduplicated
   - Cached in MongoDB for fast calendar reads

## Repository Layout

```text
studyforge/
  AI-agents/
    app/
      api/                 # FastAPI routes (classes/files/calendar/chat/quiz/study/dashboard)
      agents/              # AI generation logic (calendar, quiz, study)
      ingest/              # PDF extraction, chunking, vector retrieval
      schemas/             # Pydantic schemas
      storage/             # MongoDB access layer
      main.py              # FastAPI app entry
      config.py            # env-driven config
    requirements.txt
  frontend/
    student-study-app/
      src/
        components/        # Dashboard, Calendar, StudyQuiz, ClassChat, etc.
        api/client.js      # Frontend API client
      package.json
  README.md
```

## Data Storage

### MongoDB collections
- `classes`: class records
- `files`: uploaded file metadata and paths
- `chat_history`: user/assistant messages per class
- `calendar_cache`: generated event cache by class-set key

### Local filesystem
- Uploaded PDFs: `AI-agents/data/uploads/`
- Extracted text: `AI-agents/data/uploads/_extracted/`
- Vector index + metadata: `AI-agents/data/vector_db/` (`<class_id>.index`, `<class_id>.json`)

## API Overview

Base URL (default): `http://localhost:8000`

### Classes and files
- `POST /api/classes`
- `GET /api/classes`
- `DELETE /api/classes/{class_id}`
- `POST /api/classes/{class_id}/upload?file_type=syllabus|material|assessment`
- `GET /api/classes/{class_id}/files`
- `DELETE /api/classes/{class_id}/files/{file_id}`

### Calendar
- `POST /api/calendar/generate`
- `GET /api/calendar/events?class_ids=<comma-separated-ids>`

### Chat / Study / Quiz
- `POST /api/chat/send` (supports optional `file_id`)
- `GET /api/chat/history?class_id=<id>`
- `POST /api/study/session` (supports optional `file_id`)
- `POST /api/quiz/generate` (supports optional `file_id`)

### Dashboard and health
- `GET /api/dashboard`
- `GET /health`

## Local Setup

## 1) Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20+ recommended)
- MongoDB (local or remote)
- OpenAI API key

## 2) Backend setup

```bash
cd AI-agents
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `AI-agents/.env` with at least:

```env
APP_ENV=dev
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBED_MODEL=text-embedding-3-large
MONGO_URI=mongodb://localhost:27017
MONGO_DB=studyforge
```

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"ok": true}
```

## 3) Frontend setup

```bash
cd frontend/student-study-app
npm install
npm run dev
```

Open the printed local Vite URL in your browser.

Important: `src/api/client.js` currently points to `http://localhost:8000`.

## How Major Features Work

### PDF ingestion and indexing
- Upload endpoint saves PDF and extracts normalized text.
- Text is chunked with overlap and page markers.
- Chunks are embedded and added to FAISS index.
- Chunk metadata includes filename and file type for scoped retrieval.

### File-scoped generation
When `file_id` is provided in Chat/Study/Quiz requests:
- Backend validates file belongs to class.
- Retrieval filters chunks to that file's `filename`.
- Generated output is grounded only on selected file context.

### Calendar extraction strategy
The system combines:
- Model-based structured event extraction
- Deterministic extraction for dated lines and weekly table patterns
- Recurring expansion and deduplication

This improves recall for syllabus schedules that include "Week of" tables and dated rows.

### Important deadline coloring
Frontend calendar marks events as important (red) if they look like deadlines/exams/quizzes/assignments. Regular schedule entries remain in default calendar color.

## Frontend Interaction Notes

- Prompt composer is visible only on `Class Chat` and `Study & Quiz` tabs.
- Prompt composer can be collapsed/expanded at any time on those tabs.
- Calendar day cells are clickable to open a detailed event modal.
- Voice features rely on browser APIs:
  - SpeechRecognition / webkitSpeechRecognition (input)
  - `speechSynthesis` (spoken replies)

## Development Commands

Backend (from `AI-agents/`):

```bash
uvicorn app.main:app --reload --port 8000
```

Frontend (from `frontend/student-study-app/`):

```bash
npm run dev
npm run build
npm run preview
```

## Troubleshooting

- `MONGO_URI is not set`:
  - Ensure `AI-agents/.env` includes `MONGO_URI`
- `OPENAI_API_KEY is not set`:
  - Add key to `AI-agents/.env`
- Frontend cannot reach backend:
  - Verify backend is running on port `8000`
  - Verify `API_BASE` in `src/api/client.js`
- Upload fails for second syllabus:
  - Expected behavior: one syllabus per class
- Calendar not updated after upload:
  - Use `Generate Calendar` / `Reload Calendar`
- Voice input not working:
  - Browser may not support SpeechRecognition; use Chromium-based browser

## Security and Production Notes

Current setup is development-friendly and not production hardened. For production:
- Restrict CORS origins
- Add auth and per-user access control
- Add request rate limiting
- Store files in object storage (S3/GCS) instead of local disk
- Use managed vector DB or hardened local vector service
- Add background jobs for heavy ingestion
- Add tests and CI/CD checks
- Add observability (logs/metrics/tracing)

## Current Limitations

- No authentication/authorization yet
- Calendar extraction is strong but still depends on PDF text quality
- File-scoped retrieval filters by filename metadata; duplicate filenames across uploads can reduce precision
- Minimal automated test coverage in repository currently

## Suggested Next Improvements

1. Add auth and user accounts with per-user class isolation.
2. Add test suite for API routes and calendar extraction.
3. Add migration/versioning strategy for Mongo schemas.
4. Add richer file metadata and stable file-level retrieval keys.
5. Add streaming chat responses and realtime voice support.

<<<<<<< HEAD
>>>>>>> sulaiman
=======
>>>>>>> main
