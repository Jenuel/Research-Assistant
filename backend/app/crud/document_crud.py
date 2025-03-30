from sqlalchemy.orm import Session
from app.models.document_model import Document
from fastapi import UploadFile

def save_document(db: Session, document: UploadFile) -> Document:
    """
    Save a document to the database.
    
    :param db: Database session
    :param document: Document object to save
    :return: Saved document object
    """
    uploaded_doc = Document(
        name=document.filename, 
        content_type=document.content_type, 
        data=document.file.read()
        )
    db.add(uploaded_doc)
    db.commit()
    db.refresh(uploaded_doc)
    return uploaded_doc

def get_document(db: Session, document_id: int) -> Document:
    """
    Retrieve a document from the database by its ID.
    
    :param db: Database session
    :param document_id: ID of the document to retrieve
    :return: Document object if found, None otherwise
    """
    return db.query(Document).filter(Document.id == document_id).first()