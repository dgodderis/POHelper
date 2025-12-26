"""
This module handles the database connection and session management for the application.
It configures the SQLAlchemy engine, session factory, and declarative base.
"""
from pathlib import Path
import os
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = Path(__file__).resolve().parent
SQLALCHEMY_DATABASE_URL = os.getenv(
    "POHELPER_DATABASE_URL",
    f"sqlite:///{BASE_DIR}/po_helper.db",
) # SQLite database URL.

engine: Engine = create_engine( # The SQLAlchemy engine for database interaction.
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal: sessionmaker[Session] = sessionmaker(autocommit=False, autoflush=False, bind=engine) # A session factory for database interactions.

Base = declarative_base() # Base class for declarative models.
