"""Account-specific customer metadata; all users/databases are disposable fixtures."""
import sqlite3

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api import create_app
from app.cli import backup
from app.db import ROOT, build_engine
from app.models import CustomerServiceDetails, User

PASSWORD = "TestPassword#2026"
DETAILS = {"start_address": "Rua Fictícia, 10\nOrigem", "end_address": "Destino fictício, 20", "service_type": "interstate"}


@pytest.fixture
def authorized(env):
    app, admin, _, _ = env
    response = admin.post("/api/users", json={"username": "sammya.admin", "name": "Conta fictícia", "role": "admin", "password": PASSWORD})
    assert response.status_code == 201
    with TestClient(app) as client:
        assert client.post("/api/auth/login", json={"username": "sammya.admin", "password": PASSWORD}).status_code == 200
        yield client


def create(client, **values):
    response = client.post("/api/customers", json={"name": "Cliente fictício", **values})
    assert response.status_code == 201, response.text
    return response.json()


def test_create_edit_clear_and_preserve_common_fields(env, authorized):
    row = create(authorized, address="Endereço legado", street="Rua cadastral", city="Manaus", state="AM", service_details=DETAILS)
    assert row["service_details"] == DETAILS
    common = {k: v for k, v in row.items() if k not in ("id", "service_details")}
    response = authorized.put(f"/api/customers/{row['id']}", json={**common, "service_details": {"service_type": "local"}})
    assert response.status_code == 200
    changed = response.json()
    assert {k: v for k, v in changed.items() if k not in ("id", "service_details")} == common
    assert changed["service_details"] == {**DETAILS, "service_type": "local"}
    assert authorized.get("/api/customers").json()["items"][0] == changed
    # Only explicit empty values clear fields, never omission/null.
    cleared = {"start_address": "", "end_address": "", "service_type": None}
    assert authorized.put(f"/api/customers/{row['id']}", json={**common, "service_details": cleared}).json()["service_details"] == cleared


def test_common_edits_by_other_users_preserve_private_metadata(env, authorized):
    _, admin, operator, _ = env
    row = create(authorized, service_details=DETAILS)
    for client in (admin, operator):
        response = client.put(f"/api/customers/{row['id']}", json={"name": "Nome comum alterado"})
        assert response.status_code == 200
        assert "service_details" not in response.json()
        assert "service_details" not in client.get("/api/customers").json()["items"][0]
    for optional in ({}, {"service_details": None}):
        response = authorized.put(f"/api/customers/{row['id']}", json={"name": "Nome comum alterado", **optional})
        assert response.json()["service_details"] == DETAILS


@pytest.mark.parametrize("who", ["admin", "operator", "anonymous"])
@pytest.mark.parametrize("details", [DETAILS, None, {}])
def test_other_identities_cannot_write_or_read_details(env, authorized, who, details):
    app, admin, operator, anonymous = env
    row = create(authorized, service_details=DETAILS)
    # A matching display name, query string or forged header does not authorize.
    with app.state.sessions() as db:
        db.scalar(select(User).where(User.username == "admin")).name = "sammya.admin"
        db.commit()
    client = {"admin": admin, "operator": operator, "anonymous": anonymous}[who]
    expected = 401 if who == "anonymous" else 403
    for method, path in ((client.post, "/api/customers"), (client.put, f"/api/customers/{row['id']}")):
        response = method(path, json={"name": "Não deve salvar", "service_details": details}, headers={"X-Username": "sammya.admin"})
        assert response.status_code == expected
    response = client.get("/api/customers?username=sammya.admin&user_id=1")
    if who == "anonymous":
        assert response.status_code == 401
    else:
        assert response.json()["items"][0]["name"] == row["name"]
        assert "service_details" not in response.json()["items"][0]
    assert authorized.get("/api/customers").json()["total"] == 1
    assert authorized.get("/api/customers").json()["items"][0]["service_details"] == DETAILS


@pytest.mark.parametrize("bad", ["regional", "Local", "Interestadual", "", 1])
def test_arbitrary_service_types_rejected_atomically(env, authorized, bad):
    response = authorized.post("/api/customers", json={"name": "Inválido", "service_details": {**DETAILS, "service_type": bad}})
    assert response.status_code == 422
    assert authorized.get("/api/customers").json()["total"] == 0


def test_no_identity_in_payload_and_address_limit(env, authorized):
    for details in ({**DETAILS, "user_id": 1}, {**DETAILS, "start_address": "x" * 2001}):
        assert authorized.post("/api/customers", json={"name": "Inválido", "service_details": details}).status_code == 422
    create(authorized, service_details={**DETAILS, "start_address": "x" * 2000})


def test_existing_customer_and_csv_contract_do_not_include_private_fields(env, authorized):
    _, admin, operator, _ = env
    existing = create(operator, address="Endereço anterior")
    assert "service_details" not in existing
    empty = {"start_address": "", "end_address": "", "service_type": None}
    assert authorized.get("/api/customers").json()["items"][0]["service_details"] == empty
    assert create(authorized)["service_details"] == empty
    assert create(authorized, service_details={})["service_details"] == empty
    original_csv = admin.get("/api/reports/customers.csv").content
    common = {k: v for k, v in existing.items() if k != "id"}
    assert authorized.put(f"/api/customers/{existing['id']}", json={**common, "service_details": DETAILS}).status_code == 200
    assert admin.get("/api/reports/customers.csv").content == original_csv
    assert authorized.get("/api/reports/customers.csv").content == original_csv


