from fastapi import FastAPI
from app.routes import rag_routes

app = FastAPI(title="FastAPI Backend for Retrieval and Generation", version="0.1.0")

app.include_router(rag_routes.router, prefix="/api/rag", tags=["retrieval_and_generation"])

app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend for retrieval and generation!"}