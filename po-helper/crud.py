from sqlalchemy.orm import Session
import models, schemas
from schemas import TaskStatus

def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    """
    Retrieves a list of tasks from the database with pagination.
    """
    return db.query(models.Task).offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate):
    """
    Creates a new task in the database.
    """
    db_task = models.Task(**task.model_dump())
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
        db_task.status = status.value
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int):
    """
    Deletes a task from the database.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task