def test_session_rechecks_account_role_and_activation(env, authorized):
    app, _, _, _ = env
    create(authorized, service_details=DETAILS)
    with app.state.sessions() as db:
        user = db.scalar(select(User).where(User.username == "sammya.admin"))
        user.role = "operator"
        db.commit()
    assert "service_details" not in authorized.get("/api/customers").json()["items"][0]
    assert authorized.post("/api/customers", json={"name": "Proibido", "service_details": DETAILS}).status_code == 403
    with app.state.sessions() as db:
        db.scalar(select(User).where(User.username == "sammya.admin")).active = False
        db.commit()
    assert authorized.get("/api/customers").status_code == 401


def test_exact_username_with_operator_role_is_not_enabled(env):
    app, admin, _, _ = env
    assert admin.post("/api/users", json={"username": "sammya.admin", "name": "Fictício", "role": "operator", "password": PASSWORD}).status_code == 201
    with TestClient(app) as client:
        client.post("/api/auth/login", json={"username": "sammya.admin", "password": PASSWORD})
        assert "service_details" not in create(client)
        assert client.post("/api/customers", json={"name": "Proibido", "service_details": DETAILS}).status_code == 403


def test_metadata_is_bound_to_account_id_and_not_reassigned_by_username(env, authorized):
    app, admin, _, _ = env
    row = create(authorized, service_details=DETAILS)
    with app.state.sessions() as db:
        db.scalar(select(User).where(User.username == "sammya.admin")).username = "former.account"
        db.commit()
    assert "service_details" not in authorized.get("/api/customers").json()["items"][0]
    assert admin.post("/api/users", json={"username": "sammya.admin", "name": "Outra conta fictícia", "role": "admin", "password": PASSWORD}).status_code == 201
    with TestClient(app) as replacement:
        replacement.post("/api/auth/login", json={"username": "sammya.admin", "password": PASSWORD})
        assert replacement.get("/api/customers").json()["items"][0]["service_details"] == {"start_address": "", "end_address": "", "service_type": None}
        assert replacement.put(f"/api/customers/{row['id']}", json={"name": row["name"], "service_details": {"service_type": "local"}}).status_code == 200
    with app.state.sessions() as db:
        assert len(db.scalars(select(CustomerServiceDetails)).all()) == 2


def test_restart_and_existing_sqlite_backup_preserve_metadata(env, authorized, tmp_path):
    app, _, _, _ = env
    row = create(authorized, service_details=DETAILS)
    url = str(app.state.engine.url)
    app.state.engine.dispose()
    engine = build_engine(url)
    restarted = create_app(engine, serve_frontend=False)
    with TestClient(restarted) as client:
        client.post("/api/auth/login", json={"username": "sammya.admin", "password": PASSWORD})
        assert client.get("/api/customers").json()["items"][0] == row
    engine.dispose()
    destination = tmp_path / "backup.sqlite3"
    backup(destination)
    with sqlite3.connect(destination) as restored:
        assert restored.execute("PRAGMA integrity_check").fetchone() == ("ok",)
        assert restored.execute("SELECT start_address,end_address,service_type FROM customer_service_details").fetchone() == tuple(DETAILS.values())


def test_database_constraint_rejects_invalid_type(env, authorized):
    app, _, _, _ = env
    create(authorized, service_details=DETAILS)
    with app.state.sessions() as db:
        db.scalar(select(CustomerServiceDetails)).service_type = "invalid"
        with pytest.raises(IntegrityError):
            db.commit()


def test_additive_migration_preserves_existing_tables_and_records(tmp_path, monkeypatch):
    path = tmp_path / "previous.sqlite3"
    monkeypatch.setenv("GESTAO_DATABASE_URL", f"sqlite:///{path}")
    config = Config(str(ROOT / "backend" / "alembic.ini"))
    command.upgrade(config, "0010")
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO customers (name,address,phone,email,active) VALUES (?,?,?,?,?)", ("Anterior", "Rua legada", "00000000", "", 1))
        tables = dict(db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name != 'alembic_version'"))
        before = {t: db.execute(f'SELECT * FROM "{t}"').fetchall() for t in tables}
    command.upgrade(config, "head")
    command.upgrade(config, "head")  # Restart/redeploy does not recreate records.
    with sqlite3.connect(path) as db:
        after = dict(db.execute("SELECT name,sql FROM sqlite_master WHERE type='table'"))
        assert all(after[t] == definition for t, definition in tables.items())
        assert all(db.execute(f'SELECT * FROM "{t}"').fetchall() == rows for t, rows in before.items())
        assert db.execute("SELECT COUNT(*) FROM customer_service_details").fetchone() == (0,)
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
        assert db.execute("PRAGMA integrity_check").fetchone() == ("ok",)
