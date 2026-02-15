# StudyForge MVP - Local Testing Guide

This guide provides step-by-step instructions to run and test the StudyForge MVP locally.

## Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- OpenAI API key

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd AI-agents

# Create and activate virtual environment (if not already done)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-your-actual-key-here
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend/student-study-app

# Install dependencies
npm install
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd AI-agents
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Terminal 2 - Frontend:**
```bash
cd frontend/student-study-app
npm run dev
```

Expected output:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4. Access the Application

Open your browser and navigate to: **http://localhost:5173**

---

## Feature Testing Guide

### Test 1: Create a Class

**Goal:** Verify class creation functionality

**Steps:**
1. Click the **"+ Add Class"** button on the Dashboard
2. Fill in the form:
   - Class Name: "Introduction to Computer Science"
   - Professor: "Dr. Smith"
   - Semester: "Fall 2024"
3. Click **"Create Class"**

**Expected Result:**
- Modal closes
- New class appears on the Dashboard
- Class card shows default progress (0%)

**API Verification:**
```bash
curl http://localhost:8080/api/classes
```

Expected JSON response:
```json
{
  "classes": [
    {
      "id": "uuid-here",
      "name": "Introduction to Computer Science",
      "created_at": "2024-xx-xx..."
    }
  ]
}
```

---

### Test 2: Upload PDFs to a Class

**Goal:** Verify PDF upload and automatic indexing

#### 2a. Upload Syllabus

**Steps:**
1. On the Dashboard, locate your class card
2. Click the **"📄 Syllabus"** button
3. Select a PDF file from your computer
4. Wait for upload to complete

**Expected Result:**
- Success alert: "syllabus uploaded successfully!"
- PDF is processed and indexed

#### 2b. Upload Material PDF

**Steps:**
1. Click the **"📖 Material"** button on the class card
2. Select a course material PDF (lecture notes, textbook chapter, etc.)
3. Wait for upload

**Expected Result:**
- Success alert: "material uploaded successfully!"
- PDF is chunked and embedded into vector store

#### 2c. Upload Assessment PDF

**Steps:**
1. Click the **"✍️ Test"** button
2. Select a past quiz or exam PDF
3. Wait for upload

**Expected Result:**
- Success alert: "assessment uploaded successfully!"

**API Verification:**
```bash
# Replace {class_id} with actual class ID from Test 1
curl http://localhost:8080/api/classes/{class_id}/files
```

Expected response:
```json
{
  "files": [
    {
      "id": "file-id-1",
      "class_id": "class-id",
      "file_type": "syllabus",
      "filename": "syllabus.pdf",
      "pdf_path": "...",
      "extracted_text_path": "...",
      "created_at": "..."
    }
  ]
}
```

**Check Vector Store:**
```bash
curl http://localhost:8080/api/classes/{class_id}/vector-stats
```

Expected response:
```json
{
  "stats": {
    "class_id": "...",
    "total_chunks": 45,
    "dimension": 3072,
    "chunks_by_type": {
      "syllabus": 15,
      "material": 25,
      "assessment": 5
    }
  }
}
```

---

### Test 3: Generate Calendar

**Goal:** Extract calendar events from syllabi using AI

**Steps:**
1. Click **"Dashboard"** in the sidebar
2. Click **"Refresh Calendar"** button
3. Wait for processing (may take 10-30 seconds)
4. Navigate to **"Calendar"** tab

**Expected Result:**
- Calendar view displays current month
- Events extracted from syllabus appear on their respective dates
- Events show: assignments, quizzes, exams, readings

**API Verification:**
```bash
curl -X POST http://localhost:8080/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"class_ids": ["your-class-id"], "default_year": 2024}'
```

Expected response:
```json
{
  "events": [
    {
      "title": "Assignment 1 Due",
      "course": "Introduction to Computer Science",
      "type": "assignment",
      "due_date": "2024-09-15",
      "start_time": null,
      "end_time": null,
      "timezone": "America/New_York",
      "source": {
        "filename": "syllabus.pdf",
        "page_hint": null
      }
    }
  ]
}
```

---

### Test 4: Generate a Quiz

**Goal:** Create practice quiz using RAG retrieval from class materials

**Steps:**
1. Navigate to **"Quiz"** tab in the sidebar
2. Fill in the form:
   - Select Class: Choose your class
   - Topic: "Binary Search Trees" (or relevant topic from your materials)
   - Number of Questions: 5
   - Difficulty: Medium
3. Click **"Generate Quiz"**
4. Wait for generation (15-30 seconds)

**Expected Result:**
- 5 multiple-choice questions appear
- Each question has 4 options
- Click "Show Answer" to reveal correct answer and explanation
- Explanations reference source material

