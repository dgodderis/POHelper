from datetime import datetime
from typing import List
from sqlalchemy import func
from sqlalchemy.orm import Session
import models, schemas
from schemas import TaskStatus

def _get_next_order_index(db: Session, status_value: str) -> int:
    max_index = db.query(func.max(models.Task.order_index)).filter(models.Task.status == status_value).scalar()
    return (max_index or 0) + 1

def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    """
    Retrieves a list of tasks from the database with pagination.
    """
    return db.query(models.Task).offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate):
    """
    Creates a new task in the database.
    """
    task_data = task.model_dump(exclude={"created_at", "order_index"})
    status_value = task.status.value
    task_data["status"] = status_value
    task_data["created_at"] = datetime.utcnow()
    task_data["order_index"] = _get_next_order_index(db, status_value)
    db_task = models.Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task_status(db: Session, task_id: int, status: schemas.TaskStatus):
    """
    Updates the status of an existing task in the database.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        new_status = status.value
        if db_task.status != new_status:
            db_task.status = new_status
            db_task.order_index = _get_next_order_index(db, new_status)
        db.commit()
        db.refresh(db_task)
    return db_task

def reorder_tasks(db: Session, status: schemas.TaskStatus, ordered_ids: List[int]):
    """
    Updates order_index for tasks within the same status column.
    """
    tasks = db.query(models.Task).filter(models.Task.id.in_(ordered_ids)).all()
    task_map = {task.id: task for task in tasks}
    status_value = status.value
    for index, task_id in enumerate(ordered_ids):
        task = task_map.get(task_id)
        if task and task.status == status_value:
            task.order_index = index + 1
    db.commit()
    return [task_map[task_id] for task_id in ordered_ids if task_id in task_map]

def delete_task(db: Session, task_id: int):
    """
    Deletes a task from the database.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task
