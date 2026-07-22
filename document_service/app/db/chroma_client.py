import chromadb
from app.core.logging import get_logger

logger = get_logger(__name__)

logger.info("Initializing ChromaDB HTTP client (host=vecdb, port=8000)")
chroma_client = chromadb.HttpClient(host="vecdb", port=8000)

logger.info("Getting or creating ChromaDB collection 'documents'")
collection = chroma_client.get_or_create_collection(name="documents")
logger.info("ChromaDB collection ready")