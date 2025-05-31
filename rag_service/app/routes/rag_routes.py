from fastapi import FastAPI, APIRouter, HTTPException, Body
from app.controller.rag_controller import retrieve, generate_response
from app.schemas.query_schema import QueryRequest

router = APIRouter()


@router.post("/generate")
async def generate_response(request_body: QueryRequest):
    """
    Generate a response based on the provided query.
    """
    query = request_body.query
    ids = request_body.ids

    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if not ids:
        raise HTTPException(status_code=400, detail="IDs cannot be empty")
    

    # Placeholder for actual generation logic
    
    # Simulate a response generation
    response = generate_response(query, ids)
    
    return {"response": response}

