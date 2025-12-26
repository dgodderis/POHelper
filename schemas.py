from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List
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
    created_at: Optional[datetime] = None
    order_index: Optional[int] = None
    done_at: Optional[datetime] = None
    urgent: bool = False

class TaskCreate(TaskBase):
    """
    Pydantic model for creating a new task. Inherits from TaskBase.
    """
    pass

class TaskUpdate(BaseModel):
    """
    Pydantic model for updating fields on an existing task.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    urgent: Optional[bool] = None

class TaskReorder(BaseModel):
    """
    Pydantic model for reordering tasks within a column.
    """
    status: TaskStatus
    ordered_ids: List[int]

class Task(TaskBase):
    """
    Pydantic model for a full Task object, including its ID and deletion timestamp.
    """
    id: int
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
