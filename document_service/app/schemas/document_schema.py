from pydantic import BaseModel

class Document(BaseModel):
    id: int
    name: str
    content: str
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True