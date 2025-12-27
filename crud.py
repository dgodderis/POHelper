from datetime import datetime, timedelta
from typing import List
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
import models, schemas
from schemas import TaskStatus

ARCHIVE_AFTER_HOURS = 8

def _archive_cutoff() -> datetime:
    return datetime.utcnow() - timedelta(hours=ARCHIVE_AFTER_HOURS)

def _parse_tags(tags_value: str) -> List[str]:
    if not tags_value:
        return []
    return [tag.strip() for tag in tags_value.split(',') if tag.strip()]

def _ensure_tags(db: Session, tags_value: str) -> None:
    tags = _parse_tags(tags_value)
    if not tags:
        return
    lowered = [tag.lower() for tag in tags]
    existing_tags = db.query(models.Tag.name).filter(func.lower(models.Tag.name).in_(lowered)).all()
    existing_lookup = {name.lower() for (name,) in existing_tags}
    for tag in tags:
        if tag.lower() not in existing_lookup:
            db.add(models.Tag(name=tag))
            existing_lookup.add(tag.lower())

def _get_next_order_index(db: Session, status_value: str) -> int:
    max_index = db.query(func.max(models.Task.order_index)).filter(models.Task.status == status_value).scalar()
    return (max_index or 0) + 1

def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    """
    Retrieves a list of tasks from the database with pagination.
    """
    cutoff = _archive_cutoff()
    return (
        db.query(models.Task)
        .filter(
            or_(
                models.Task.status != TaskStatus.done.value,
                models.Task.done_at.is_(None),
                models.Task.done_at > cutoff,
            )
        )
        .filter(models.Task.deleted_at.is_(None))
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_archived_tasks(db: Session, skip: int = 0, limit: int = 200):
    """
    Retrieves tasks archived by the 8-hour rule.
    """
    cutoff = _archive_cutoff()
    return (
        db.query(models.Task)
        .filter(
            or_(
                models.Task.deleted_at.isnot(None),
                and_(
                    models.Task.status == TaskStatus.done.value,
                    models.Task.done_at.isnot(None),
                    models.Task.done_at <= cutoff,
                ),
            )
        )
        .order_by(func.coalesce(models.Task.deleted_at, models.Task.done_at).desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_task(db: Session, task: schemas.TaskCreate):
    """
    Creates a new task in the database.
    """
    task_data = task.model_dump(exclude={"created_at", "order_index"})
    status_value = task.status.value
    task_data["status"] = status_value
    now = datetime.utcnow()
    task_data["created_at"] = now
    task_data["order_index"] = _get_next_order_index(db, status_value)
    task_data["done_at"] = now if status_value == TaskStatus.done.value else None
    _ensure_tags(db, task_data.get("tags"))
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
            if new_status == TaskStatus.done.value:
                db_task.done_at = datetime.utcnow()
            else:
                db_task.done_at = None
        db.commit()
        db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate):
    """
    Updates fields on an existing task in the database.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        return None

    update_data = task_update.model_dump(exclude_unset=True)
    if "status" in update_data:
        status_value = update_data["status"]
        if status_value is not None:
            status_value = status_value.value if hasattr(status_value, "value") else status_value
            if db_task.status != status_value:
                db_task.status = status_value
                db_task.order_index = _get_next_order_index(db, status_value)
                if status_value == TaskStatus.done.value:
                    db_task.done_at = datetime.utcnow()
                else:
                    db_task.done_at = None
            elif status_value == TaskStatus.done.value and db_task.done_at is None:
                db_task.done_at = datetime.utcnow()
        update_data.pop("status")

    if "tags" in update_data:
        _ensure_tags(db, update_data.get("tags"))

    for field, value in update_data.items():
        setattr(db_task, field, value)

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
    Soft deletes a task, or permanently removes it if already deleted.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        if db_task.deleted_at is None:
            db_task.deleted_at = datetime.utcnow()
            db.commit()
            db.refresh(db_task)
        else:
            db.delete(db_task)
            db.commit()
    return db_task

def restore_task(db: Session, task_id: int):
    """
    Restores an archived task to the ToDo column.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        return None
    status_value = TaskStatus.to_do.value
    db_task.deleted_at = None
    db_task.status = status_value
    db_task.done_at = None
    db_task.order_index = _get_next_order_index(db, status_value)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_tags(db: Session) -> List[str]:
    """
    Retrieves saved tags for suggestions.
    """
    tags = db.query(models.Tag).all()
    tag_names = {tag.name for tag in tags}
    tag_lookup = {name.lower() for name in tag_names}
    task_tags = db.query(models.Task.tags).filter(models.Task.tags.isnot(None)).all()
    added = False
    for (tags_value,) in task_tags:
        for tag in _parse_tags(tags_value):
            tag_lower = tag.lower()
            if tag_lower not in tag_lookup:
                db.add(models.Tag(name=tag))
                tag_names.add(tag)
                tag_lookup.add(tag_lower)
                added = True
    if added:
        db.commit()
    return sorted(tag_names, key=lambda name: name.lower())

def delete_archived_tasks(db: Session) -> int:
    """
    Permanently deletes archived or soft-deleted tasks.
    """
    archived_tasks = get_archived_tasks(db, skip=0, limit=10_000)
    for task in archived_tasks:
        db.delete(task)
    db.commit()
    return len(archived_tasks)
