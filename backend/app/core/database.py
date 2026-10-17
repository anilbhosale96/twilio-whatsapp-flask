from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import text

def ensure_migrations(target_engine=None):
    """Ensures added columns exist in SQLite database tables."""
    eng = target_engine or engine
    try:
        with eng.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(vendors)")).fetchall()
            if res:
                col_names = [r[1] for r in res]
                if "password_hash" not in col_names:
                    conn.execute(text("ALTER TABLE vendors ADD COLUMN password_hash VARCHAR(255)"))
                if "shop_name" not in col_names:
                    conn.execute(text("ALTER TABLE vendors ADD COLUMN shop_name VARCHAR(100)"))
                if "category" not in col_names:
                    conn.execute(text("ALTER TABLE vendors ADD COLUMN category VARCHAR(50) DEFAULT 'Grocery'"))
                conn.commit()
    except Exception:
        pass

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


