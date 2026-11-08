"""Directed tests on a disposable SQLite DB; generated credentials never leave its private temp dir."""
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
    with tempfile.TemporaryDirectory(prefix='silex-finance-stage1-') as directory:
        env = {**os.environ, 'PYTHONPATH': str(ROOT/'backend'), 'GESTAO_DATABASE_URL': f'sqlite:///{directory}/fixture.sqlite3',
               'GESTAO_ENV': 'local', 'SILEX_FINANCIAL_FIXTURE': str(Path(directory)/'fixture.json')}
        for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):
            env.pop(key,None)
        subprocess.run([sys.executable,'-m','app.cli','init'],cwd=ROOT,env=env,check=True)
        setup = r'''
import json,os,secrets
from datetime import timedelta
from fastapi.testclient import TestClient
from app.api import create_app,passwords
from app.db import build_engine,session_factory
from app.models import User
from app.services import today
engine=build_engine()
accounts={}
with session_factory(engine)() as db:
 for username,role in [('finance.fixture.admin','admin'),('finance.fixture.operator','operator')]:
  password=secrets.token_urlsafe(24)
  db.add(User(username=username,name='Pessoa fictícia',role=role,active=True,password_hash=passwords.hash(password)))
  accounts[role]={'username':username,'password':password}
 db.commit()
app=create_app(engine,serve_frontend=False)
with TestClient(app) as c:
 assert c.post('/api/auth/login',json=accounts['admin']).status_code==200
 bank=next(a for a in c.get('/api/accounts').json() if a['kind']=='bank')
 cats=c.get('/api/categories').json()
 reference=today()
 def post(path,body,status=201):
  r=c.post('/api'+path,json=body);assert r.status_code==status, r.status_code
  return r.json()
 for direction,amounts in [('income',[10001,20002,30003,40004]),('expense',[8888,7654,4545,1234])]:
  category=next(x for x in cats if x['name']==('Outras receitas' if direction=='income' else 'Despesas operacionais'))
  for index,(offset,amount) in enumerate(zip([-1,0,7,8],amounts)):
   entry=post('/finance',dict(description=f'Exemplo fictício {direction} {index}',direction=direction,amount_cents=amount,account_id=bank['id'],category_id=category['id'],due_date=str(reference+timedelta(days=offset)),competence_date=str(reference)))
   if index==0:
    post(f"/finance/{entry['id']}/settle",dict(method='pix',account_id=bank['id'],principal_cents=3001 if direction=='income' else 1000,interest_cents=101,fine_cents=17,discount_cents=37,request_key='fixture-stage1-'+direction),200)
 expected={'dashboard':c.get('/api/finance/dashboard').json(),'income':c.get('/api/finance?direction=income&status=pending').json(),'expense':c.get('/api/finance?direction=expense&status=pending').json()}
 data={'accounts':accounts,'expected':expected,'reference':str(reference)}
 fd=os.open(os.environ['SILEX_FINANCIAL_FIXTURE'],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:json.dump(data,f)
engine.dispose()
'''
        subprocess.run([sys.executable,'-c',setup],cwd=ROOT,env=env,check=True)
        if not env.get('SILEX_CHROMIUM_PATH'):
            brave=Path('/snap/brave/current/opt/brave.com/brave/brave')
            if brave.exists():env['SILEX_CHROMIUM_PATH']=str(brave)
        server=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8025','--no-access-log'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                if server.poll() is not None:raise RuntimeError('Temporary server exited')
                try:
                    with urllib.request.urlopen('http://127.0.0.1:8025/api/health',timeout=1) as response:
                        if response.status==200:break
                except Exception:time.sleep(.1)
            else:raise RuntimeError('Temporary server did not become ready')
            return subprocess.run(['npx','--no-install','playwright','test','--config','playwright.financial-stage1.config.ts',*sys.argv[1:]],cwd=ROOT/'frontend',env=env).returncode
        finally:
            server.terminate();server.wait(timeout=15)

if __name__=='__main__':raise SystemExit(main())
