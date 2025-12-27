from datetime import date

from schemas import TaskCreate, TaskUpdate, TaskStatus


def test_parse_tags_empty(test_env):
    crud = test_env["crud"]
    assert crud._parse_tags("") == []
    assert crud._parse_tags(" , ") == []
    assert crud._parse_tags(None) == []


def test_ensure_tags_case_insensitive(test_env):
    database = test_env["database"]
    models = test_env["models"]
    crud = test_env["crud"]
    db = database.SessionLocal()
    try:
        crud._ensure_tags(db, "Alpha, beta")
        db.commit()
        crud._ensure_tags(db, "alpha")
        db.commit()
        tags = db.query(models.Tag).all()
        assert len(tags) == 2
    finally:
        db.close()


def test_create_task_sets_fields(test_env):
    database = test_env["database"]
    crud = test_env["crud"]
    db = database.SessionLocal()
    try:
        task = crud.create_task(
            db,
            TaskCreate(
                title="Write tests",
                description="Unit tests for CRUD",
                tags="QA",
                due_date=date(2025, 1, 1),
                status=TaskStatus.to_do,
            ),
        )
        assert task.id is not None
        assert task.created_at is not None
        assert task.order_index == 1
        assert task.status == "ToDo"
    finally:
        db.close()


def test_update_task_status_updates_order(test_env):
    database = test_env["database"]
    models = test_env["models"]
    crud = test_env["crud"]
    db = database.SessionLocal()
    try:
        existing = models.Task(
            title="Existing",
            status="Ongoing",
            order_index=1,
        )
        db.add(existing)
        db.commit()

        task = crud.create_task(
            db,
            TaskCreate(
                title="Move me",
                description=None,
                tags=None,
                due_date=None,
                status=TaskStatus.to_do,
            ),
        )
        updated = crud.update_task(
            db,
            task.id,
            TaskUpdate(status=TaskStatus.in_progress),
        )
        assert updated.status == "Ongoing"
        assert updated.order_index == 2
    finally:
        db.close()


def test_reorder_tasks_respects_status(test_env):
    database = test_env["database"]
    models = test_env["models"]
    crud = test_env["crud"]
    db = database.SessionLocal()
    try:
        t1 = models.Task(title="One", status="ToDo", order_index=1)
        t2 = models.Task(title="Two", status="ToDo", order_index=2)
        other = models.Task(title="Other", status="Done", order_index=1)
        db.add_all([t1, t2, other])
        db.commit()

        ordered = crud.reorder_tasks(db, TaskStatus.to_do, [t2.id, t1.id])
        assert [task.id for task in ordered] == [t2.id, t1.id]
        db.refresh(t1)
        db.refresh(t2)
        db.refresh(other)
        assert t1.order_index == 2
        assert t2.order_index == 1
        assert other.order_index == 1
    finally:
        db.close()