**API Verification:**
```bash
curl -X POST http://localhost:8080/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "your-class-id",
    "num_questions": 3,
    "difficulty": "medium",
    "topic": "Binary Search Trees"
  }'
```

Expected response:
```json
{
  "questions": [
    {
      "question": "What is the time complexity of searching in a balanced BST?",
      "options": [
        "O(1)",
        "O(log n)",
        "O(n)",
        "O(n log n)"
      ],
      "answer": "O(log n)",
      "explanation": "According to the course material (chunk_0045), a balanced binary search tree maintains O(log n) search time because...",
      "source_chunk_ids": ["material_xxx_0045", "material_xxx_0046"]
    }
  ],
  "metadata": {
    "difficulty": "medium",
    "num_questions_requested": 3,
    "num_questions_generated": 3,
    "chunks_used": 10,
    "topic": "Binary Search Trees"
  }
}
```

---

### Test 5: Generate a Study Session

**Goal:** Create interactive study materials with slides and knowledge checks

**Steps:**
1. Navigate to **"Study Session"** tab
2. Fill in the form:
   - Select Class: Choose your class
   - Topic: "Recursion Fundamentals"
3. Click **"Start Study Session"**
4. Wait for generation (15-30 seconds)

**Expected Result:**
- Slide-style presentation appears
- Navigate through slides using "Previous" / "Next" buttons
- Each slide has:
  - Title
  - 3-6 bullet points
  - Speaker notes at bottom
- After last slide, click "Knowledge Check"
- 2-3 knowledge check questions with answers and explanations appear

**API Verification:**
```bash
curl -X POST http://localhost:8080/api/study/session \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "your-class-id",
    "topic": "Recursion Fundamentals"
  }'
```

Expected response:
```json
{
  "topic": "Recursion Fundamentals",
  "slides": [
    {
      "title": "What is Recursion?",
      "bullets": [
        "A function that calls itself",
        "Must have a base case to stop recursion",
        "Breaks down complex problems into simpler subproblems"
      ],
      "speaker_notes": "Recursion is a fundamental programming technique where..."
    }
  ],
  "knowledge_checks": [
    {
      "question": "What is the purpose of a base case in recursion?",
      "answer": "To stop the recursive calls and prevent infinite loops",
      "explanation": "As mentioned in the slides, the base case is essential...",
      "source_chunk_ids": ["material_xxx_0023"]
    }
  ],
  "source_chunk_ids": ["material_xxx_0020", "material_xxx_0021", ...]
}
```

---

### Test 6: Chat with AI Assistant

**Goal:** Interactive AI assistance with RAG retrieval

**Steps:**
1. Scroll to bottom of any page
2. In the floating chat bar:
   - Select your class from the dropdown
   - Select mode: "Study Session"
   - Type: "Explain quicksort algorithm"
   - Press Enter or click "Send"
3. Wait for response

**Expected Result:**
- AI generates study content based on your class materials
- Response is grounded in uploaded PDFs
- Slide-style format with knowledge checks

**Try Different Modes:**

**Practice Quiz Mode:**
1. Select mode: "Practice Quiz"
2. Type: "Data Structures Quiz"
3. Send

Expected: 3 quiz questions formatted inline

**Practice Exam Mode:**
1. Select mode: "Practice Exam"
2. Type: "Final Exam Prep"
3. Send

Expected: 5 harder questions formatted inline

**API Verification:**
```bash
curl -X POST http://localhost:8080/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "your-class-id",
    "mode": "Study Session",
    "message": "Explain binary search"
  }'
```

**Get Chat History:**
```bash
curl "http://localhost:8080/api/chat/history?class_id=your-class-id&limit=10"
```

---

### Test 7: Multi-Class Calendar

**Goal:** Generate merged calendar from multiple classes

**Prerequisites:** Have 2+ classes with syllabi uploaded

**Steps:**
1. Create a second class (repeat Test 1)
2. Upload syllabus to second class
3. Dashboard → "Refresh Calendar"
4. Navigate to Calendar

**Expected Result:**
- Events from all classes appear on calendar
- Events are color-coded or labeled by course
- No duplicate events

**API Verification:**
```bash
curl -X POST http://localhost:8080/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{
    "class_ids": ["class-id-1", "class-id-2"],
    "default_year": 2024
  }'
```

---

## Troubleshooting

### Backend Issues

**Error: `OPENAI_API_KEY is not set`**
- Solution: Edit `AI-agents/.env` and add your API key

**Error: `ModuleNotFoundError`**
- Solution: Reinstall dependencies: `pip install -r requirements.txt`

**Error: Port 8080 already in use**
- Solution: Kill existing process or use different port:
  ```bash
  uvicorn app.main:app --port 8081
  ```

