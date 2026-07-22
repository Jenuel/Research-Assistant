import os
from fastapi import FastAPI
from app.routes import document_routes
from app.db.database import Base, engine
from app.models.document_model import Document
from app.core.logging import get_logger
from fastapi.middleware.cors import CORSMiddleware

logger = get_logger(__name__)

app = FastAPI(title="FastAPI Backend for File Handling", version="0.1.0")

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_routes.router, prefix="/api/documents", tags=["documents"])

@app.on_event("startup")
def init_db():
    logger.info("Running startup: creating database tables if not exist")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready")

@app.get("/")
def read_root():
    logger.debug("Health check endpoint hit")
    return {"message": "Welcome to the FastAPI backend for file handling!"}