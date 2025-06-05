from app.db.database import Base
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    content_type = Column(String, index=True)
    data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Document(name={self.name}, created_at={self.created_at})>"