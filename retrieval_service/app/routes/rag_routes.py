from fastapi import FastAPI, APIRouter, HTTPException, Depends
from app.controller.rag_controller import retrieve, generate_response


router = APIRouter()

@router.get("/generate")
async def generate_response(query: str):
    """
    Generate a response based on the provided query.
    """
    # Placeholder for actual generation logic
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # Simulate a response generation
    response = generate_response(query)
    
    return {"response": response}

