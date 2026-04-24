from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

DB_DIR = Path.home() / ".signalforge"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "data.db"

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
