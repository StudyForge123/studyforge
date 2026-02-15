# StudyForge - AI-Powered Class Assistant

StudyForge is an AI-powered study companion that helps students manage their coursework, generate practice materials, and study more effectively.

## Features

✅ **Multi-Class Management** - Organize multiple courses in one place
✅ **Calendar Generation** - Automatically extract deadlines from syllabi
✅ **Quiz Generator** - Create practice quizzes from your class materials using RAG
✅ **Study Sessions** - Generate interactive slide-style study content
✅ **AI Chat Assistant** - Get help with topics using your course materials
✅ **PDF Upload** - Support for syllabi, lecture notes, and past assessments
✅ **Local-First MVP** - Runs entirely on your machine (no cloud deployment needed)

## Quick Start

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed setup and testing instructions.

### Prerequisites
- Python 3.12+
- Node.js 18+
- OpenAI API key

### Setup

1. **Backend:**
```bash
cd AI-agents
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your OPENAI_API_KEY to .env
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

2. **Frontend:**
```bash
cd frontend/student-study-app
npm install
npm run dev
```

3. **Access:** http://localhost:5173

## Architecture

- **Backend:** FastAPI + OpenAI + FAISS
- **Frontend:** React + Vite + TailwindCSS
- **Storage:** Local file-based (or MongoDB)
- **AI:** GPT-4o-mini with structured outputs
- **RAG:** FAISS vector search with text-embedding-3-large

## Project Structure

```
studyforge/
├── AI-agents/           # Backend API
│   ├── app/
│   │   ├── agents/     # AI agents (calendar, quiz, study)
│   │   ├── api/        # REST API routes
│   │   ├── ingest/     # PDF processing
│   │   ├── storage/    # Data persistence
│   │   └── main.py     # FastAPI entry point
│   └── requirements.txt
│
├── frontend/student-study-app/  # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   └── api/        # API client
│   └── package.json
│
└── TESTING_GUIDE.md    # Comprehensive testing guide
```

## Key Technologies

- **FastAPI** - High-performance Python web framework
- **OpenAI API** - GPT-4o-mini for text generation, text-embedding-3-large for embeddings
- **FAISS** - Vector similarity search for RAG
- **React 19** - Modern UI framework
- **TailwindCSS** - Utility-first CSS

## Development

This is a local MVP implementation. For production:
- Switch to MongoDB Atlas for persistence
- Add authentication
- Deploy to cloud (AWS/GCP/Azure)
- Add rate limiting and monitoring

## License

Proprietary - StudyForge Team

## Support

For setup issues, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)
