from sqlalchemy.orm import Session
from app.db.chroma_client import collection, chroma_client
from app.db.database import get_db
from app.models.document_model import Document
from fastapi import UploadFile
from sentence_transformers import SentenceTransformer
import textwrap
from uuid import uuid4

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

def chunk_text(text: str, chunk_size: int = 512) -> list[str]:
    return textwrap.wrap(text, chunk_size)

def save_document(document: UploadFile, db: Session) -> Document:
    """
    Save a document to the database.
    
    :param db: Database session
    :param document: Document object to save
    :return: Saved document object
    """
    content = document.file.read()

    try:
        content = content.decode("utf-8")
    except UnicodeDecodeError:
        content = content.decode("latin-1")

    content = content.replace('\x00', '')

    uploaded_doc = Document(
        name=document.filename,
        content_type=document.content_type,
        data=content
    )

    db.add(uploaded_doc)
    db.commit()
    db.refresh(uploaded_doc)

    chunks = chunk_text(content)

    embeddings = embedding_model.encode(chunks).tolist()

    chunk_ids = [str(uuid4()) for _ in chunks]
    metadatas = [
        {
            "doc_id": uploaded_doc.id,
            "chunk_index": i,
            "filename": document.filename,
        }
        for i in range(len(chunks))
    ]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=chunk_ids,
    )
    
    return uploaded_doc

def get_document(db: Session, document_id: int) -> Document:
    """
    Retrieve a document from the database by its ID.
    
    :param db: Database session
    :param document_id: ID of the document to retrieve
    :return: Document object if found, None otherwise
    """
    return db.query(Document).filter(Document.id == document_id).first()

def delete_document(document_id: int, db: Session) -> bool:
    """
    Delete a document from the database by its ID.
    
    :param db: Database session
    :param document_id: ID of the document to delete
    :return: True if deletion was successful, False otherwise
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if document:
        results = collection.get(where={"doc_id": document_id})
        ids_to_delete = results.get("ids", [])

        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
            chroma_client.persist()


        db.delete(document)
        db.commit()
        return True
    return False