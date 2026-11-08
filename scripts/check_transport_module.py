"""Run directed browser checks against a temporary DB and generated, private credentials."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

def main():
    with tempfile.TemporaryDirectory(prefix='silex-transport-check-') as directory:
        db = Path(directory)/'fixture.sqlite3'
        manifest = Path(directory)/'accounts.json'
        env = {**os.environ,'PYTHONPATH':str(ROOT/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{db}','GESTAO_ENV':'local','SILEX_TRANSPORT_FIXTURE':str(manifest)}
        for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):
            env.pop(key,None)
        subprocess.run([sys.executable,'-m','app.cli','init'],cwd=ROOT,env=env,check=True)
        # Isolated process imports only after the temporary URL has been selected.
        setup="""import os,json,secrets
from pathlib import Path
from app.api import passwords
from app.db import build_engine,session_factory
from app.models import User
accounts={}
engine=build_engine()
with session_factory(engine)() as db:
 for username,role,transport in [('demo.restricted.admin','admin',False),('sammya','admin',True),('generic.admin','admin',False),('generic.operator','operator',False)]:
  password=secrets.token_urlsafe(24)
  db.add(User(username=username,name='Synthetic '+username,role=role,active=True,transport_operations=transport,password_hash=passwords.hash(password)))
  accounts[username]={'password':password}
 db.commit()
p=Path(os.environ['SILEX_TRANSPORT_FIXTURE']);fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:json.dump(accounts,f)
engine.dispose()
"""
        subprocess.run([sys.executable,'-c',setup],cwd=ROOT,env=env,check=True)
        server=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8024','--no-access-log'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                if server.poll() is not None:raise RuntimeError('Temporary server exited')
                try:
                    with urllib.request.urlopen('http://127.0.0.1:8024/api/health',timeout=1) as r:
                        if r.status==200:break
                except Exception:time.sleep(.1)
            else:raise RuntimeError('Temporary server did not become ready')
            return subprocess.run(['npx','--no-install','playwright','test','--config','playwright.transport.config.ts',*sys.argv[1:]],cwd=ROOT/'frontend',env=env).returncode
        finally:
            server.terminate();server.wait(timeout=15)

if __name__=='__main__':raise SystemExit(main())
