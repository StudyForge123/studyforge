# StudyForge MVP - Local Testing Guide

This guide provides step-by-step instructions to test all features of the StudyForge MVP locally.

## Prerequisites

1. **MongoDB** - Running instance (local or MongoDB Atlas)
2. **Python 3.8+** - For backend
3. **Node.js 16+** - For frontend
4. **OpenAI API Key** - For AI features

---

## Step 1: Environment Setup

### Backend Configuration

1. Navigate to the backend directory:
```bash
cd AI-agents
```

2. Create and activate virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

5. Edit `AI-agents/.env` with your credentials:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBED_MODEL=text-embedding-3-large
APP_ENV=dev
MONGO_URI=mongodb://localhost:27017
MONGO_DB=studyforge
```

### Frontend Configuration

The frontend `.env` is already configured:
```bash
VITE_API_BASE_URL=http://localhost:8001
```

---

## Step 2: Start Services

### Terminal 1 - Start MongoDB (if using local MongoDB)
```bash
mongod --dbpath /path/to/your/data/db
```

Or use MongoDB Atlas (cloud) by setting `MONGO_URI` in `.env` to your Atlas connection string.

### Terminal 2 - Start Backend
```bash
cd AI-agents
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify Backend Health:**
```bash
curl http://localhost:8001/health
```

**Expected Response:**
```json
{"ok": true}
```

### Terminal 3 - Start Frontend
```bash
cd frontend/student-study-app
npm install  # First time only
npm run dev
```

**Expected Output:**
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

Open browser to: **http://localhost:5173**

---

## Step 3: Test Core Features

### 3.1 Multi-Class Management

#### Create Classes

1. Click **"+ Add Class"** button in Dashboard
2. Fill in the form:
   - Name: `Introduction to Biology`
   - Professor: `Dr. Smith`
   - Semester: `Spring 2026`
3. Click **"Create Class"**

**Expected Result:** Class appears in Dashboard and "All Classes" page

Repeat to create 2-3 more classes for testing multi-class features.

#### API Test (Optional)
```bash
curl -X POST http://localhost:8001/api/classes \
  -H "Content-Type: application/json" \
  -d '{"name": "Computer Science 101", "professor": "Dr. Johnson", "semester": "Spring 2026"}'
```

**Expected Response:**
```json
{"class_id": "507f1f77bcf86cd799439011"}
```

#### List Classes
```bash
curl http://localhost:8001/api/classes
```

**Expected Response:**
```json
{
  "classes": [
    {
      "id": "...",
      "name": "Introduction to Biology",
      "professor": "Dr. Smith",
      "semester": "Spring 2026",
      "created_at": "2026-02-15T10:30:00Z"
    }
  ]
}
```

---

### 3.2 PDF Upload & Indexing

#### Upload via UI

1. Go to **"All Classes"** page
2. Click on a class card
3. You'll see three upload sections:
   - **Syllabus** - Upload course syllabus PDF
   - **Class Materials** - Upload lecture slides, notes
   - **Past Assessments** - Upload old quizzes/exams

4. Click **"Upload PDF"** in the Syllabus section
5. Select a PDF file (must be `.pdf`)

**Expected Result:**
- Upload progress indicator
- File appears in the list with filename and date
- Success message (no errors)

6. Upload 2-3 materials PDFs
7. Upload 1-2 assessment PDFs

**Note:** Materials and assessments are automatically:
- Chunked into smaller pieces
- Embedded using OpenAI
- Indexed in FAISS for retrieval

#### Upload via API

**Upload Syllabus:**
```bash
curl -X POST http://localhost:8001/api/classes/{CLASS_ID}/upload/syllabus \
  -F "file=@/path/to/syllabus.pdf"
```

**Expected Response:**
```json
{
  "file_id": "507f1f77bcf86cd799439022",
  "pdf_path": "data/uploads/class_{CLASS_ID}__syllabus__syllabus.pdf",
  "text_path": "data/uploads/_extracted/class_{CLASS_ID}__syllabus__syllabus.pdf.txt",
  "chunks_indexed": false
}
```

**Upload Material (auto-indexed):**
```bash
curl -X POST http://localhost:8001/api/classes/{CLASS_ID}/upload/material \
  -F "file=@/path/to/lecture1.pdf"
```

**Expected Response:**
```json
{
  "file_id": "...",
  "pdf_path": "...",
  "text_path": "...",
  "chunks_indexed": true
}
```

#### Verify Indexing

Check that vector store was created:
```bash
ls -la data/vector_store/{CLASS_ID}/
```

**Expected Files:**
- `index.faiss` - FAISS index file
- `metadata.json` - Chunk metadata

---

### 3.3 Calendar Generation (Multi-Class)

