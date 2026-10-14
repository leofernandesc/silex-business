import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.api import create_app, passwords
from app.db import ROOT, build_engine
from app.models import User
from app.services import default_records


@pytest.fixture(scope="session")
def password_hash():
    return passwords.hash("TestPassword#2026")


@pytest.fixture
def env(tmp_path, monkeypatch, password_hash):
    url = f"sqlite:///{tmp_path / 'test.sqlite3'}"
    monkeypatch.setenv("GESTAO_DATABASE_URL", url)
    command.upgrade(Config(str(ROOT / "backend" / "alembic.ini")), "head")
    engine = build_engine(url)
    app = create_app(engine, serve_frontend=False)
    with app.state.sessions() as db:
        db.add_all([User(name="Admin Teste", username="admin", role="admin", password_hash=password_hash), User(name="Operador Teste", username="operator", role="operator", password_hash=password_hash)])
        default_records(db)
        db.commit()
    with TestClient(app) as admin, TestClient(app) as operator, TestClient(app) as anonymous:
        for client, username in ((admin, "admin"), (operator, "operator")):
            assert client.post("/api/auth/login", json={"username": username, "password": "TestPassword#2026"}).status_code == 200
        yield app, admin, operator, anonymous
    engine.dispose()
