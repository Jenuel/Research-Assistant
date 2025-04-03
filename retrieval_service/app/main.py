from fastapi import FastAPI

app = FastAPI(title="FastAPI Backend for Retrieval and Generation", version="0.1.0")

app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend for retrieval and generation!"}