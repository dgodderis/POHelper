from pathlib import Path
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = Path(__file__).resolve().parent
SQLALCHEMY_DATABASE_URL = f"sqlite:///{BASE_DIR / 'po_helper.db'}"

engine: Engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal: sessionmaker[Session] = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
