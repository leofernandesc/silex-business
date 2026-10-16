"""Public configuration/security with synthetic records and disposable SQLite only."""
import hashlib
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.api import create_app
from app.cli import migrate, seed
from app.db import build_engine, session_factory
from app.deployment import Deployment, HEALTH_HOST
from app.models import Session, User, now

HOST = "pilot.example.test"
ORIGIN = "https://" + HOST


@pytest.fixture
def public_env(tmp_path, monkeypatch):
    mount = tmp_path / "volume"
    mount.mkdir()
    monkeypatch.setenv("GESTAO_ENV", "railway")
    monkeypatch.setenv("GESTAO_PUBLIC_HOST", HOST)
    monkeypatch.setenv("GESTAO_PUBLIC_ORIGIN", ORIGIN)
    monkeypatch.setenv("RAILWAY_VOLUME_MOUNT_PATH", str(mount))
    monkeypatch.setenv("GESTAO_DATABASE_URL", f"sqlite:///{mount / 'gestao.sqlite3'}")
    # Unit simulation only. scripts/check_railway.py tests a real Docker mount.
    monkeypatch.setattr(Path, "is_mount", lambda path: path == mount)
    return mount


@pytest.fixture
def public_app(public_env, password_hash):
    migrate()
    engine = build_engine()
    with session_factory(engine)() as db:
        db.add_all([User(username="pilot.admin", name="Admin fictício", role="admin", password_hash=password_hash),
                    User(username="pilot.operator", name="Operador fictício", role="operator", password_hash=password_hash)])
        db.commit()
    app = create_app(engine, serve_frontend=False)
    yield app
    engine.dispose()


@pytest.mark.parametrize("key,value", [
    ("GESTAO_PUBLIC_HOST", ""), ("GESTAO_PUBLIC_ORIGIN", ""),
    ("GESTAO_PUBLIC_HOST", "*.up.railway.app"), ("GESTAO_PUBLIC_HOST", "https://" + HOST),
    ("GESTAO_PUBLIC_HOST", "localhost"), ("GESTAO_PUBLIC_HOST", HEALTH_HOST),
    ("GESTAO_PUBLIC_ORIGIN", "http://" + HOST), ("GESTAO_PUBLIC_ORIGIN", ORIGIN + "/app"),
    ("GESTAO_PUBLIC_ORIGIN", "https://other.example.test"), ("GESTAO_ENV", "production"),
])
def test_public_settings_fail_closed(public_env, monkeypatch, key, value):
    monkeypatch.setenv(key, value)
    with pytest.raises(RuntimeError):
        create_app(serve_frontend=False)


def test_railway_metadata_cannot_fall_back_to_local(monkeypatch):
    monkeypatch.setenv("RAILWAY_ENVIRONMENT_ID", "synthetic-environment")
    monkeypatch.delenv("GESTAO_ENV", raising=False)
    with pytest.raises(RuntimeError):
        Deployment.from_env()


def test_public_variables_require_public_mode(monkeypatch):
    monkeypatch.setenv("GESTAO_PUBLIC_ORIGIN", ORIGIN)
    with pytest.raises(RuntimeError):
        Deployment.from_env()


def test_directory_without_mount_is_rejected_before_creating_database(public_env, monkeypatch):
    monkeypatch.setattr(Path, "is_mount", lambda path: False)
    with pytest.raises(RuntimeError, match="realmente montado"):
        build_engine()
    assert not list(public_env.iterdir())


def test_absent_mount_is_rejected(public_env, monkeypatch):
    monkeypatch.delenv("RAILWAY_VOLUME_MOUNT_PATH")
    with pytest.raises(RuntimeError, match="Volume persistente"):
        build_engine()


@pytest.mark.parametrize("url", ["", "sqlite:///relative.sqlite3", "sqlite:///:memory:",
                                  "sqlite:////tmp/wrong.sqlite3", "postgresql://unused/unused"])
def test_wrong_database_location_is_rejected(public_env, monkeypatch, url):
    monkeypatch.setenv("GESTAO_DATABASE_URL", url)
    with pytest.raises(RuntimeError, match="arquivo SQLite"):
        build_engine()
    assert not list(public_env.iterdir())


def test_symlink_database_is_rejected(public_env, tmp_path):
    (public_env / "gestao.sqlite3").symlink_to(tmp_path / "outside.sqlite3")
    with pytest.raises(RuntimeError):
        build_engine()
    assert not (tmp_path / "outside.sqlite3").exists()


def test_readonly_volume_is_rejected(public_env, monkeypatch):
    def denied(**kwargs):
        raise PermissionError()
    monkeypatch.setattr("app.deployment.tempfile.TemporaryFile", denied)
    with pytest.raises(RuntimeError, match="não consegue gravar"):
        build_engine()


def test_explicit_https_port_is_supported_but_not_userinfo_or_invalid_port(public_env, monkeypatch):
    monkeypatch.setenv("GESTAO_PUBLIC_ORIGIN", ORIGIN + ":8443")
    assert Deployment.from_env().public_origin == ORIGIN + ":8443"
    for invalid in (ORIGIN + ":0", ORIGIN + ":65536", "https://name@" + HOST, ORIGIN + "?q=x"):
        monkeypatch.setenv("GESTAO_PUBLIC_ORIGIN", invalid)
        with pytest.raises(RuntimeError):
            Deployment.from_env()