#### Generate Calendar via UI

1. Go to **Dashboard**
2. Click **"Refresh Calendar"** button
3. System generates calendar from ALL classes with syllabi

**Expected Result:**
- Redirects to Calendar page
- Shows events from all syllabi in calendar grid
- Events include: assignments, exams, quizzes, readings, projects

#### Generate Calendar via API

```bash
curl -X POST http://localhost:8001/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{
    "class_ids": ["CLASS_ID_1", "CLASS_ID_2"],
    "default_year": 2026
  }'
```

**Expected Response:**
```json
{
  "events": [
    {
      "title": "Midterm Exam",
      "course": "Introduction to Biology",
      "type": "exam",
      "due_date": "2026-03-15",
      "start_time": "10:00",
      "end_time": "11:30",
      "timezone": "America/New_York",
      "source": {
        "filename": "bio_syllabus.pdf",
        "page_hint": "3"
      }
    }
  ]
}
```

**Verify:**
- Events from multiple classes are merged
- Dates are in ISO format (YYYY-MM-DD)
- All events have source references

---

### 3.4 Quiz Generation (RAG-powered)

#### Generate Quiz via UI

1. Go to **"Quiz"** page
2. Select a class (must have materials uploaded)
3. Configure:
   - Number of Questions: `5`
   - Difficulty: `medium`
   - Topic: `cell structure` (optional)
4. Click **"Generate Quiz"**

**Expected Result:**
- Loading indicator appears
- Quiz questions display with:
  - Question text
  - Multiple choice options (if applicable)
  - Answer (when "Show Answers" clicked)
  - Explanation grounded in source material
  - Source chunk IDs for traceability

**Error Case:** If no materials uploaded:
```
Error: No materials indexed for this class. Please upload materials or assessment PDFs first.
```

#### Generate Quiz via API

```bash
curl -X POST http://localhost:8001/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CLASS_ID",
    "num_questions": 5,
    "difficulty": "medium",
    "topic": "photosynthesis"
  }'
```

**Expected Response:**
```json
{
  "questions": [
    {
      "question": "What is the primary function of chlorophyll in photosynthesis?",
      "options": [
        "A) Absorb light energy",
        "B) Store glucose",
        "C) Release oxygen",
        "D) Break down water"
      ],
      "answer": "A) Absorb light energy",
      "explanation": "According to the lecture notes on page 12, chlorophyll is the green pigment that absorbs light energy, primarily in the red and blue wavelengths, which is then used to drive the photosynthetic reactions.",
      "source_chunk_ids": ["CLASS_ID_FILE_ID_chunk_0042"]
    }
  ],
  "topic": "photosynthesis",
  "difficulty": "medium"
}
```

**Verify:**
- Questions are relevant to uploaded materials
- Explanations reference actual content from PDFs
- No hallucinated information

---

### 3.5 Study Session Generation (RAG-powered)

#### Create Study Session via UI

1. Go to **"Study Session"** page
2. Select a class (must have materials uploaded)
3. Enter topic: `DNA replication process`
4. Click **"Start Study Session"**

**Expected Result:**
- Slide-style presentation appears
- 3-5 slides with:
  - Clear title
  - 3-5 bullet points per slide
  - Speaker notes
- Navigation: Previous/Next buttons
- Knowledge checks section with 2-3 questions

#### Navigate Slides

- Click **"Next →"** to advance
- Click **"← Previous"** to go back
- Slide counter shows: "Slide X of Y"

#### View Knowledge Checks

- Click **"Show"** button
- Review comprehension questions with answers
- Explanations reference source material

#### Create Study Session via API

```bash
curl -X POST http://localhost:8001/api/study/session \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CLASS_ID",
    "topic": "mitosis and meiosis"
  }'
```

**Expected Response:**
```json
{
  "topic": "mitosis and meiosis",
  "slides": [
    {
      "title": "Introduction to Cell Division",
      "bullets": [
        "Cell division is fundamental to growth and reproduction",
        "Two main types: mitosis and meiosis",
        "Mitosis produces identical daughter cells",
        "Meiosis produces gametes with half the chromosomes"
      ],
      "speaker_notes": "Start by explaining that cell division is the process by which cells reproduce. Emphasize the key difference: mitosis for body cells, meiosis for sex cells."
    }
  ],
  "knowledge_checks": [
    {
      "question": "What is the main difference between mitosis and meiosis?",
      "answer": "Mitosis produces two identical diploid cells, while meiosis produces four non-identical haploid cells.",
      "explanation": "As described in chapter 8, mitosis maintains chromosome number for growth and repair, while meiosis reduces it by half for sexual reproduction.",
      "source_chunk_ids": ["CLASS_ID_FILE_ID_chunk_0067"]
    }
  ]
}
```

