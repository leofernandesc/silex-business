"""Serve an isolated approved backend with baseline/candidate static frontend and disposable SQLite."""
from pathlib import Path
import argparse, json, os, shutil, signal, subprocess, tarfile, tempfile, time, urllib.request

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = ROOT / "docs/evidence/sb07c"
parser = argparse.ArgumentParser()
parser.add_argument("variant", choices=["baseline", "candidate"])
parser.add_argument("--port", type=int, required=True)
args = parser.parse_args()
baseline = json.loads((EVIDENCE / "baseline.json").read_text())
archive = Path(baseline["backup"]) / "approved.tar"
dist = EVIDENCE / "baseline-dist" if args.variant == "baseline" else ROOT / "frontend/dist"
signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
with tempfile.TemporaryDirectory(prefix=f"silex-sb07c-{args.variant}-") as work:
    project = Path(work) / "project"
    project.mkdir()
    tarfile.open(archive).extractall(project, filter="data")
    shutil.copytree(dist, project / "frontend/dist", dirs_exist_ok=True)
    env = {**os.environ, "PYTHONPATH": str(project / "backend"), "GESTAO_DATABASE_URL": f"sqlite:///{work}/synthetic.sqlite3"}
    python = ROOT / ".venv/bin/python"
    for command in ["init", "seed-demo"]:
        subprocess.run([python, "-m", "app.cli", command], cwd=project, env=env, stdout=subprocess.DEVNULL, check=True)
    log = (EVIDENCE / f"{args.variant}-server.log").open("w")
    server = subprocess.Popen([python, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(args.port)], cwd=project, env=env, stdout=log, stderr=log)
    metadata = {"variant": args.variant, "approved_backend": baseline["approved_head"], "port": args.port, "work": work, "pid": os.getpid(), "synthetic_only": True, "persistent_database_used": False}
    (EVIDENCE / f"{args.variant}-runtime.json").write_text(json.dumps(metadata, indent=2))
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError("Isolated server failed; consult server log")
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{args.port}/api/health", timeout=0.2) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Isolated server not ready")
        print(f"{args.variant} ready: http://127.0.0.1:{args.port} (synthetic temporary SQLite)", flush=True)
        server.wait()
    except KeyboardInterrupt:
        pass
    finally:
        server.terminate()
        server.wait()
        log.close()
