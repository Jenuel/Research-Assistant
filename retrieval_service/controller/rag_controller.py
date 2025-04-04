from sentence_transformers import SentenceTransformer
from app.db.chroma_client import collection

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def retrieve(query: str):
    """
    Retrieve relevant documents based on the query.
    """
    query_embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5,
        include=["documents", "metadatas"]
    )

    retrieved_docs = []
    for doc in results['documents'][0]:
        retrieved_docs.append(doc)

    return retrieved_docs

def generate_response(query: str):
    """
    Generate a response based on the retrieved documents.
    """

    retrieved_docs = retrieve(query)

    # Prompt to gemini to create a response
    response = {
        "query": query,
        "retrieved_documents": retrieved_docs
    }

    return response