from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.storage.mongo import (
    init_mongo,
    create_class,
    list_classes,
    get_class,
    insert_file,
    list_files,
    store_chunks,
    add_chat_message,
    get_chat_history,
    clear_chat_history,
)
from app.ingest.pdf_text import extract_pdf_text_with_markers
from app.ingest.chunking import chunk_text
from app.storage.vector_store import get_vector_store
from app.agents.calendar_agent import generate_calendar
from app.agents.quiz_agent import generate_quiz
from app.agents.study_agent import generate_study_session
from app.schemas.quiz import Difficulty

router = APIRouter(prefix="/api", tags=["api"])

UPLOAD_DIR = Path("data/uploads")
TEXT_DIR = Path("data/uploads/_extracted")

class CreateClassRequest(BaseModel):
    name: str
    professor: Optional[str] = None
    semester: Optional[str] = None

class CalendarGenerateRequest(BaseModel):
    class_ids: List[str]
    default_year: int = datetime.now().year

class QuizGenerateRequest(BaseModel):
    class_id: str
    num_questions: int = 5
    difficulty: Difficulty = "medium"
    topic: Optional[str] = None
    instructions: Optional[str] = None

class StudySessionRequest(BaseModel):
    class_id: str
    topic: str

class ChatMessageRequest(BaseModel):
    class_id: str
    message: str
    mode: Optional[str] = "Study Session"

@router.on_event("startup")
async def _startup():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    await init_mongo()

