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
    env["GESTAO_ENV"]="local"
    for key in ("RAILWAY_PROJECT_ID","RAILWAY_ENVIRONMENT_ID","GESTAO_PUBLIC_HOST","GESTAO_PUBLIC_ORIGIN"):
        env.pop(key,None)
    subprocess.run([sys.executable, "-m", "app.cli", "init"], env=env, cwd=root, check=True)
    subprocess.run([sys.executable, "-m", "app.cli", "seed-demo"], env=env, cwd=root, check=True, stdout=subprocess.DEVNULL)
    # Legacy customer-form tests use an explicit module fixture, never an implicit
    # username privilege. This account exists ONLY inside this temporary database.
    setup = """from app.api import passwords
from app.db import build_engine,session_factory
from app.models import User
engine=build_engine()
with session_factory(engine)() as db:
    for username,role,transport in [('transport.fixture.admin','admin',True),('second.transport.fixture.admin','admin',True),('generic.fixture.admin','admin',False),('demo.restricted.admin','admin',False)]:
        db.add(User(username=username,name='Synthetic '+username,role=role,transport_operations=transport,password_hash=passwords.hash('CustomerFixtureOnly#2026')))
    assert not db.query(User).filter_by(username='demo.admin').one().transport_operations
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
        baseline=Path(directory)/"baseline.sqlite3"
        with sqlite3.connect(Path(directory)/"e2e.sqlite3") as source, sqlite3.connect(baseline) as destination:
            source.backup(destination)
        manifest_path.write_text(json.dumps({"database": str(Path(directory) / "e2e.sqlite3"), "baseline":str(baseline), "persistent_database_used": False}))
        manifest_path.chmod(0o600)
    port=int(os.environ.get('SILEX_E2E_PORT','8011'))
    if not 1024<=port<=65535:raise ValueError('Invalid disposable test port')
    server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)], env=env, cwd=root)
    try:
        raise SystemExit(server.wait())
    except KeyboardInterrupt:
        server.terminate()
        server.wait()
    finally:
        if manifest:
            manifest_path.unlink(missing_ok=True)
