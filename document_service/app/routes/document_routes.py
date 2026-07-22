from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document_model import Document
from app.crud.document_crud import save_document, get_document, delete_document
from app.core.logging import get_logger
from datetime import datetime

logger = get_logger(__name__)

router = APIRouter()

@router.post("/upload")
async def upload_document(document: UploadFile = File(...), db: Session = Depends(get_db)):
    logger.info(f"POST /upload — filename='{document.filename}', content_type='{document.content_type}'")
    if not document:
        logger.warning("Upload request received with no file")
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await document.read()
    size_in_bytes = len(content)
    logger.debug(f"File size: {size_in_bytes} bytes")

    await document.seek(0)

    try:
        db_doc = save_document(document, db)
    except ValueError as e:
        logger.error(f"Upload failed for '{document.filename}': {e}")
        raise HTTPException(status_code=422, detail=str(e))

    logger.info(
        f"Upload successful — id={db_doc.id}, name='{db_doc.name}', size={size_in_bytes} bytes"
    )
    return {
        "id": db_doc.id,
        "name": db_doc.name,
        "content_type": db_doc.content_type,
        "size": size_in_bytes,
        "uploadDate": db_doc.created_at.isoformat()
    }


@router.get("/fetch/all")
async def fetch_documents(db: Session = Depends(get_db)):
    logger.info("GET /fetch/all — fetching all documents")
    documents = db.query(Document).all()
    logger.info(f"Returning {len(documents)} document(s)")
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
    logger.info(f"GET /fetch/{file_id}")
    db_file = get_document(db, file_id)
    if not db_file:
        logger.warning(f"File not found: id={file_id}")
        raise HTTPException(status_code=404, detail="File not found")
    
    logger.info(f"Returning file metadata: id={file_id}, name='{db_file.name}'")
    return {
        "filename": db_file.name
    }

@router.delete("/delete/{file_id}")
async def delete_file(file_id: int, db: Session = Depends(get_db)):
    logger.info(f"DELETE /delete/{file_id}")
    if not delete_document(file_id, db):
        logger.warning(f"Delete request for non-existent file: id={file_id}")
        raise HTTPException(status_code=404, detail="File not found")
    
    logger.info(f"File deleted successfully: id={file_id}")
    return {"detail": "File deleted successfully"}
