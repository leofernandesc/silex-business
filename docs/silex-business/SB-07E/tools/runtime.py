"""Serve an isolated approved backend with baseline/candidate static frontend and disposable SQLite."""
from pathlib import Path
import argparse, json, os, shutil, signal, subprocess, tarfile, tempfile, time, urllib.request, sqlite3

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = ROOT / "docs/evidence/sb07e"
parser = argparse.ArgumentParser()
parser.add_argument("variant", choices=["baseline", "candidate"])
parser.add_argument("--port", type=int, required=True)
parser.add_argument("--regression-fixture", action="store_true")
parser.add_argument("--database-copy")
parser.add_argument("--legacy-session-manifest", action="store_true")
args = parser.parse_args()
baseline = json.loads((EVIDENCE / "baseline.json").read_text())
archive = Path(baseline["backup"]) / "approved.tar"
dist = EVIDENCE / "baseline-dist" if args.variant == "baseline" else ROOT / "frontend/dist"
signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
with tempfile.TemporaryDirectory(prefix=f"silex-sb07e-{args.variant}-") as work:
    project = Path(work) / "project"
    project.mkdir()
    tarfile.open(archive).extractall(project, filter="data")
    shutil.copytree(dist, project / "frontend/dist", dirs_exist_ok=True)
    env = {**os.environ, "PYTHONPATH": str(project / "backend"), "GESTAO_DATABASE_URL": f"sqlite:///{work}/synthetic.sqlite3"}
    python = ROOT / ".venv/bin/python"
    if args.database_copy:
        source=Path(args.database_copy).resolve()
        assert str(source).startswith('/tmp/silex-sb07e-') and source.name=='synthetic.sqlite3'
        with sqlite3.connect(source) as src, sqlite3.connect(Path(work)/'synthetic.sqlite3') as dst: src.backup(dst)
    elif args.regression_fixture:
        subprocess.run([python, str(Path(__file__).with_name("regression_fixture.py")), str(project)], env=env, stdout=subprocess.DEVNULL, check=True)
    else:
        for command in ["init", "seed-demo"]:
            subprocess.run([python, "-m", "app.cli", command], cwd=project, env=env, stdout=subprocess.DEVNULL, check=True)
    legacy = tempfile.TemporaryDirectory(prefix='silex-sb04b-sb07e-') if args.legacy_session_manifest else None
    if legacy:
        (Path(legacy.name)/'functional.sqlite3').symlink_to(Path(work)/'synthetic.sqlite3')
        (EVIDENCE/'session-manifest.json').write_text(json.dumps({'work_dir':legacy.name,'persistent_database_used':False,'actual_work':work,'purpose':'compatibility path for unchanged historical expiry tests; disposable SB-07E fixture'},indent=2))
    log = (EVIDENCE / f"{args.variant}-{args.port}-server.log").open("w")
    server = subprocess.Popen([python, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(args.port)], cwd=project, env=env, stdout=log, stderr=log)
    metadata = {"variant": args.variant, "approved_backend": baseline["approved_head"], "port": args.port, "work": work, "pid": os.getpid(), "synthetic_only": True, "persistent_database_used": False}
    (EVIDENCE / f"{args.variant}-{args.port}-runtime.json").write_text(json.dumps(metadata, indent=2))
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
        if legacy: legacy.cleanup()
