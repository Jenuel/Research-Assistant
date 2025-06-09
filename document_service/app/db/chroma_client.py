import chromadb

chroma_client = chromadb.HttpClient(host="localhost", port=8080)

collection = chroma_client.get_or_create_collection(name="documents")