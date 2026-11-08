"""Banco temporário exclusivo para os testes de navegador."""
import os
import json
import sqlite3
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]

def stop_test_server(_signum, _frame):
    raise KeyboardInterrupt

signal.signal(signal.SIGTERM, stop_test_server)
with tempfile.TemporaryDirectory(prefix="gestao-e2e-") as directory:
    env = {**os.environ, "PYTHONPATH": str(root / "backend"), "GESTAO_DATABASE_URL": f"sqlite:///{directory}/e2e.sqlite3"}
    subprocess.run([sys.executable, "-m", "app.cli", "init"], env=env, cwd=root, check=True)
    subprocess.run([sys.executable, "-m", "app.cli", "seed-demo"], env=env, cwd=root, check=True, stdout=subprocess.DEVNULL)
    # Legacy customer-form tests use an explicit module fixture, never an implicit
    # username privilege. This account exists ONLY inside this temporary database.
    setup = """from app.api import passwords
from app.db import build_engine,session_factory
from app.models import User
engine=build_engine()
with session_factory(engine)() as db:
    db.add(User(username='transport.fixture.admin',name='Synthetic module fixture',role='admin',transport_operations=True,password_hash=passwords.hash('CustomerFixtureOnly#2026')))
    db.commit()
engine.dispose()
"""
    subprocess.run([sys.executable, "-c", setup], env=env, cwd=root, check=True)
    manifest = os.environ.get("SILEX_E2E_MANIFEST")
    if manifest:
        # The review launcher exposes only its own temporary fixture to expiry tests.
        manifest_path = Path(manifest)
        if manifest_path.parent != Path(tempfile.gettempdir()) or manifest_path.is_symlink():
            raise RuntimeError("The E2E manifest must be a regular file directly in the temporary directory")
        with sqlite3.connect(Path(directory) / "e2e.sqlite3") as db:
            db.execute("INSERT OR IGNORE INTO company_settings (id, brand_name, company_name, company_document, phone, email, address) VALUES (1, ?, ?, '', '', '', '')", ("Silex Business", "Empresa Privada de Teste"))
            db.execute("UPDATE company_settings SET company_name=? WHERE id=1", ("Empresa Privada de Teste",))
        manifest_path.write_text(json.dumps({"database": str(Path(directory) / "e2e.sqlite3"), "persistent_database_used": False}))
        manifest_path.chmod(0o600)
    server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8011"], env=env, cwd=root)
    try:
        raise SystemExit(server.wait())
    except KeyboardInterrupt:
        server.terminate()
        server.wait()
    finally:
        if manifest:
            manifest_path.unlink(missing_ok=True)
