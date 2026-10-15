#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PORT="${SILEX_SB07B_PORT:-18083}"
if [[ ! "$PORT" =~ ^[0-9]{1,5}$ ]] || (( PORT < 1024 || PORT > 65535 )); then
  echo "SILEX_SB07B_PORT deve estar entre 1024 e 65535." >&2
  exit 2
fi
if [[ ! -x "$ROOT/.venv/bin/python" || ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Dependências locais ausentes. Consulte o README; não use o banco padrão." >&2
  exit 2
fi
python3 - "$PORT" <<'PY'
import socket, sys
with socket.socket() as sock:
    try:
        sock.bind(("127.0.0.1", int(sys.argv[1])))
    except OSError as error:
        raise SystemExit(f"A porta {sys.argv[1]} não está disponível: {error}")
PY

umask 077
WORK="$(mktemp -d "${TMPDIR:-/tmp}/silex-sb07b.XXXXXX")"
SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p "$WORK/project"
git -C "$ROOT" archive HEAD | tar -x -C "$WORK/project"
ln -s "$ROOT/frontend/node_modules" "$WORK/project/frontend/node_modules"
(cd "$WORK/project/frontend" && npm run build)

DATABASE_URL="sqlite:///$WORK/homologation.sqlite3"
if ! PYTHONPATH="$WORK/project/backend" GESTAO_DATABASE_URL="$DATABASE_URL" \
  "$ROOT/.venv/bin/python" -m app.cli init; then
  echo "Falha ao preparar o banco temporário." >&2
  exit 1
fi
if ! PYTHONPATH="$WORK/project/backend" GESTAO_DATABASE_URL="$DATABASE_URL" \
  "$ROOT/.venv/bin/python" -m app.cli seed-demo >/dev/null 2>&1; then
  echo "Falha ao carregar dados fictícios." >&2
  exit 1
fi

(cd "$WORK/project" && PYTHONPATH="$WORK/project/backend" \
  GESTAO_DATABASE_URL="$DATABASE_URL" \
  "$ROOT/.venv/bin/python" -m uvicorn app.main:app \
  --host 127.0.0.1 --port "$PORT") >"$WORK/server.log" 2>&1 &
SERVER_PID=$!

ready=0
for attempt in $(seq 1 60); do
  if python3 - "$PORT" <<'PY'
import sys, urllib.request
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{sys.argv[1]}/api/health", timeout=0.5) as response:
        raise SystemExit(0 if response.status == 200 else 1)
except Exception:
    raise SystemExit(1)
PY
  then
    ready=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat "$WORK/server.log" >&2
    echo "Servidor temporário encerrou durante a inicialização." >&2
    exit 1
  fi
  sleep 0.25
done
if (( ! ready )); then
  cat "$WORK/server.log" >&2
  echo "Servidor temporário não ficou pronto." >&2
  exit 1
fi

printf '\nAmbiente isolado pronto: http://127.0.0.1:%s/entrar\n' "$PORT"
printf 'Dados fictícios em diretório temporário. Ctrl+C encerra o servidor e remove o banco.\n'
printf 'Use a conta de demonstração local descrita no README; não grave a senha nas evidências.\n\n'
wait "$SERVER_PID"
