"""Pytest fixtures and test bootstrapping."""

import importlib
import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture
def test_env(tmp_path, monkeypatch):
    """Provide an isolated database-backed app environment for tests."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("POHELPER_DATABASE_URL", f"sqlite:///{db_path}")

    import database
    import models
    import crud
    import main

    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(crud)
    importlib.reload(main)

    models.Base.metadata.create_all(bind=database.engine)

    return {
        "database": database,
        "models": models,
        "crud": crud,
        "main": main,
    }
