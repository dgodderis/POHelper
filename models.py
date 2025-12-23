from typing import Optional
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime
from database import Base

class Task(Base):
    """
    SQLAlchemy model for a Task.

    Attributes:
        id (int): Primary key, unique identifier for the task.
        title (str): The main title or name of the task.
        description (Optional[str]): A detailed description of the task. Can be null.
        tags (Optional[str]): Tags associated with the task, stored as a comma-separated string for simplicity. Can be null.
        due_date (Optional[Date]): The date by which the task is due. Can be null.
        status (str): The current status of the task, defaults to "To Do".
        created_at (datetime): When the task was created.
        order_index (Optional[int]): Manual ordering position within the column.
    """
    __tablename__ = "tasks"

    id: int = Column(Integer, primary_key=True, index=True)
    title: str = Column(String, index=True)
    description: Optional[str] = Column(String)
    tags: Optional[str] = Column(String)
    due_date: Optional[Date] = Column(Date)
    status: str = Column(String, default="To Do")
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    order_index: Optional[int] = Column(Integer)
