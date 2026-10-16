"""Explicit public-instance settings; local commands retain their loopback defaults."""
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy.engine import make_url

HEALTH_HOST = "healthcheck.railway.app"


@dataclass(frozen=True)
class Deployment:
    railway: bool = False
    public_host: str = ""
    public_origin: str = ""

    @classmethod
    def from_env(cls):
        mode = os.environ.get("GESTAO_ENV", "local")
        on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT_ID") or os.environ.get("RAILWAY_PROJECT_ID"))
        if mode not in ("local", "railway") or (on_railway and mode != "railway"):
            raise RuntimeError("Defina GESTAO_ENV=railway no ambiente Railway.")
        if mode == "local":
            if os.environ.get("GESTAO_PUBLIC_ORIGIN") or os.environ.get("GESTAO_PUBLIC_HOST"):
                raise RuntimeError("Configuração pública exige GESTAO_ENV=railway.")
            return cls()
        host = os.environ.get("GESTAO_PUBLIC_HOST", "")
        origin = os.environ.get("GESTAO_PUBLIC_ORIGIN", "")
        # One exact DNS host and canonical HTTPS origin; an explicit port is allowed.
        try:
            parsed = urlsplit(origin)
            port = parsed.port
            canonical = f"https://{host}" + (f":{port}" if port is not None else "")
            valid_origin = (origin == canonical and parsed.hostname == host
                            and (port is None or 1 <= port <= 65535))
        except ValueError:
            valid_origin = False
        if (len(host) > 253 or not re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", host)
                or host in (HEALTH_HOST, "testserver") or host.endswith((".localhost", ".internal"))
                or not valid_origin):
            raise RuntimeError("Defina GESTAO_PUBLIC_HOST exato e GESTAO_PUBLIC_ORIGIN=https://esse-host, sem caminho.")
        return cls(True, host, origin)

    def database_url(self):
        """Require an actual runtime mount, never an image directory with the same name."""
        mount = Path(os.environ.get("RAILWAY_VOLUME_MOUNT_PATH", ""))
        if (not mount.is_absolute() or mount == Path("/") or mount.resolve() != mount
                or not mount.is_dir() or not mount.is_mount()):
            raise RuntimeError("Volume persistente obrigatório: RAILWAY_VOLUME_MOUNT_PATH deve ser um diretório realmente montado.")
        value = os.environ.get("GESTAO_DATABASE_URL", "")
        try:
            url = make_url(value)
            database = Path(url.database or "")
            if (url.drivername != "sqlite" or url.query or not database.is_absolute()
                    or database.parent != mount or database.resolve().parent != mount
                    or database.is_symlink() or database.name in ("", ".", "..")):
                raise ValueError()
        except Exception:
            raise RuntimeError("GESTAO_DATABASE_URL deve apontar para um arquivo SQLite diretamente no volume montado.") from None
        try:
            with tempfile.TemporaryFile(dir=mount) as check:
                check.write(b"volume-check")
                check.flush()
        except OSError:
            raise RuntimeError("O processo não consegue gravar no volume persistente.") from None
        return value
