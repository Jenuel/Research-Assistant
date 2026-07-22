from fastapi import FastAPI, APIRouter, HTTPException, Depends
from app.controller.rag_controller import retrieve, generate_response
from app.core.auth import get_current_user_id
from app.schemas.query_schema import QueryRequest

router = APIRouter(dependencies=[Depends(get_current_user_id)])

@router.post("/generate")
async def generate_answer(
    request_body: QueryRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Generate a response based on the provided query.
    """
    query = request_body.query
    ids = request_body.ids

    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if not ids:
        raise HTTPException(status_code=400, detail="IDs cannot be empty")

    context = retrieve(query, ids, user_id)
    response = generate_response(query, context)

    return {"response": response}
