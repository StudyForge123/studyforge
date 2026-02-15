# StudyForge MVP – Local Testing Guide

This guide gives **exact terminal commands** and **expected outcomes** to verify every feature locally.

---

## Prerequisites

- **Python 3.10+** with venv
- **Node.js 18+** and npm
- **MongoDB** running locally (e.g. `mongod` on port 27017)
- **OpenAI API key** in `AI-agents/.env`

---

## 1. Environment setup

### Backend

```bash
cd c:\Users\techg\superforge\AI-agents
```

Create `.env` from example (if not exists):

```bash
copy .env.example .env
```

Edit `.env` and set:

- `OPENAI_API_KEY=<your key>`
- `MONGO_URI=mongodb://localhost:27017` (local MVP)

Create venv and install deps:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Expected:** No errors; `motor`, `faiss-cpu`, `openai`, `fastapi`, `uvicorn` installed.

### Frontend

```bash
cd c:\Users\techg\superforge\frontend\student-study-app
```

Ensure `.env` contains:

```
VITE_API_BASE_URL=http://localhost:8080
```

Install deps:

```bash
npm install
```

**Expected:** No errors.

---

## 2. Start backend and frontend

### Terminal 1 – Backend

```bash
cd c:\Users\techg\superforge\AI-agents
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8080
```

**Expected output (similar to):**

```
INFO:     Uvicorn running on http://127.0.0.1:8080
INFO:     Application startup complete.
```

### Terminal 2 – Frontend

```bash
cd c:\Users\techg\superforge\frontend\student-study-app
npm run dev
```

**Expected:** Vite dev server on `http://localhost:5173`. Open that URL in a browser.

---

## 3. Health check

```bash
curl -s http://localhost:8080/health
```

**Expected:** `{"ok":true}`

---

## 4. Multi-class support

### Create two classes

```bash
curl -s -X POST http://localhost:8080/api/classes -H "Content-Type: application/json" -d "{\"name\":\"CS 101\"}"
curl -s -X POST http://localhost:8080/api/classes -H "Content-Type: application/json" -d "{\"name\":\"Math 201\"}"
```

**Expected:** Each returns `{"class_id":"<objectid>"}`.

### List classes

```bash
curl -s http://localhost:8080/api/classes
```

**Expected:** JSON with `"classes":[{ "id":"...", "name":"CS 101", ... }, { "id":"...", "name":"Math 201", ... }]`.

### Get one class

```bash
curl -s "http://localhost:8080/api/classes/<CLASS_ID>"
```

Replace `<CLASS_ID>` with one of the returned IDs. **Expected:** `{"id":"...","name":"CS 101",...}`.

---

## 5. Upload PDFs (syllabus / material / assessment)

Replace `<CLASS_ID>` with a real class ID from step 4.

### Upload syllabus

```bash
curl -s -X POST http://localhost:8080/api/classes/<CLASS_ID>/upload/syllabus -F "file=@path/to/your/syllabus.pdf"
```

**Expected:** `{"file_id":"...","pdf_path":"...","text_path":"..."}`. Backend extracts text, chunks, embeds, and builds FAISS index for that class.

### Upload material

```bash
curl -s -X POST http://localhost:8080/api/classes/<CLASS_ID>/upload/material -F "file=@path/to/lecture.pdf"
```

**Expected:** Same shape; class index is re-built to include the new PDF.

### Upload assessment (optional)

```bash
curl -s -X POST http://localhost:8080/api/classes/<CLASS_ID>/upload/assessment -F "file=@path/to/past_quiz.pdf"
```

**Expected:** Same shape.

### List files for a class

```bash
curl -s "http://localhost:8080/api/classes/<CLASS_ID>/files"
```

**Expected:** `{"files":[{ "id":"...", "file_type":"syllabus", "filename":"...", ... }, ...]}`.

---

## 6. Calendar (multi-class)

### Generate calendar (one or many classes)

Use two class IDs from step 4 (at least one must have a syllabus uploaded).

```bash
curl -s -X POST http://localhost:8080/api/calendar/generate -H "Content-Type: application/json" -d "{\"class_ids\":[\"<CLASS_ID_1>\",\"<CLASS_ID_2>\"],\"default_year\":2025}"
```

**Expected:** JSON with `"events":[{ "title":"...", "course":"...", "type":"assignment"|"exam"|..., "due_date":"YYYY-MM-DD", "timezone":"America/New_York", "source":{ "filename":"..." }, ... }, ...]`. If syllabi have no explicit dates, events may be empty.

### Get cached calendar

```bash
curl -s "http://localhost:8080/api/calendar?class_ids=<CLASS_ID_1>,<CLASS_ID_2>&default_year=2025"
```

**Expected:** `{"events":[...]}` (same events as last generate for that set of classes and year).

