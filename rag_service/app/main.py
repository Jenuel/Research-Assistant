from fastapi import FastAPI
from app.routes import rag_routes
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FastAPI Backend for Retrieval and Generation", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag_routes.router, prefix="/api/rag", tags=["retrieval_and_generation"])

app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend for retrieval and generation!"}