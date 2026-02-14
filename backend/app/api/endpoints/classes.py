from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from ...core.auth import get_current_user
from ...db.memory import db
from ...models.schemas import ClassSchema, ClassCreate

router = APIRouter()

@router.get("/", response_model=List[ClassSchema])
def list_classes(current_user: dict = Depends(get_current_user)):
    return db.classes

@router.post("/", response_model=ClassSchema)
def create_class(class_in: ClassCreate, current_user: dict = Depends(get_current_user)):
    new_class = class_in.dict()
    new_class["id"] = str(uuid.uuid4())
    new_class["progress"] = 0.0
    new_class["nextExamDate"] = None
    db.classes.append(new_class)
    return new_class

@router.get("/{class_id}", response_model=ClassSchema)
def get_class(class_id: str, current_user: dict = Depends(get_current_user)):
    found = next((c for c in db.classes if c["id"] == class_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Class not found")
    return found

# Mock S3 Upload URL
@router.post("/{class_id}/syllabus/upload-url")
def get_upload_url(class_id: str, file_data: dict, current_user: dict = Depends(get_current_user)):
    # In a real app, generate S3 presigned URL here
    return {
        "uploadUrl": "https://s3.amazonaws.com/mock-upload",
        "key": f"classes/{class_id}/{file_data.get('fileName')}"
    }
