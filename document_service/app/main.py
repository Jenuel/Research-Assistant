from fastapi import FastAPI
from app.routes import document_routes
from app.db.database import Base, engine
from app.models.document_model import Document
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FastAPI Backend for File Handling", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_routes.router, prefix="/api/documents", tags=["documents"])

@app.on_event("startup")
def init_db():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend for file handling!"}