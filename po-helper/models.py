from typing import Optional
from sqlalchemy import Column, Integer, String, Date
from database import Base

class Task(Base):
    __tablename__ = "tasks"

    id: int = Column(Integer, primary_key=True, index=True)
    title: str = Column(String, index=True)
    description: Optional[str] = Column(String) # Assuming it can be null
    tags: Optional[str] = Column(String) # For simplicity, storing as comma-separated string, assuming it can be null
    due_date: Optional[Date] = Column(Date) # Assuming it can be null
    status: str = Column(String, default="To Do")