**Verify:**
- Content is grounded in uploaded materials
- Slides are educational and well-structured
- Knowledge checks test understanding

---

### 3.6 Chat History (Persistent per Class)

#### Chat via UI

1. Go to **"Chat"** page
2. Select a class from dropdown
3. Select mode: `Study Session`
4. Type message: `Explain photosynthesis in simple terms`
5. Click **"Send"**

**Expected Result:**
- User message appears on right (blue bubble)
- Assistant response appears on left (gray bubble)
- Response is grounded in uploaded materials
- Timestamp shown for each message

#### Continue Conversation

6. Send another message: `What are the main products?`
7. Verify conversation context is maintained

#### Switch Classes

8. Change class dropdown to different class
9. Chat history updates to show that class's history
10. Send message to new class

**Verify:** Each class has separate, persistent history

#### Clear History

11. Click **"Clear History"** button
12. Confirm the action
13. Chat history is cleared for current class only

#### Chat via API

**Send Message:**
```bash
curl -X POST http://localhost:8001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CLASS_ID",
    "message": "What are the main topics covered in this course?",
    "mode": "Study Session"
  }'
```

**Expected Response:**
```json
{
  "response": "Based on your materials:\n\n[Retrieved context from PDFs]\n\nThe main topics include: cell biology, genetics, evolution, and ecology..."
}
```

**Get Chat History:**
```bash
curl "http://localhost:8001/api/chat/history?class_id=CLASS_ID&limit=50"
```

**Expected Response:**
```json
{
  "history": [
    {
      "id": "...",
      "class_id": "CLASS_ID",
      "role": "user",
      "content": "What are the main topics?",
      "metadata": {"mode": "Study Session"},
      "created_at": "2026-02-15T10:45:00Z"
    },
    {
      "id": "...",
      "class_id": "CLASS_ID",
      "role": "assistant",
      "content": "Based on your materials...",
      "metadata": {},
      "created_at": "2026-02-15T10:45:03Z"
    }
  ]
}
```

**Clear History:**
```bash
curl -X DELETE http://localhost:8001/api/chat/history/CLASS_ID
```

---

## Step 4: Verify RAG Retrieval

### Test Retrieval Quality

1. Upload a PDF with specific content (e.g., biology textbook chapter on photosynthesis)
2. Generate quiz with topic: `photosynthesis`
3. Check that quiz questions:
   - Are specific to uploaded content
   - Reference correct page numbers or sections
   - Don't include information not in the PDFs

### Test Empty Index Handling

1. Create a new class
2. **Don't** upload any materials
3. Try to generate quiz
4. **Expected Error:** "No materials indexed for this class..."
5. Try to create study session
6. **Expected Error:** "No materials indexed for this class..."

---

## Step 5: Multi-Class Calendar Testing

### Test Multiple Syllabi

1. Upload syllabi for 3 different classes
2. Each syllabus should have different exam dates
3. Generate calendar for all classes
4. Go to Calendar page

**Verify:**
- Events from all 3 classes appear
- Course names are correctly labeled
- No duplicate events
- Events are sorted chronologically

### Test Calendar with One Syllabus

1. Generate calendar with only 1 class ID
2. **Verify:** Only that class's events appear

---

## Step 6: Data Persistence Testing

### Restart Backend

1. Stop backend (Ctrl+C)
2. Restart: `uvicorn app.main:app --reload --port 8001`
3. Refresh frontend

**Verify:**
- All classes still exist
- All uploaded files still listed
- Chat history persists
- FAISS indexes are reloaded (no re-indexing needed)

### Check MongoDB Data

```bash
# Connect to MongoDB
mongosh

# Switch to database
use studyforge

# Check collections
show collections

# Expected collections:
# - classes
# - files
# - chunks
# - chat_history

# Count documents
db.classes.countDocuments()
db.files.countDocuments()
db.chunks.countDocuments()
db.chat_history.countDocuments()
```

---

## Step 7: Error Handling Tests

### Test Invalid Inputs

#### Upload Non-PDF File
1. Try to upload .txt or .docx file
2. **Expected:** Error message: "Only PDF uploads are supported"

#### Generate Quiz Without Materials
1. Create new class
2. Upload only syllabus (no materials)
3. Try to generate quiz
4. **Expected:** Error about no indexed materials

#### Invalid Class ID
```bash
curl http://localhost:8001/api/classes/invalid_id_123
```
**Expected:** 404 error or null response

#### Empty Quiz Topic
1. Leave topic field empty
2. Generate quiz
3. **Should work:** Generates general questions from materials

---

## Step 8: Performance Testing

### Large PDF Upload

