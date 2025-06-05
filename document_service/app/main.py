from fastapi import FastAPI
from app.routes import document_routes

app = FastAPI(title="FastAPI Backend for File Handling", version="0.1.0")

app.include_router(document_routes.router, prefix="/api/documents", tags=["documents"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend for file handling!"}