def test_secure_cookie_logout_expiry_and_private_endpoints(public_app):
    with TestClient(public_app, base_url=ORIGIN) as client:
        assert client.get("/api/finance/attachments/1").status_code == 401
        invalid = client.post("/api/auth/login", json={"username": "pilot.admin", "password": "invalid"})
        assert invalid.status_code == 401
        login = client.post("/api/auth/login", headers={"Origin": ORIGIN},
                            json={"username": "pilot.admin", "password": "TestPassword#2026"})
        assert login.status_code == 200
        cookie = login.headers["set-cookie"].lower()
        assert all(value in cookie for value in ("secure", "httponly", "samesite=strict", "max-age=43200"))
        assert client.get("/api/auth/me").status_code == 200
        assert client.post("/api/auth/logout", headers={"Origin": ORIGIN}).status_code == 200
        assert client.get("/api/auth/me").status_code == 401
        client.post("/api/auth/login", json={"username": "pilot.admin", "password": "TestPassword#2026"})
        token = client.cookies["gestao_session"]
        with public_app.state.sessions() as db:
            db.get(Session, hashlib.sha256(token.encode()).hexdigest()).expires_at = now() - timedelta(seconds=1)
            db.commit()
        assert client.get("/api/auth/me").status_code == 401
        assert client.post("/api/auth/login", json={"username": "pilot.operator", "password": "TestPassword#2026"}).status_code == 200
        assert client.get("/api/finance/dashboard").status_code == 403
        assert client.get("/api/finance/attachments/1").status_code == 403


@pytest.mark.parametrize("headers", [
    {"Origin": "https://attacker.test"}, {"Origin": "null"},
    {"Origin": "http://127.0.0.1:5173"}, {"Sec-Fetch-Site": "cross-site", "Origin": ORIGIN},
    {"Origin": "https://attacker.test", "X-Forwarded-Host": "attacker.test", "X-Forwarded-Proto": "https"},
])
def test_unauthorized_origins_and_cross_site_are_rejected(public_app, headers):
    with TestClient(public_app, base_url=ORIGIN) as client:
        assert client.post("/api/auth/login", headers=headers,
                           json={"username": "pilot.admin", "password": "TestPassword#2026"}).status_code == 403
    with public_app.state.sessions() as db:
        assert not db.scalars(select(Session)).all()


def test_forwarded_headers_do_not_authorize_host_or_downgrade_cookie(public_app):
    with TestClient(public_app, base_url=ORIGIN) as client:
        assert client.get("/api/health", headers={"Host": "attacker.test", "X-Forwarded-Host": HOST}).status_code == 400
        assert client.get("/api/health", headers={"Host": "other.up.railway.app"}).status_code == 400
        result = client.post("/api/auth/login", headers={"Origin": ORIGIN, "X-Forwarded-Proto": "http", "X-Forwarded-Host": "attacker.test"},
                             json={"username": "pilot.admin", "password": "TestPassword#2026"})
        assert result.status_code == 200
        assert "Secure" in result.headers["set-cookie"]


def test_forged_client_ip_cannot_bypass_existing_login_limit(public_app):
    with TestClient(public_app, base_url=ORIGIN) as client:
        for i in range(9):
            result = client.post("/api/auth/login", headers={"X-Real-IP": f"192.0.2.{i}", "X-Forwarded-For": f"192.0.2.{i}"},
                                 json={"username": "missing", "password": "invalid"})
            assert result.status_code == (401 if i < 8 else 429)


def test_health_requires_migrations_and_reserves_railway_health_host(public_env):
    app = create_app(serve_frontend=False)
    with TestClient(app, base_url=ORIGIN) as client:
        assert client.get("/api/health").status_code == 503
        migrate()
        assert client.get("/api/health").json() == {"status": "ok", "version": "0.1.0"}
        assert client.get("/api/health", headers={"Host": HEALTH_HOST}).status_code == 200
        assert client.get("/api/users", headers={"Host": HEALTH_HOST}).status_code == 400
        assert client.post("/api/health", headers={"Host": HEALTH_HOST}).status_code == 400
        with app.state.engine.begin() as connection:
            connection.execute(text("UPDATE alembic_version SET version_num='0009'"))
        assert client.get("/api/health").status_code == 503
    app.state.engine.dispose()


def test_seed_is_not_available_in_public_mode(public_env):
    with pytest.raises(SystemExit, match="não é permitido"):
        seed()
    assert not list(public_env.iterdir())


@pytest.mark.parametrize("port", ["", "0", "-1", "65536", "not-a-port"])
def test_start_requires_valid_port_before_opening_database(public_env, monkeypatch, port):
    from app.start import main
    monkeypatch.setenv("PORT", port)
    with pytest.raises(RuntimeError, match="PORT"):
        main()
    assert not list(public_env.iterdir())


def test_start_requires_built_frontend(public_env, tmp_path, monkeypatch):
    from app.start import main
    monkeypatch.setenv("PORT", "18080")
    monkeypatch.setattr("app.start.ROOT", tmp_path)
    with pytest.raises(RuntimeError, match="Frontend compilado ausente"):
        main()
    assert not list(public_env.iterdir())