---

## 7. Quiz generator

Requires a class that has at least one PDF uploaded (so FAISS index exists).

```bash
curl -s -X POST http://localhost:8080/api/quiz/generate -H "Content-Type: application/json" -d "{\"class_id\":\"<CLASS_ID>\",\"num_questions\":3,\"difficulty\":\"medium\",\"topic\":\"intro\"}"
```

**Expected:** JSON with `"questions":[{ "question":"...", "options":[...] or null, "answer":"...", "explanation":"...", "source_chunk_ids":["..."] }, ...]`. Explanation should reference the retrieved context.

If you get `400 No PDFs indexed` or `400 No relevant chunks`, upload a syllabus/material PDF for that class first and retry.

---

## 8. Study session

Same class with indexed PDFs.

```bash
curl -s -X POST http://localhost:8080/api/study/session -H "Content-Type: application/json" -d "{\"class_id\":\"<CLASS_ID>\",\"topic\":\"key concepts\"}"
```

**Expected:** JSON with:

- `"slides":[{ "title":"...", "bullets":["...", ...], "speaker_notes":"..." }, ...]`
- `"knowledge_checks":[{ "question":"...", "answer":"...", "explanation":"...", "source_chunk_ids":["..."] }, ...]`

---

## 9. Chat (persistent per class)

### Send a message

```bash
curl -s -X POST http://localhost:8080/api/chat/send -H "Content-Type: application/json" -d "{\"class_id\":\"<CLASS_ID>\",\"message\":\"When is the midterm?\"}"
```

**Expected:** `{"reply":"..."}`. MVP reply is a placeholder; message is stored.

### Get history

```bash
curl -s "http://localhost:8080/api/chat/history?class_id=<CLASS_ID>"
```

**Expected:** `{"class_id":"...","messages":[{ "role":"user", "content":"When is the midterm?", "created_at":"..." }, { "role":"assistant", "content":"...", "created_at":"..." }, ...]}`.

---

## 10. Dashboard

```bash
curl -s http://localhost:8080/api/dashboard
```

**Expected:** `{"activeClasses":<n>, "upcomingDeadlines":<n>, "scheduledSessions":<n>}`.

---

## 11. Verify in the UI

1. **Dashboard:** Add class (name only). Click “Refresh Calendar” (generates for all classes, then open Calendar).
2. **All Classes:** Expand a class; upload Syllabus / Material / Assessment PDFs; click “Generate calendar (this class)”.
3. **Calendar:** View month; events appear on days matching `due_date` (after at least one generate).
4. **Quiz:** Select class, set # questions and difficulty, optional topic → “Generate Quiz”; expand “Show answer” for each question.
5. **Study Session:** Select class, optional topic → “Start Study Session”; see slides and knowledge checks.
6. **Chat:** Select class in the bottom bar, type message, Send; open “Chat” in nav to see history for that class.

---

## 12. Troubleshooting

| Issue | Check |
|-------|--------|
| `MONGO_URI` / connection errors | MongoDB running: `mongod` or Docker with port 27017. |
| `OPENAI_API_KEY` not set | `AI-agents/.env` has valid key. |
| 400 No PDFs indexed | Upload at least one syllabus or material PDF for that class; wait for reindex. |
| 400 No relevant chunks | Try a broader topic or ensure PDFs have text (not only images). |
| CORS errors in browser | Backend CORS allows `http://localhost:5173`; frontend `.env` points to `http://localhost:8080`. |
| Calendar empty | Call `POST /api/calendar/generate` with class IDs that have syllabi; then `GET /api/calendar` or reload Calendar page. |

---

## Summary of API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/api/classes` | Create class `{ "name": "..." }` |
| GET | `/api/classes` | List classes |
| GET | `/api/classes/{id}` | Get class |
| POST | `/api/classes/{id}/upload/syllabus` | Upload syllabus PDF (multipart) |
| POST | `/api/classes/{id}/upload/material` | Upload material PDF |
| POST | `/api/classes/{id}/upload/assessment` | Upload assessment PDF |
| GET | `/api/classes/{id}/files` | List files (optional `?file_type=`) |
| POST | `/api/calendar/generate` | Generate calendar `{ "class_ids": [...], "default_year": 2025 }` |
| GET | `/api/calendar` | Get cached events `?class_ids=id1,id2&default_year=2025` |
| POST | `/api/quiz/generate` | Generate quiz (class_id, num_questions, difficulty, topic, instructions) |
| POST | `/api/study/session` | Study session (class_id, topic, question) |
| POST | `/api/chat/send` | Send message `{ "class_id", "message", "session_id"? }` |
| GET | `/api/chat/history` | Get history `?class_id=...&session_id=...&limit=100` |
| GET | `/api/dashboard` | Dashboard stats |
