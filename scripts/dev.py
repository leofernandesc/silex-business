"""Executa os dois processos; Ctrl+C encerra ambos."""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
children = []
try:
    children.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], cwd=root, start_new_session=True))
    children.append(subprocess.Popen(["npm", "run", "dev"], cwd=root / "frontend", start_new_session=True))
    while all(child.poll() is None for child in children):
        time.sleep(0.5)
except KeyboardInterrupt:
    pass
finally:
    for child in children:
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
    for child in children:
        child.wait()
