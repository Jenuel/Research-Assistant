from fastapi import FastAPI
from app.routes import document_routes
from app.db.database import Base, engine
from app.models.document_model import Document

app = FastAPI(title="FastAPI Backend for File Handling", version="0.1.0")

app.include_router(document_routes.router, prefix="/api/documents", tags=["documents"])

@app.on_event("startup")
def init_db():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend for file handling!"}