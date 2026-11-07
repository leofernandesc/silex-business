"""Banco temporário exclusivo para os testes de navegador."""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
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
    server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8011"], env=env, cwd=root)
    try:
        raise SystemExit(server.wait())
    except KeyboardInterrupt:
        server.terminate()
        server.wait()
