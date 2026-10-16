"""Local Docker/TLS validation only. Creates and removes its own synthetic volume.

Usage: .venv/bin/python scripts/check_railway.py [--build] [--browser]
No Railway CLI, credentials, network services or account actions are used.
"""
import argparse
import base64
import hashlib
import http.client
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import pty
import secrets
import select
import sqlite3
import ssl
import subprocess
import tempfile
import threading
import time
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[1]
HOST = "pilot.example.test"
IMAGE = "silex-railway-trial:test"


def command(*args, **kwargs):
    return subprocess.run(args, cwd=ROOT, text=True, capture_output=True, check=kwargs.pop("check", True), **kwargs)


def create_admin(container, password):
    master, slave = pty.openpty()
    child = subprocess.Popen(["docker", "exec", "-it", container, "python", "-m", "app.cli", "create-admin"], stdin=slave, stdout=slave, stderr=slave)
    os.close(slave)
    transcript = b""
    try:
        for prompt, answer in [("Usuário administrador:", "pilot.admin"), ("Nome:", "Administrador fictício"),
                               ("Senha (mínimo 10 caracteres):", password), ("Repita a senha:", password)]:
            deadline = time.monotonic() + 15
            pending = b""
            while prompt.encode() not in pending:
                if time.monotonic() > deadline:
                    raise RuntimeError("CLI de administrador não apresentou o prompt esperado")
                if select.select([master], [], [], 0.2)[0]:
                    chunk = os.read(master, 4096)
                    pending += chunk
                    transcript += chunk
            os.write(master, (answer + "\n").encode())
        while child.poll() is None:
            if select.select([master], [], [], 0.1)[0]:
                try:
                    transcript += os.read(master, 4096)
                except OSError:
                    break
        assert child.wait(timeout=15) == 0, "CLI de administrador falhou"
        assert password.encode() not in transcript, "Credencial apareceu na saída da CLI"
    finally:
        os.close(master)
        if child.poll() is None:
            child.terminate()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--browser", action="store_true")
    args = parser.parse_args()
    if args.build:
        subprocess.run(["docker", "build", "-t", IMAGE, "."], cwd=ROOT, check=True)
    suffix = uuid.uuid4().hex[:12]
    volume = "silex-railway-check-" + suffix
    containers = []
    backend = [0]

    class Proxy(BaseHTTPRequestHandler):
        def forward(self):
            connection = http.client.HTTPConnection("127.0.0.1", backend[0], timeout=15)
            try:
                body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
                connection.request(self.command, self.path, body=body or None, headers=dict(self.headers))
                response = connection.getresponse()
                content = response.read()
                self.send_response(response.status)
                for key, value in response.getheaders():
                    if key.lower() not in ("transfer-encoding", "connection", "content-length"):
                        self.send_header(key, value)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            finally:
                connection.close()
        do_GET = do_POST = do_PUT = do_DELETE = forward
        def log_message(self, *_):
            pass

    command("docker", "volume", "create", volume)
    try:
        with tempfile.TemporaryDirectory(prefix="silex-railway-check-") as temp:
            temporary = Path(temp)
            temporary.chmod(0o700)
            server = ThreadingHTTPServer(("127.0.0.1", 0), Proxy)
            origin = f"https://{HOST}:{server.server_port}"
            env = ["-e", "PORT=18080", "-e", "RAILWAY_VOLUME_MOUNT_PATH=/data", "-e", "GESTAO_DATABASE_URL=sqlite:////data/gestao.sqlite3",
                   "-e", "GESTAO_PUBLIC_HOST=" + HOST, "-e", "GESTAO_PUBLIC_ORIGIN=" + origin]
            mount = ["--mount", f"type=volume,source={volume},target=/data"]

            def start(name):
                command("docker", "run", "-d", "--name", name, "--memory", "470m", "--cpus", "1", "-p", "127.0.0.1::18080", *mount, *env, IMAGE)
                containers.append(name)
                backend[0] = int(command("docker", "port", name, "18080/tcp").stdout.strip().rsplit(":", 1)[1])
                wait_ready(name)

            def request(path, method="GET", data=None, cookie=None, extra_headers=None):
                connection = http.client.HTTPConnection("127.0.0.1", backend[0], timeout=15)
                headers = {"Host": HOST, "Origin": origin}
                if data is not None:
                    headers["Content-Type"] = "application/json"
                if cookie:
                    headers["Cookie"] = "gestao_session=" + cookie
                headers.update(extra_headers or {})
                connection.request(method, path, json.dumps(data) if data is not None else None, headers)
                response = connection.getresponse()
                body = response.read()
                result = (response.status, dict(response.getheaders()), body)
                connection.close()
                return result

            def wait_ready(name):
                for _ in range(300):
                    if command("docker", "inspect", "-f", "{{.State.Running}}", name).stdout.strip() != "true":
                        raise RuntimeError("Container falhou antes do healthcheck; consulte somente seus logs locais")
                    try:
                        if request("/api/health")[0] == 200:
                            return
                    except OSError:
                        pass
                    time.sleep(0.1)
                raise RuntimeError("Healthcheck local excedeu o prazo")

            def post(path, data, cookie=None, expected=201):
                status, headers, body = request(path, "POST", data, cookie)
                assert status == expected, (path, status)
                return headers, json.loads(body)

            def snapshot(name):
                code = """import json,sqlite3
c=sqlite3.connect('file:/data/gestao.sqlite3?mode=ro',uri=True)
result={t:c.execute(q).fetchall() for t,q in {
'users':'SELECT id,username,role FROM users ORDER BY id',
'customers':'SELECT id,name FROM customers ORDER BY id',
'titles':'SELECT id,amount_cents,due_date,status FROM finance_entries ORDER BY id',
'attachments':'SELECT id,sha256,size_bytes FROM attachments ORDER BY id',
'accounts':'SELECT id,name,opening_cents FROM accounts ORDER BY id',
'revision':'SELECT version_num FROM alembic_version',
'integrity':'PRAGMA integrity_check','foreign_keys':'PRAGMA foreign_key_check',
'journal':'PRAGMA journal_mode','database':'PRAGMA database_list'}.items()}
print(json.dumps(result))"""
                return json.loads(command("docker", "exec", name, "python", "-c", code).stdout)

            absent = command("docker", "run", "--rm", "--network", "none", *env, IMAGE, check=False)
            assert absent.returncode != 0 and "Volume persistente obrigatório" in absent.stderr
            first = "silex-railway-first-" + suffix
            start(first)
            idle_stats = json.loads(command("docker", "stats", "--no-stream", "--format", "{{json .}}", first).stdout)
            assert request("/app")[0] == 200
            assert snapshot(first)["users"] == []
            assert request("/api/health", extra_headers={"Host": "attacker.test", "X-Forwarded-Host": HOST})[0] == 400
            for i in range(9):
                status = request("/api/auth/login", "POST", {"username": "missing-user", "password": "invalid"},
                                 extra_headers={"X-Real-IP": f"192.0.2.{i}", "X-Forwarded-For": f"192.0.2.{i}"})[0]
                assert status == (401 if i < 8 else 429)
            password = secrets.token_urlsafe(24)
            create_admin(first, password)
            headers, _ = post("/api/auth/login", {"username": "pilot.admin", "password": password}, expected=200)
            cookie = SimpleCookie(headers["set-cookie"])["gestao_session"].value
            assert request("/api/customers", "POST", {"name": "Não deve ser criado"}, cookie,
                           extra_headers={"Origin": "https://attacker.test", "X-Forwarded-Host": "attacker.test"})[0] == 403
            post("/api/customers", {"name": "Cliente sintético Railway"}, cookie)
            post("/api/users", {"username": "pilot.operator", "name": "Operadora fictícia", "password": secrets.token_urlsafe(24), "role": "operator"}, cookie)
            accounts = json.loads(request("/api/accounts", cookie=cookie)[2])
            categories = json.loads(request("/api/categories", cookie=cookie)[2])
            _, title = post("/api/finance", {"description": "Título fictício", "direction": "income", "amount_cents": 123456789,
                    "account_id": next(a["id"] for a in accounts if a["kind"] == "bank"),
                    "category_id": next(c["id"] for c in categories if c["direction"] in ("income", "both")), "due_date": "2026-12-31"}, cookie)
            content = b"%PDF-1.4\nSynthetic Railway attachment\n"
            post(f"/api/finance/{title['id']}/attachments", {"filename": "ficticio.pdf", "content_type": "application/pdf", "content_base64": base64.b64encode(content).decode()}, cookie)
            before = snapshot(first)
            assert before["integrity"] == [["ok"]] and before["foreign_keys"] == []
            assert before["journal"] == [["wal"]] and before["database"][0][2] == "/data/gestao.sqlite3"
            command("docker", "exec", first, "python", "-c", "from pathlib import Path; assert all(Path('/data/gestao.sqlite3'+s).is_file() for s in ('','-wal','-shm')); assert not Path('/app/data').exists()")
            duplicate = command("docker", "run", "--rm", "--network", "none", *mount, *env, IMAGE, check=False)
            assert duplicate.returncode != 0 and "Outra instância" in duplicate.stderr
            blocked = command("docker", "exec", first, "python", "-m", "app.cli", "seed-demo", check=False)
            assert blocked.returncode != 0 and "não é permitido" in blocked.stderr
            command("docker", "stop", first)
            command("docker", "start", first)
            backend[0] = int(command("docker", "port", first, "18080/tcp").stdout.strip().rsplit(":", 1)[1])
            wait_ready(first)
            assert snapshot(first) == before
            command("docker", "stop", first)
            second = "silex-railway-second-" + suffix
            start(second)
            assert snapshot(second) == before
            status, _, data = request("/api/finance/attachments/1", cookie=cookie)
            assert status == 200 and hashlib.sha256(data).digest() == hashlib.sha256(content).digest()
            command("docker", "exec", second, "python", "-m", "app.cli", "backup-bundle", "--output", "/data/test-backup.zip")
            command("docker", "cp", second + ":/data/test-backup.zip", str(temporary / "backup.zip"))
            with zipfile.ZipFile(temporary / "backup.zip") as archive:
                assert archive.testzip() is None
                restored = temporary / "restored.sqlite3"
                restored.write_bytes(archive.read("gestao.sqlite3"))
            with sqlite3.connect(restored) as restored_db:
                assert restored_db.execute("PRAGMA integrity_check").fetchone() == ("ok",)
                assert restored_db.execute("SELECT amount_cents FROM finance_entries").fetchone() == (123456789,)
                assert restored_db.execute("SELECT content FROM attachments").fetchone()[0] == content

            if args.browser:
                command("openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-keyout", str(temporary / "key.pem"), "-out", str(temporary / "cert.pem"), "-subj", "/CN=" + HOST)
                (temporary / "key.pem").chmod(0o600)
                context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                context.load_cert_chain(temporary / "cert.pem", temporary / "key.pem")
                server.socket = context.wrap_socket(server.socket, server_side=True)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    result = command("node", "scripts/railway_browser.mjs", input=json.dumps({"url": origin, "password": password}), check=False)
                    assert result.returncode == 0, result.stderr
                    print(result.stdout.strip())
                finally:
                    server.shutdown()
            server.server_close()
            peak = command("docker", "exec", second, "cat", "/sys/fs/cgroup/memory.peak").stdout.strip()
            command("docker", "stop", second)
            # Corrupt only the synthetic revision and confirm startup fails without resetting records.
            change = "import sqlite3; c=sqlite3.connect('/data/gestao.sqlite3'); c.execute(\"UPDATE alembic_version SET version_num='missing_test_revision'\"); c.commit()"
            command("docker", "run", "--rm", "--network", "none", *mount, "--entrypoint", "python", IMAGE, "-c", change)
            failed = command("docker", "run", "--rm", "--network", "none", *mount, *env, IMAGE, check=False)
            assert failed.returncode != 0
            preservation = "import sqlite3; c=sqlite3.connect('file:/data/gestao.sqlite3?mode=ro',uri=True); assert c.execute('SELECT amount_cents FROM finance_entries').fetchone()==(123456789,); assert c.execute('SELECT COUNT(*) FROM users').fetchone()==(2,)"
            command("docker", "run", "--rm", "--network", "none", *mount, "--entrypoint", "python", IMAGE, "-c", preservation)
            known_demo = "import sqlite3; c=sqlite3.connect('/data/gestao.sqlite3'); c.execute(\"UPDATE alembic_version SET version_num='0010'\"); c.execute(\"UPDATE users SET username='demo.admin' WHERE username='pilot.admin'\"); c.commit()"
            command("docker", "run", "--rm", "--network", "none", *mount, "--entrypoint", "python", IMAGE, "-c", known_demo)
            demo = command("docker", "run", "--rm", "--network", "none", *mount, *env, IMAGE, check=False)
            assert demo.returncode != 0 and "Banco com contas demo" in demo.stderr
            print(json.dumps({"mount_required": True, "no_demo_seed": True, "admin_cli_no_password_echo": True,
                              "restart_equal": True, "fresh_container_equal": True, "attachments_restored": True,
                              "single_instance_lock": True, "migration_failure_stops": True,
                              "demo_database_rejected": True,
                              "forged_proxy_headers_rejected": True,
                              "runtime_memory_limit_MiB": 470, "memory_peak_bytes_including_cli": int(peak)}, indent=2))
            print(json.dumps({"idle_sample_memory": idle_stats["MemUsage"], "idle_sample_cpu": idle_stats["CPUPerc"]}))
    except Exception:
        log = Path(tempfile.gettempdir()) / ("silex-railway-failure-" + suffix + ".log")
        log.touch(mode=0o600)
        log.write_text("\n".join(command("docker", "logs", name, check=False).stderr for name in containers))
        print("Logs restritos do ensaio: " + str(log))
        raise
    finally:
        for name in containers:
            command("docker", "rm", "-f", name, check=False)
        command("docker", "volume", "rm", volume)


if __name__ == "__main__":
    main()
