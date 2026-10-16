"""Railway runtime entrypoint: mounted storage -> serialized migration -> one server."""
import fcntl
import os
import sys

from sqlalchemy import select

from .deployment import Deployment
from .db import ROOT, build_engine, session_factory


def main():
    os.umask(0o077)
    deployment = Deployment.from_env()
    if not deployment.railway:
        raise RuntimeError("Este start exige GESTAO_ENV=railway; use make run para desenvolvimento local.")
    deployment.database_url()
    try:
        port = int(os.environ["PORT"])
        if not 1 <= port <= 65535:
            raise ValueError()
    except (KeyError, ValueError):
        raise RuntimeError("PORT deve ser uma porta válida entre 1 e 65535.") from None
    if not (ROOT / "frontend" / "dist" / "index.html").is_file():
        raise RuntimeError("Frontend compilado ausente; execute o build antes de iniciar.")
    lock = os.open(os.path.join(os.environ["RAILWAY_VOLUME_MOUNT_PATH"], ".silex-instance.lock"), os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(lock)
        raise RuntimeError("Outra instância já está usando este volume; mantenha uma réplica.") from None
    # Keep the lock across exec, covering migrations and the server lifetime.
    os.set_inheritable(lock, True)
    from .cli import migrate
    from .models import User
    migrate()
    engine = build_engine()
    with session_factory(engine)() as db:
        if db.scalar(select(User.id).where(User.username.in_(["demo.admin", "demo.operador"]))):
            raise RuntimeError("Banco com contas demo: não pode ser servido pela instância pública.")
    engine.dispose()
    os.execv(sys.executable, [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port), "--workers", "1", "--no-proxy-headers", "--no-access-log"])


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Do not print database contents, request bodies or arbitrary driver diagnostics.
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
        else:
            print("Inicialização falhou; preserve o volume e verifique configuração/migrações antes de tentar novamente.", file=sys.stderr)
        raise SystemExit(1)
