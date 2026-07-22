from sentence_transformers import SentenceTransformer
from app.db.chroma_client import collection
import os
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

model = SentenceTransformer('all-MiniLM-L6-v2')

def retrieve(query: str, ids: list[int]) -> list[str]:
    """
    Retrieve relevant documents based on the query.
    """
    query_embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=2,
        include=["documents", "metadatas"],
        where={"doc_id": {"$in": ids}}
    )

    documents = results.get('documents') or []
    if not documents:
        logger.warning("RAG retrieve returned no results for query (length=%d chars)", len(query))
        return []

    retrieved_docs = []
    for doc in documents[0]:
        retrieved_docs.append(doc)

    return retrieved_docs

def generate_response(query: str, answers: list[str]):
    """
    Generate a response based on the retrieved documents.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    genai.configure(api_key=GEMINI_API_KEY)
    
    formatted_documents = "\n\n".join(
        f"Document {i + 1}:\n{answer}" for i, answer in enumerate(answers)
    )

    prompt = (
        "You are a helpful assistant. Use the following documents to answer the user's question.\n\n"
        f"{formatted_documents}\n\n"
        f"Question:\n{query}\n\n"
        "Answer:"
    )

    logger.debug("Prompt constructed (length=%d chars)", len(prompt))

    response_text = ""

    model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17') 

    for chunk in model.generate_content(
        [prompt],
        stream=True,  
        generation_config={"response_mime_type": "text/plain"},
    ):
        if chunk.text:
            response_text += chunk.text

    return response_text