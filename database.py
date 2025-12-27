"""
This module handles the database connection and session management for the application.
It configures the SQLAlchemy engine, session factory, and declarative base.
"""
from pathlib import Path
import os
import sys
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = Path(__file__).resolve().parent


def get_default_data_dir() -> Path:
    """Return the per-user data directory for PO Helper."""
    env_dir = os.getenv("POHELPER_DATA_DIR")
    if env_dir:
        return Path(env_dir)
    if os.name == "nt":
        base_dir = os.getenv("APPDATA") or os.getenv("LOCALAPPDATA")
        if base_dir:
            return Path(base_dir) / "POHelper"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "POHelper"
    return Path.home() / ".local" / "share" / "pohelper"


def get_database_url() -> str:
    """Return the SQLAlchemy database URL."""
    env_url = os.getenv("POHELPER_DATABASE_URL")
    if env_url:
        return env_url
    data_dir = get_default_data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'po_helper.db'}"


SQLALCHEMY_DATABASE_URL = get_database_url()

engine: Engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal: sessionmaker[Session] = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)

Base = declarative_base()
