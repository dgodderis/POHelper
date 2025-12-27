from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List # Added for Python 3.8 compatibility

import crud, models, schemas
from database import SessionLocal, engine

BASE_DIR = Path(__file__).resolve().parent

models.Base.metadata.create_all(bind=engine)

def ensure_task_columns():
    """
    Ensures required task columns exist in the SQLite table.
    """
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(tasks)")).fetchall()
        columns = {row[1] for row in result}
        if "created_at" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN created_at DATETIME"))
        if "order_index" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN order_index INTEGER"))
        if "done_at" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN done_at DATETIME"))
            conn.execute(
                text(
                    "UPDATE tasks SET done_at = created_at "
                    "WHERE status = 'Done' AND done_at IS NULL AND created_at IS NOT NULL"
                )
            )
        if "deleted_at" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN deleted_at DATETIME"))
        if "urgent" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN urgent BOOLEAN"))
            conn.execute(text("UPDATE tasks SET urgent = 0 WHERE urgent IS NULL"))
        conn.execute(text("UPDATE tasks SET status = 'ToDo' WHERE status = 'To Do'"))
        conn.execute(text("UPDATE tasks SET status = 'Ongoing' WHERE status = 'In Progress'"))
        conn.commit()

ensure_task_columns()

app = FastAPI()

# Dependency
def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    """
    Renders the main index page.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/tasks/", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    """
    Creates a new task in the database.
    """
    return crud.create_task(db=db, task=task)

@app.get("/tasks/", response_model=List[schemas.Task])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieves a list of tasks from the database.
    """
    tasks = crud.get_tasks(db, skip=skip, limit=limit)
    return tasks

@app.get("/tasks/archived", response_model=List[schemas.Task])
def read_archived_tasks(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    """
    Retrieves a list of archived tasks from the database.
    """
    return crud.get_archived_tasks(db, skip=skip, limit=limit)

@app.get("/tags/", response_model=List[str])
def read_tags(db: Session = Depends(get_db)):
    """
    Retrieves saved tags for suggestions.
    """
    return crud.get_tags(db)

@app.put("/tasks/reorder", response_model=List[schemas.Task])
def reorder_tasks(task_reorder: schemas.TaskReorder, db: Session = Depends(get_db)):
    """
    Reorders tasks within a column based on the provided ordered list.
    """
    return crud.reorder_tasks(db, status=task_reorder.status, ordered_ids=task_reorder.ordered_ids)

@app.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    """
    Updates fields on an existing task.
    """
    db_task = crud.update_task(db, task_id=task_id, task_update=task_update)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.delete("/tasks/archived")
def delete_archived_tasks(db: Session = Depends(get_db)):
    """
    Permanently deletes all archived tasks.
    """
    deleted_count = crud.delete_archived_tasks(db)
    return {"deleted_count": deleted_count}

@app.delete("/tasks/{task_id}", response_model=schemas.Task)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """
    Deletes a task from the database.
    """
    db_task = crud.delete_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/tasks/{task_id}/restore", response_model=schemas.Task)
def restore_task(task_id: int, db: Session = Depends(get_db)):
    """
    Restores an archived task to the ToDo column.
    """
    db_task = crud.restore_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task
