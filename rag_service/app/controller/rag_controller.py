from sentence_transformers import SentenceTransformer
from app.db.chroma_client import collection
import os
from google import genai
from google.genai import types

model = SentenceTransformer('all-MiniLM-L6-v2')

def retrieve(query: str, ids: list[int]) -> list[str]:
    """
    Retrieve relevant documents based on the query.
    """
    query_embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5,
        include=["documents", "metadatas"],
        where={"doc_id": {"$in": ids}}
    )

    retrieved_docs = []
    for doc in results['documents'][0]:
        retrieved_docs.append(doc)

    return retrieved_docs

def generate_response(query: str, answers: list[str]):
    """
    Generate a response based on the retrieved documents.
    """
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    formatted_documents = "\n\n".join(
        f"Document {i + 1}:\n{answer}" for i, answer in enumerate(answers)
    )

    prompt = (
        "You are a helpful assistant. Use the following documents to answer the user's question.\n\n"
        f"{formatted_documents}\n\n"
        f"Question:\n{query}\n\n"
        "Answer:"
    )

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(prompt)],
        )
    ]

    config = types.GenerateContentConfig(response_mime_type="text/plain")

    response_text = ""
    for chunk in client.models.generate_content_stream(
        model="gemini-2.5-flash-preview-04-17",
        contents=contents,
        config=config,
    ):
        if chunk.text:
            response_text += chunk.text

    return response_text