from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document_model import Document
from app.crud.document_crud import save_document, get_document, delete_document
from app.core.auth import get_current_user_id
from app.core.logging import get_logger
from app.core.uploads import measure_upload
from datetime import datetime

logger = get_logger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user_id)])

@router.post("/upload")
async def upload_document(
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    logger.info(f"POST /upload — content_type='{document.content_type}'")
    logger.debug(f"Upload of '{document.filename}' by user={user_id}")
    if not document:
        logger.warning("Upload request received with no file")
        raise HTTPException(status_code=400, detail="No file provided")

    size_in_bytes = await measure_upload(document)
    logger.debug(f"File size: {size_in_bytes} bytes")

    try:
        db_doc = save_document(document, db, user_id, size_in_bytes)
    except ValueError as e:
        logger.error(f"Upload failed: {e}")
        logger.debug(f"Failed upload was '{document.filename}'")
        raise HTTPException(status_code=422, detail=str(e))

    logger.info(f"Upload successful — id={db_doc.id}, size={db_doc.size_bytes} bytes")
    return {
        "id": db_doc.id,
        "name": db_doc.name,
        "content_type": db_doc.content_type,
        "size": db_doc.size_bytes,
        "uploadDate": db_doc.created_at.isoformat()
    }


@router.get("/fetch/all")
async def fetch_documents(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    logger.info("GET /fetch/all")
    logger.debug(f"Fetching all documents for user={user_id}")
    documents = (
        db.query(
            Document.id,
            Document.name,
            Document.content_type,
            Document.size_bytes,
            Document.created_at,
        )
        .filter(Document.user_id == user_id)
        .all()
    )
    logger.info(f"Returning {len(documents)} document(s)")
    return [
        {
            "id": doc.id,
            "name": doc.name,
            "content_type": doc.content_type,
            "size": doc.size_bytes if doc.size_bytes is not None else 0,
            "uploadDate": doc.created_at.isoformat()
        }
        for doc in documents
    ]

@router.get("/fetch/{file_id}")
async def fetch_file(
    file_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    logger.info(f"GET /fetch/{file_id}")
    logger.debug(f"Fetch of id={file_id} by user={user_id}")
    db_file = get_document(db, file_id, user_id)
    if not db_file:
        logger.warning(f"File not found or not owned: id={file_id}")
        raise HTTPException(status_code=404, detail="File not found")

    logger.info(f"Returning file metadata: id={file_id}")
    return {
        "filename": db_file.name
    }

@router.delete("/delete/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    logger.info(f"DELETE /delete/{file_id}")
    logger.debug(f"Delete of id={file_id} by user={user_id}")
    if not delete_document(file_id, db, user_id):
        logger.warning(f"Delete request for non-existent or unowned file: id={file_id}")
        raise HTTPException(status_code=404, detail="File not found")

    logger.info(f"File deleted successfully: id={file_id}")
    return {"detail": "File deleted successfully"}
