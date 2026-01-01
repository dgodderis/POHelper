# PO Helper

A small FastAPI app that gives Product Owners a lightweight task board with a drag-and-drop UI and a SQLite backend.

## What it does

- Three-column board: ToDo, Ongoing, Done
- Add tasks via a full form or a quick add
- Drag cards between columns to update status
- Delete tasks from the card footer (with confirmation)
- Tags display as small badges (derived from a comma-separated tag string)
- Due dates are shown on each card
- Overdue tasks are highlighted on the board
- Filter tasks by keyword or tags
- Column headers show task counts
- Restore archived or deleted tasks back to the board
- Delete all archived tasks from the archive header

## Tech stack

- FastAPI for the API and HTML rendering
- SQLAlchemy + SQLite for persistence (`po_helper.db`)
- Jinja2 templates for the page shell
- Vanilla JS for the board interactions
- Bootstrap 5 (CDN) for layout and modal UI
- pywebview for the desktop window

## Project structure

- `main.py` FastAPI app, routes, and template/static mounts
- `desktop.py` desktop launcher (starts a local server + webview)
- `crud.py` database operations
- `models.py` SQLAlchemy models
- `schemas.py` Pydantic schemas and status enum
- `database.py` SQLite engine + session factory
- `templates/index.html` board layout + modals
- `static/js/app.js` board behavior and API calls
- `static/css/style.css` visual theme
- `static/images/cm.png` logo
- `po_helper.db` SQLite database file (stored in a per-user app data directory by default)

## Data model

Task fields stored in SQLite:

- `id` integer primary key
- `title` required string
- `description` optional string
- `tags` optional comma-separated string
- `due_date` optional date
- `status` string, default "ToDo"
- `deleted_at` optional datetime for soft-deleted tasks

Allowed statuses are enforced in the API layer via `TaskStatus`:
`ToDo`, `Ongoing`, `Done`.

## API endpoints

- `GET /` serves the board UI
- `GET /tasks/` list tasks (supports `skip` and `limit`)
- `GET /tasks/archived` list archived/deleted tasks
- `GET /tags/` list saved tags
- `POST /tasks/` create a task
- `PUT /tasks/reorder` reorder tasks within a column
- `PUT /tasks/{task_id}` update task fields
- `PUT /tasks/{task_id}/restore` restore an archived/deleted task to ToDo
- `DELETE /tasks/archived` permanently delete all archived tasks
- `DELETE /tasks/{task_id}` delete a task (soft delete, or permanently remove if already deleted)

## UI behavior (front end)

- The board loads tasks with `GET /tasks/` on page load.
- Creating a task submits JSON to `POST /tasks/`.
- Quick add only requires a title.
- Drag and drop sends `PUT /tasks/{id}` with the new status.
- Delete uses `DELETE /tasks/{id}`, prompts for confirmation, and refreshes the board.
- Deleted tasks appear in the archived list and can be deleted again to remove them permanently.
- Archived tasks include a restore action that returns them to ToDo.
- Archived tasks can be bulk-deleted with the archive header button.
- `Ctrl` + `+`, `Ctrl` + `-`, and `Ctrl` + `0` adjust zoom.
- Tags are split on commas, trimmed, and styled with slugged class names.
- Filters match a single input against title, description, or tags.
- Column counts reflect the current filtered view.

## Installation

1. **Create a virtual environment:**

    ```bash
    uv venv
    ```

2. **Activate the virtual environment:**

    - On Windows:
      ```bash
      .\.venv\Scripts\activate
      ```
    - On macOS and Linux:
      ```bash
      source .venv/bin/activate
      ```

3. **Install the dependencies:**

    ```bash
    uv pip install -r requirements.txt
    ```

## Running the application (Option A)

1. **Start the server:**

    ```bash
    uvicorn main:app --reload
    ```

2. **Open your browser:**

    Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Desktop app (Option B)



1. **Data location:**

    By default, the SQLite database is stored in the per-user app data directory.
    Override it with `POHELPER_DATABASE_URL` or set `POHELPER_DATA_DIR` to control
    where the database file is created.

    To use the database stored in the project root, set:

    ```bash
    set POHELPER_DATABASE_URL=sqlite:///po_helper.db
    ```

2. **Run the desktop launcher:**

    ```bash
    python desktop.py
    ```

3. **Auto-start on Windows (optional):**

    This project includes a helper script that launches the desktop app using the
    `uv` virtual environment at `.venv`. The helper script sets
    `POHELPER_DATABASE_URL` to store `po_helper.db` in the project root and uses
    `pythonw.exe` so the console window closes immediately after launch.

    - Helper script: `scripts/pohelper-startup.cmd`
    - Startup folder location: run `shell:startup` from `Win + R`

    **Option A: Startup folder**

    Create a shortcut to `scripts/pohelper-startup.cmd` and place it in the Startup
    folder. The app will launch when you log in.

    **Option B: Task Scheduler**

    Create a task that runs at logon:
    - Program/script: `C:\Windows\System32\cmd.exe`
    - Add arguments: `/c "C:\path\to\POHelper\scripts\pohelper-startup.cmd"`
    - Start in: `C:\path\to\POHelper`

## Tests

1. **Install test dependencies:**

    ```bash
    uv pip install -r requirements-dev.txt
    ```

    ```bash
    npm install
    ```

2. **Run the test suites:**

    ```bash
    pytest
    ```

    ```bash
    npm test
    ```
