import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .deployment import Deployment

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "data" / "gestao.sqlite3"


class Base(DeclarativeBase):
    pass


def build_engine(url=None):
    deployment = Deployment.from_env()
    if deployment.railway:
        expected = deployment.database_url()
        if url is not None and str(url) != expected:
            raise RuntimeError("O banco informado difere do volume configurado.")
        url = expected
    elif url is None:
        url = os.environ.get("GESTAO_DATABASE_URL", f"sqlite:///{DEFAULT_DB}")
        if "GESTAO_DATABASE_URL" not in os.environ:
            DEFAULT_DB.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 15})

    @event.listens_for(engine, "connect")
    def configure(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA busy_timeout=15000")
        connection.execute("PRAGMA journal_mode=WAL")

    return engine


def session_factory(engine):
    return sessionmaker(bind=engine, expire_on_commit=False, autoflush=True)