### Frontend Issues

**Error: `VITE_API_BASE_URL` connection failed**
- Solution: Ensure backend is running on port 8080
- Check `frontend/student-study-app/.env` has correct URL

**Blank page / white screen**
- Solution: Check browser console for errors
- Ensure npm dependencies are installed

### Data Issues

**No chunks indexed after PDF upload**
- Solution: Check PDF is text-based (not scanned image)
- Verify PDF extracted successfully:
  ```bash
  ls AI-agents/data/uploads/_extracted/
  ```

**Quiz/Study Session returns "No relevant content"**
- Solution: Ensure PDFs are uploaded and indexed
- Check vector store stats endpoint

---

## File Structure

```
workspace/
├── AI-agents/                    # Backend
│   ├── app/
│   │   ├── agents/              # AI agents (calendar, quiz, study)
│   │   ├── api/                 # API route handlers
│   │   ├── ingest/              # PDF processing & chunking
│   │   ├── schemas/             # Pydantic models
│   │   ├── storage/             # Data persistence (local/MongoDB)
│   │   ├── config.py            # Configuration
│   │   └── main.py              # FastAPI app entry point
│   ├── data/
│   │   ├── uploads/             # Uploaded PDFs
│   │   ├── vector_stores/       # FAISS indexes (per class)
│   │   └── local_db/            # Local JSON storage
│   ├── requirements.txt
│   └── .env                     # Environment variables
│
└── frontend/student-study-app/  # Frontend
    ├── src/
    │   ├── components/          # React components
    │   ├── api/                 # API client
    │   └── App.jsx              # Main app component
    ├── package.json
    └── .env                     # Frontend config
```

---

## API Endpoints Summary

### Classes
- `POST /api/classes` - Create class
- `GET /api/classes` - List classes
- `GET /api/classes/{id}` - Get class details

### File Uploads
- `POST /api/classes/{id}/upload/syllabus` - Upload syllabus
- `POST /api/classes/{id}/upload/material` - Upload material
- `POST /api/classes/{id}/upload/assessment` - Upload assessment
- `GET /api/classes/{id}/files` - List class files
- `GET /api/classes/{id}/vector-stats` - Get vector store stats

### Calendar
- `POST /api/calendar/generate` - Generate calendar events

### Quiz
- `POST /api/quiz/generate` - Generate quiz

### Study Session
- `POST /api/study/session` - Generate study session

### Chat
- `POST /api/chat/send` - Send chat message
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history/{class_id}` - Clear chat history

### Health
- `GET /health` - Health check
- `GET /api/dashboard` - Dashboard stats

---

## Sample cURL Commands

### Create Class
```bash
curl -X POST http://localhost:8080/api/classes \
  -H "Content-Type: application/json" \
  -d '{"name": "CS 101"}'
```

### Upload Syllabus
```bash
curl -X POST http://localhost:8080/api/classes/{class_id}/upload/syllabus \
  -F "file=@/path/to/syllabus.pdf"
```

### Generate Calendar
```bash
curl -X POST http://localhost:8080/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"class_ids": ["class-id-1"], "default_year": 2024}'
```

### Generate Quiz
```bash
curl -X POST http://localhost:8080/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "class-id-1",
    "num_questions": 5,
    "difficulty": "medium",
    "topic": "Recursion"
  }'
```

### Generate Study Session
```bash
curl -X POST http://localhost:8080/api/study/session \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "class-id-1",
    "topic": "Binary Trees"
  }'
```

### Chat
```bash
curl -X POST http://localhost:8080/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "class-id-1",
    "mode": "Study Session",
    "message": "Explain sorting algorithms"
  }'
```

---

## Expected Performance

- **PDF Upload**: 2-5 seconds for typical syllabus
- **Embedding Generation**: 1-3 seconds per PDF page
- **Calendar Generation**: 10-30 seconds per syllabus
- **Quiz Generation**: 15-30 seconds for 5 questions
- **Study Session**: 15-30 seconds for 3-5 slides
- **Chat Response**: 10-20 seconds

---

## Notes

- All data is stored locally in `AI-agents/data/`
- Vector stores are per-class FAISS indexes
- Chat history is persistent per class
- No AWS or cloud deployment required for MVP
- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:8080`

---

## Next Steps for Production

1. Switch from local file storage to MongoDB Atlas
2. Add user authentication
3. Deploy backend to cloud (AWS Lambda, GCP, etc.)
4. Deploy frontend to Vercel/Netlify
5. Add file size limits and validation
6. Implement rate limiting
7. Add error tracking (Sentry)
8. Add analytics

---

**MVP Testing Complete!** 🎉

For issues or questions, check the logs:
- Backend: Terminal 1 output
- Frontend: Browser console (F12)
