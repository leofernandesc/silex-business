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
    subprocess.run([sys.executable, "-m", "app.cli", "seed-demo"], env=env, cwd=root, check=True)
    server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8011"], env=env, cwd=root)
    try:
        raise SystemExit(server.wait())
    except KeyboardInterrupt:
        server.terminate()
        server.wait()
