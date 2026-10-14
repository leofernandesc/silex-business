"""Reproduz setup/build/test numa cópia descartável, sem o banco local."""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

source = Path(__file__).resolve().parents[1]
ignored = shutil.ignore_patterns(".venv", "node_modules", "dist", "data", "backups", "__pycache__", ".pytest_cache", ".git", "test-results", "playwright-report", "*.tsbuildinfo", ".env", "reference")
with tempfile.TemporaryDirectory(prefix="gestao-clean-") as temporary:
    checkout = Path(temporary) / "project"
    shutil.copytree(source, checkout, ignore=ignored)
    env = {**os.environ, "PYTHONPATH": str(checkout / "backend")}
    env.pop("GESTAO_DATABASE_URL", None)
    for target in ("setup", "seed-demo", "build", "test"):
        result = subprocess.run(["make", target], cwd=checkout, env=env, capture_output=True, text=True)
        print(f"make {target}: {'PASSOU' if result.returncode == 0 else 'FALHOU'}", flush=True)
        if result.returncode:
            print(result.stdout[-6000:], result.stderr[-6000:])
            raise SystemExit(result.returncode)
    print("Cópia limpa validada; diretório temporário removido.")
