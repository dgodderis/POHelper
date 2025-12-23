from pydantic import BaseModel
from datetime import date
from typing import Optional

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[date] = None
    status: str

class TaskCreate(TaskBase):
    pass

class TaskStatusUpdate(BaseModel):
    status: str

class Task(TaskBase):
    id: int

    class Config:
        orm_mode = True
