from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document_model import Document
from app.crud.document_crud import save_document, get_document, delete_document

router = APIRouter()

@router.post("/upload")
async def upload_document(document: UploadFile = File(...), db: Session = Depends(get_db)):
    if not document:
        raise HTTPException(status_code=400, detail="No file provided")
    
    db_doc = save_document(db, document)
    
    return {"filename": db_doc.name, "content_type": db_doc.content_type}

router.get("/fetch/{file_id}")
async def fetch_file(file_id: int, db: Session = Depends(get_db)):
    db_file = get_document(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "filename": db_file.name,
        "content_type": db_file.content_type, #Add JSON Parser
        "data": db_file.data.decode("utf-8")  
    }

router.delete("/delete/{file_id}")
async def delete_file(file_id: int, db: Session = Depends(get_db)):
    if not delete_document(db, file_id):
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"detail": "File deleted successfully"}