1. Upload a large PDF (50+ pages)
2. Monitor console for processing time
3. **Expected:**
   - Upload completes without timeout
   - Chunking completes
   - FAISS indexing completes
   - No errors in logs

### Multiple Concurrent Requests

Open browser console and run:
```javascript
// Test concurrent quiz generation
Promise.all([
  fetch('http://localhost:8001/api/quiz/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({class_id: 'CLASS_ID', num_questions: 3, difficulty: 'easy'})
  }),
  fetch('http://localhost:8001/api/quiz/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({class_id: 'CLASS_ID', num_questions: 3, difficulty: 'medium'})
  })
]).then(responses => console.log('Both completed'))
```

**Expected:** Both requests complete successfully

---

## Summary Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] Can create multiple classes
- [ ] Can upload PDFs (syllabus, materials, assessments)
- [ ] Calendar generates from multiple syllabi
- [ ] Quiz generation works with RAG retrieval
- [ ] Study session creates slides with knowledge checks
- [ ] Chat history persists per class
- [ ] RAG retrieval grounds responses in PDFs
- [ ] Data persists after backend restart
- [ ] Error handling works correctly
- [ ] FAISS indexes are created and used

---

## Troubleshooting

### Backend won't start

**Check:**
- MongoDB is running
- `.env` file exists with correct values
- Virtual environment is activated
- All dependencies installed: `pip list`

### Frontend can't connect

**Check:**
- Backend is running on port 8001
- Frontend `.env` has `VITE_API_BASE_URL=http://localhost:8001`
- CORS is enabled (FastAPI should handle this by default)

### Quiz/Study Session errors

**Check:**
- Materials (not just syllabus) have been uploaded
- FAISS index exists: `ls data/vector_store/{CLASS_ID}/`
- OpenAI API key is valid and has credits

### Chunking/Indexing fails

**Check:**
- PDF is not corrupted
- PDF contains extractable text (not just images)
- Sufficient disk space in `data/` directory

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/api/dashboard` | Dashboard stats |
| POST | `/api/classes` | Create class |
| GET | `/api/classes` | List classes |
| GET | `/api/classes/{id}` | Get class details |
| GET | `/api/classes/{id}/files` | List class files |
| POST | `/api/classes/{id}/upload/syllabus` | Upload syllabus |
| POST | `/api/classes/{id}/upload/material` | Upload material |
| POST | `/api/classes/{id}/upload/assessment` | Upload assessment |
| POST | `/api/calendar/generate` | Generate calendar (multi-class) |
| POST | `/api/quiz/generate` | Generate quiz with RAG |
| POST | `/api/study/session` | Generate study session with RAG |
| POST | `/api/chat/send` | Send chat message |
| GET | `/api/chat/history` | Get chat history |
| DELETE | `/api/chat/history/{id}` | Clear chat history |

---

## Files Created/Modified

### New Backend Files:
- `AI-agents/app/ingest/embeddings.py` - OpenAI embedding functions
- `AI-agents/app/storage/vector_store.py` - FAISS vector store
- `AI-agents/app/schemas/quiz.py` - Quiz Pydantic models
- `AI-agents/app/schemas/study_session.py` - Study session Pydantic models
- `AI-agents/app/agents/quiz_agent.py` - Quiz generation logic
- `AI-agents/app/agents/study_agent.py` - Study session generation logic

### Modified Backend Files:
- `AI-agents/app/storage/mongo.py` - Added chunks and chat history functions
- `AI-agents/app/api/routes_calendar.py` - Added all new endpoints
- `AI-agents/.env.example` - Added MongoDB config

### New Frontend Files:
- `frontend/student-study-app/src/components/ClassDetail.jsx` - File upload UI
- `frontend/student-study-app/src/components/Quiz.jsx` - Quiz UI
- `frontend/student-study-app/src/components/StudySession.jsx` - Study session UI
- `frontend/student-study-app/src/components/Chat.jsx` - Chat UI

### Modified Frontend Files:
- `frontend/student-study-app/src/api/client.js` - Updated API client
- `frontend/student-study-app/src/App.jsx` - Added new routes
- `frontend/student-study-app/src/components/AllClasses.jsx` - Made clickable
- `frontend/student-study-app/.env` - Updated to port 8001

---

## Success Criteria

✅ **MVP Complete When:**
1. All endpoints return valid JSON
2. Multi-class calendar merges events correctly
3. Quiz questions are grounded in uploaded PDFs
4. Study sessions create educational slides from materials
5. Chat history persists per class in MongoDB
6. RAG retrieval prevents hallucinations
7. Error handling works for all edge cases
8. Frontend UI is functional and intuitive
9. All data persists after restart
10. Local setup runs without deployment dependencies

**End of Testing Guide**