@router.post("/classes")
async def api_create_class(body: CreateClassRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Class name required")
    class_id = await create_class(name, body.professor, body.semester)
    return {"class_id": class_id}

@router.get("/classes")
async def api_list_classes():
    return {"classes": await list_classes()}

@router.post("/classes/{class_id}/upload/syllabus")
async def api_upload_syllabus(class_id: str, file: UploadFile = File(...)):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = UPLOAD_DIR / f"class_{class_id}__{safe_name}"
    content = await file.read()
    pdf_path.write_bytes(content)

    marked_text = extract_pdf_text_with_markers(pdf_path)

    text_path = TEXT_DIR / f"class_{class_id}__{safe_name}.txt"
    text_path.write_text(marked_text, encoding="utf-8")

    file_id = await insert_file(
        class_id=class_id,
        file_type="syllabus",
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )

    return {"file_id": file_id, "pdf_path": str(pdf_path), "text_path": str(text_path)}

@router.get("/classes/{class_id}")
async def api_get_class(class_id: str):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls

@router.get("/classes/{class_id}/files")
async def api_list_class_files(class_id: str, file_type: Optional[str] = None):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    files = await list_files(class_id, file_type)
    return {"files": files}

async def _process_pdf_upload(class_id: str, file: UploadFile, file_type: str) -> dict:
    """Common logic for PDF upload processing."""
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    pdf_path = UPLOAD_DIR / f"class_{class_id}__{file_type}__{safe_name}"
    content = await file.read()
    pdf_path.write_bytes(content)

    # Extract text
    marked_text = extract_pdf_text_with_markers(pdf_path)
    text_path = TEXT_DIR / f"class_{class_id}__{file_type}__{safe_name}.txt"
    text_path.write_text(marked_text, encoding="utf-8")

    # Store file metadata
    file_id = await insert_file(
        class_id=class_id,
        file_type=file_type,
        filename=safe_name,
        pdf_path=str(pdf_path),
        extracted_text_path=str(text_path),
    )

    # Chunk and index for materials and assessments (not syllabus)
    if file_type in ["material", "assessment"]:
        chunks = chunk_text(marked_text, chunk_prefix=f"{class_id}_{file_id}")
        
        # Store in vector store
        vs = get_vector_store(class_id)
        vs.index_chunks(chunks, file_id, safe_name)
        
        # Store chunk metadata in MongoDB
        chunks_data = [
            {
                "chunk_id": c.chunk_id,
                "text": c.text,
                "page_start": c.page_start,
                "page_end": c.page_end,
            }
            for c in chunks
        ]
        await store_chunks(class_id, file_id, chunks_data)

    return {
        "file_id": file_id,
        "pdf_path": str(pdf_path),
        "text_path": str(text_path),
        "chunks_indexed": file_type in ["material", "assessment"]
    }

@router.post("/classes/{class_id}/upload/syllabus")
async def api_upload_syllabus(class_id: str, file: UploadFile = File(...)):
    return await _process_pdf_upload(class_id, file, "syllabus")

@router.post("/classes/{class_id}/upload/material")
async def api_upload_material(class_id: str, file: UploadFile = File(...)):
    return await _process_pdf_upload(class_id, file, "material")

@router.post("/classes/{class_id}/upload/assessment")
async def api_upload_assessment(class_id: str, file: UploadFile = File(...)):
    return await _process_pdf_upload(class_id, file, "assessment")

@router.post("/calendar/generate")
async def api_generate_calendar(body: CalendarGenerateRequest):
    items = []
    for cid in body.class_ids:
        cls = await get_class(cid)
        if not cls:
            raise HTTPException(status_code=404, detail=f"Class not found: {cid}")

        syllabi = await list_files(cid, file_type="syllabus")
        if not syllabi:
            continue

        s = syllabi[0]  # most recent
        text = Path(s["extracted_text_path"]).read_text(encoding="utf-8", errors="ignore")

        items.append({
            "course": cls["name"],
            "filename": s["filename"],
            "text": text,
        })

    if not items:
        raise HTTPException(status_code=400, detail="No syllabi found for provided classes")

    out = generate_calendar(items, default_year=body.default_year)
    return out.model_dump()

@router.post("/quiz/generate")
async def api_generate_quiz(body: QuizGenerateRequest):
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check if there are materials/assessments indexed
    vs = get_vector_store(body.class_id)
    if vs.index is None or vs.index.ntotal == 0:
        raise HTTPException(
            status_code=400,
            detail="No materials indexed for this class. Please upload materials or assessment PDFs first."
        )
    
    # Retrieve relevant chunks
    query = body.topic or f"Generate quiz questions for {cls['name']}"
    retrieved = vs.search(query, top_k=10)
    
    if not retrieved:
        raise HTTPException(
            status_code=400,
            detail="Could not retrieve relevant content. Please upload more materials."
        )
    
    # Generate quiz
    quiz = generate_quiz(
        retrieved_chunks=retrieved,
        num_questions=body.num_questions,
        difficulty=body.difficulty,
        topic=body.topic,
        instructions=body.instructions,
    )
    
    return quiz.model_dump()

@router.post("/study/session")
async def api_study_session(body: StudySessionRequest):
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check if there are materials indexed
    vs = get_vector_store(body.class_id)
    if vs.index is None or vs.index.ntotal == 0:
        raise HTTPException(
            status_code=400,
            detail="No materials indexed for this class. Please upload materials first."
        )
    
    # Retrieve relevant chunks
    retrieved = vs.search(body.topic, top_k=10)
    
    if not retrieved:
        raise HTTPException(
            status_code=400,
            detail="Could not retrieve relevant content. Please upload more materials."
        )
    
    # Generate study session
    session = generate_study_session(
        retrieved_chunks=retrieved,
        topic=body.topic,
    )
    
    return session.model_dump()

@router.post("/chat/send")
async def api_chat_send(body: ChatMessageRequest):
    cls = await get_class(body.class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Store user message
    await add_chat_message(body.class_id, "user", body.message, {"mode": body.mode})
    
    # Generate response based on mode
    if body.mode == "Study Session":
        # Use study session logic
        vs = get_vector_store(body.class_id)
        if vs.index and vs.index.ntotal > 0:
            retrieved = vs.search(body.message, top_k=5)
            if retrieved:
                context = "\n\n".join([c["text"][:500] for c in retrieved[:3]])
                response_text = f"Based on your materials:\n\n{context}\n\n[This is a simple response. Full RAG chat coming soon.]"
            else:
                response_text = "I couldn't find relevant information in your materials."
        else:
            response_text = "Please upload some materials first so I can help you study."
    else:
        response_text = f"Mode '{body.mode}' is under development. Please use 'Study Session' mode."
    
    # Store assistant response
    await add_chat_message(body.class_id, "assistant", response_text)
    
    return {"response": response_text}

@router.get("/chat/history")
async def api_chat_history(class_id: str, limit: int = 50):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    history = await get_chat_history(class_id, limit)
    return {"history": history}

@router.delete("/chat/history/{class_id}")
async def api_clear_chat_history(class_id: str):
    cls = await get_class(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    await clear_chat_history(class_id)
    return {"message": "Chat history cleared"}

@router.get("/dashboard")
async def api_dashboard():
    """Mock dashboard data for now."""
    classes = await list_classes()
    return {
        "activeClasses": len(classes),
        "upcomingDeadlines": 3,
        "scheduledSessions": 5,
    }
