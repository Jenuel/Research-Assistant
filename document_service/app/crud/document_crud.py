from sqlalchemy.orm import Session
from app.db.chroma_client import collection, chroma_client
from app.db.database import get_db
from app.models.document_model import Document
from app.core.logging import get_logger
from fastapi import UploadFile
from sentence_transformers import SentenceTransformer
import textwrap
from uuid import uuid4
import pdfplumber
from docx import Document as DocxDocument
import mimetypes

logger = get_logger(__name__)

logger.info("Loading sentence-transformer model 'all-MiniLM-L6-v2'")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("Embedding model loaded successfully")


def extract_text_from_pdf(document: UploadFile) -> str:
    """
    Extract text from a PDF document using pdfplumber.

    :param document: UploadFile object representing the PDF document
    :return: Extracted text as a string
    """
    logger.debug(f"Extracting text from PDF: {document.filename}")
    text_content = []
    
    try:
        with pdfplumber.open(document.file) as pdf:
            total_pages = len(pdf.pages)
            logger.debug(f"PDF has {total_pages} page(s): {document.filename}")
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text: 
                    text_content.append(page_text)
        
        extracted = "\n".join(text_content).replace('\x00', '')
        logger.info(f"PDF text extracted successfully ({len(extracted)} chars): {document.filename}")
        return extracted

    except Exception as e:
        logger.warning(
            f"pdfplumber failed for '{document.filename}', falling back to raw bytes decode. Error: {e}"
        )
        document.file.seek(0) 
        content_bytes = document.file.read()
        try:
            return content_bytes.decode("utf-8").replace('\x00', '')
        except UnicodeDecodeError:
            logger.warning(f"UTF-8 decode failed for '{document.filename}', using latin-1")
            return content_bytes.decode("latin-1").replace('\x00', '')


def extract_text_from_docx(document: UploadFile) -> str:
    """
    Extract text from a DOCX document.
    
    :param document: UploadFile object representing the DOCX document
    :return: Extracted text as a string
    """
    logger.debug(f"Extracting text from DOCX: {document.filename}")
    doc = DocxDocument(document.file)
    text = []
    for para in doc.paragraphs:
        text.append(para.text)
    
    extracted = "\n".join(text)
    logger.info(f"DOCX text extracted successfully ({len(extracted)} chars): {document.filename}")
    return extracted


def extract_text(document: UploadFile) -> str:
    """
    Extract text from a document, attempting to handle various file formats.
    """
    content_type = document.content_type
    filename = document.filename or ""

    logger.debug(f"Detecting content type for '{filename}' (reported: {content_type})")
    
    if content_type in ["application/octet-stream", None]:
        guessed_type, _ = mimetypes.guess_type(filename)
        if guessed_type:
            logger.debug(f"Content type guessed from filename: {guessed_type}")
            content_type = guessed_type

    if content_type == "application/pdf":
        return extract_text_from_pdf(document)
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_text_from_docx(document)
    elif content_type == "text/plain":
        logger.debug(f"Reading plain text file: {filename}")
        content = document.file.read()
        try:
            decoded = content.decode("utf-8").replace('\x00', '')
        except UnicodeDecodeError:
            logger.warning(f"UTF-8 decode failed for plain text '{filename}', using latin-1")
            decoded = content.decode("latin-1").replace('\x00', '')
        logger.info(f"Plain text extracted ({len(decoded)} chars): {filename}")
        return decoded
    else:
        logger.error(f"Unsupported document type '{content_type}' for file '{filename}'")
        raise ValueError(f"Unsupported document type: {content_type}")
        

def chunk_text(text: str, chunk_size: int = 512) -> list[str]:
    chunks = textwrap.wrap(text, chunk_size)
    logger.debug(f"Text chunked into {len(chunks)} chunk(s) (chunk_size={chunk_size})")
    return chunks


def save_document(document: UploadFile, db: Session) -> Document:
    """
    Save a document to the database.
    
    :param db: Database session
    :param document: Document object to save
    :return: Saved document object
    """
    logger.info(f"Saving document: '{document.filename}' (type={document.content_type})")

    content = extract_text(document)

    uploaded_doc = Document(
        name=document.filename,
        content_type=document.content_type,
        data=content
    )

    db.add(uploaded_doc)
    db.commit()
    db.refresh(uploaded_doc)
    logger.info(f"Document persisted to SQL DB with id={uploaded_doc.id}: '{document.filename}'")

    chunks = chunk_text(content)

    logger.debug(f"Encoding {len(chunks)} chunk(s) into embeddings for doc id={uploaded_doc.id}")
    embeddings = embedding_model.encode(chunks).tolist()
    logger.debug(f"Embeddings generated for doc id={uploaded_doc.id}")

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
    logger.info(
        f"Stored {len(chunks)} chunk(s) in ChromaDB for doc id={uploaded_doc.id}: '{document.filename}'"
    )
    
    return uploaded_doc


def get_document(db: Session, document_id: int) -> Document:
    """
    Retrieve a document from the database by its ID.
    
    :param db: Database session
    :param document_id: ID of the document to retrieve
    :return: Document object if found, None otherwise
    """
    logger.debug(f"Fetching document id={document_id} from SQL DB")
    doc = db.query(Document).filter(Document.id == document_id).first()
    if doc:
        logger.info(f"Document found: id={document_id}, name='{doc.name}'")
    else:
        logger.warning(f"Document not found: id={document_id}")
    return doc


def delete_document(document_id: int, db: Session) -> bool:
    """
    Delete a document from the database by its ID.
    
    :param db: Database session
    :param document_id: ID of the document to delete
    :return: True if deletion was successful, False otherwise
    """
    logger.info(f"Attempting to delete document id={document_id}")
    document = db.query(Document).filter(Document.id == document_id).first()
    if document:
        results = collection.get(where={"doc_id": document_id})
        ids_to_delete = results.get("ids", [])

        if ids_to_delete:
            logger.debug(f"Deleting {len(ids_to_delete)} chunk(s) from ChromaDB for doc id={document_id}")
            collection.delete(ids=ids_to_delete)
            logger.info(f"ChromaDB chunks deleted for doc id={document_id}")
        else:
            logger.warning(f"No ChromaDB chunks found for doc id={document_id}")

        db.delete(document)
        db.commit()
        logger.info(f"Document deleted from SQL DB: id={document_id}, name='{document.name}'")
        return True

    logger.warning(f"Delete failed — document id={document_id} not found")
    return False
