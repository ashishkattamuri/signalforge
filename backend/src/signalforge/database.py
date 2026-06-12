from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

DB_DIR = Path.home() / ".signalforge"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "data.db"

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

# Columns added after initial schema — ALTER TABLE is safe to run repeatedly
_MIGRATIONS = [
    ("week", "focus_quote", "TEXT"),
    ("week", "target_level", "TEXT"),
    ("staffdimension", "rating", "INTEGER"),
    ("staffdimension", "current_level", "TEXT"),
    ("connection", "oauth_tokens", "TEXT"),
    ("connection", "oauth_client_info", "TEXT"),
]


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _run_migrations()


def _run_migrations() -> None:
    with engine.connect() as conn:
        for table, col, col_type in _MIGRATIONS:
            try:
                conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
                conn.commit()
            except Exception:
                pass  # column already exists


def get_session():
    with Session(engine) as session:
        yield session
