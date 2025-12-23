from sqlalchemy import Column, Integer, String, Date
from database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    tags = Column(String) # For simplicity, storing as comma-separated string
    due_date = Column(Date)
    status = Column(String, default="To Do")
