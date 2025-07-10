from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document_model import Document
from app.crud.document_crud import save_document, get_document, delete_document
from datetime import datetime

router = APIRouter()

@router.post("/upload")
async def upload_document(document: UploadFile = File(...), db: Session = Depends(get_db)):
    if not document:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await document.read()
    size_in_bytes = len(content)

    await document.seek(0)

    db_doc = save_document(document, db)

    return {
        "id": db_doc.id,
        "name": db_doc.name,
        "content_type": db_doc.content_type,
        "size": size_in_bytes,
        "uploadDate": db_doc.created_at.isoformat()
    }


@router.get("/fetch/all")
async def fetch_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()
    return [
        {
            "id": doc.id,
            "name": doc.name,
            "content_type": doc.content_type,
            "size": len(doc.data.encode("utf-8")) if doc.data else 0,
            "uploadDate": doc.created_at.isoformat()
        }
        for doc in documents
    ]

@router.get("/fetch/{file_id}")
async def fetch_file(file_id: int, db: Session = Depends(get_db)):
    db_file = get_document(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "filename": db_file.name
    }

@router.delete("/delete/{file_id}")
async def delete_file(file_id: int, db: Session = Depends(get_db)):
    if not delete_document(file_id, db):
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"detail": "File deleted successfully"}
