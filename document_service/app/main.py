from fastapi import FastAPI
from app.routes import document_routes
from app.db.database import Base, engine
from app.models.document_model import Document
from app.core.logging import get_logger
from fastapi.middleware.cors import CORSMiddleware

logger = get_logger(__name__)

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
    logger.info("Running startup: creating database tables if not exist")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready")

@app.get("/")
def read_root():
    logger.debug("Health check endpoint hit")
    return {"message": "Welcome to the FastAPI backend for file handling!"}