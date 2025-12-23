from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional
from enum import Enum

from enum import Enum

class TaskStatus(str, Enum):
    """
    Represents the allowed statuses for a task.
    """
    to_do = "To Do"
    in_progress = "In Progress"
    done = "Done"

class TaskBase(BaseModel):
    """
    Base Pydantic model for a task, defining common fields.
    """
    title: str
    description: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[date] = None
    status: TaskStatus

class TaskCreate(TaskBase):
    """
    Pydantic model for creating a new task. Inherits from TaskBase.
    """
    pass

class TaskStatusUpdate(BaseModel):
    """
    Pydantic model for updating only the status of a task.
    """
    status: TaskStatus

class Task(TaskBase):
    """
    Pydantic model for a full Task object, including its ID.
    """
    id: int

    model_config = ConfigDict(from_attributes=True)