from fastapi.testclient import TestClient


def create_task(client, title, status="ToDo", tags=None):
    payload = {
        "title": title,
        "description": None,
        "tags": tags,
        "due_date": None,
        "status": status,
    }
    response = client.post("/tasks/", json=payload)
    assert response.status_code == 200
    return response.json()


def test_create_and_list_tasks(test_env):
    client = TestClient(test_env["main"].app)
    created = create_task(client, "Task A", tags="alpha")

    response = client.get("/tasks/")
    assert response.status_code == 200
    tasks = response.json()
    assert any(task["id"] == created["id"] for task in tasks)


def test_update_and_delete_task(test_env):
    client = TestClient(test_env["main"].app)
    created = create_task(client, "Task B")

    update = {
        "title": "Task B Updated",
        "status": "Ongoing",
    }
    response = client.put(f"/tasks/{created['id']}", json=update)
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Task B Updated"
    assert updated["status"] == "Ongoing"
    assert updated["order_index"] == 1

    response = client.delete(f"/tasks/{created['id']}")
    assert response.status_code == 200
    deleted = response.json()
    assert deleted["deleted_at"] is not None

    response = client.get("/tasks/")
    assert response.status_code == 200
    tasks = response.json()
    assert all(task["id"] != created["id"] for task in tasks)

    response = client.get("/tasks/archived")
    assert response.status_code == 200
    archived = response.json()
    assert any(task["id"] == created["id"] for task in archived)

    response = client.delete(f"/tasks/{created['id']}")
    assert response.status_code == 200
    response = client.delete(f"/tasks/{created['id']}")
    assert response.status_code == 404


def test_reorder_tasks_endpoint(test_env):
    client = TestClient(test_env["main"].app)
    first = create_task(client, "First")
    second = create_task(client, "Second")

    response = client.put(
        "/tasks/reorder",
        json={"status": "ToDo", "ordered_ids": [second["id"], first["id"]]},
    )
    assert response.status_code == 200
    reordered = response.json()
    assert [task["id"] for task in reordered] == [second["id"], first["id"]]

    response = client.get("/tasks/")
    tasks = {task["id"]: task for task in response.json()}
    assert tasks[first["id"]]["order_index"] == 2
    assert tasks[second["id"]]["order_index"] == 1


def test_validation_errors(test_env):
    client = TestClient(test_env["main"].app)
    response = client.post("/tasks/", json={})
    assert response.status_code == 422

    response = client.post(
        "/tasks/",
        json={
            "title": "Bad Status",
            "description": None,
            "tags": None,
            "due_date": None,
            "status": "Not A Status",
        },
    )
    assert response.status_code == 422
