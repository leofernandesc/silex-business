"""Read-only source baseline comparison. Every app instance gets its own disposable SQLite DB."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PROBE = r'''
import hashlib,json,os,secrets
from datetime import datetime,timedelta
from fastapi.testclient import TestClient
from app.cli import migrate
from app.api import create_app,passwords
from app.db import build_engine,session_factory
from app.models import User,FinanceEntry,Payment
from app.services import today
migrate();engine=build_engine()
with session_factory(engine)() as db:
 db.add(User(username='comparison.admin',name='Pessoa fictícia',role='admin',active=True,password_hash=passwords.hash(secrets.token_urlsafe(24))));db.commit()
app=create_app(engine,serve_frontend=False)
# Generate a login credential without persisting its plaintext or logging it.
password=secrets.token_urlsafe(24)
with session_factory(engine)() as db:
 from sqlalchemy import select
 db.scalar(select(User)).password_hash=passwords.hash(password);db.commit()
output={}
with TestClient(app) as c:
 assert c.post('/api/auth/login',json={'username':'comparison.admin','password':password}).status_code==200
 bank=next(a for a in c.get('/api/accounts').json() if a['kind']=='bank');cats=c.get('/api/categories').json();d=today()
 def post(path,body,status=201):
  r=c.post('/api'+path,json=body);assert r.status_code==status,(path,r.status_code);return r.json()
 entries=[]
 for direction in ('income','expense'):
  cat=next(x for x in cats if x['name']==('Outras receitas' if direction=='income' else 'Despesas operacionais'))
  for i,(offset,amount) in enumerate([(-1,10001),(0,20002),(7,30003),(8,40004)]):
   e=post('/finance',dict(description=f'Comparação fictícia {direction} {i}',direction=direction,amount_cents=amount,account_id=bank['id'],category_id=cat['id'],due_date=str(d+timedelta(days=offset)),competence_date=str(d),document=f'FIC-{direction}-{i}'))
   if i==0:
    settled=post(f"/finance/{e['id']}/settle",dict(method='pix',account_id=bank['id'],principal_cents=3001,interest_cents=101,fine_cents=17,discount_cents=37,request_key='stage1-comparison-payment-'+direction),200)
    entries.append(settled)
 def snapshot(prefix):
  # Equivalent fixtures include the same event registration timestamps, otherwise CSVs which
  # export full technical records differ solely because the two probes run seconds apart.
  with app.state.sessions() as db:
   from sqlalchemy import select
   fixed=datetime(2026,11,7,12,0,0)
   for model in (FinanceEntry,Payment):
    for row in db.scalars(select(model)):
     row.created_at=fixed
     if isinstance(row,FinanceEntry):
      if row.settled_at is not None:row.settled_at=fixed
      if row.canceled_at is not None:row.canceled_at=fixed
   db.commit()
  catalog=c.get('/api/finance/reports/catalog').json()
  output[prefix+'catalog']=catalog
  for path in ['/finance','/finance?status=open','/finance?status=partial','/finance?status=overdue','/finance/dashboard','/finance/movements','/accounts']:
   r=c.get('/api'+path);assert r.status_code==200,(path,r.status_code);value=r.json()
   # This stage intentionally adds only this metadata field; all old fields must match.
   if isinstance(value,dict) and isinstance(value.get('summary'),dict):value['summary'].pop('as_of_date',None)
   output[prefix+path]=value
  for definition in catalog:
   path='/finance/reports/'+definition['id'];r=c.get('/api'+path);assert r.status_code==200
   output[prefix+path]=r.json()
  for path in ['/reports/finance.csv','/finance/movements.csv',*['/finance/reports/'+r['id']+'.csv' for r in catalog]]:
   r=c.get('/api'+path);assert r.status_code==200
   output[prefix+path]=hashlib.sha256(r.content).hexdigest()
 snapshot('before-reversal:')
 for e in entries:post(f"/finance/payments/{e['payments'][0]['id']}/reverse",{'reason':'Estorno fictício de comparação'},200)
 snapshot('after-reversal:')
# Registration timestamps vary between independently populated databases. Keep all IDs, amounts,
# civil dates, request keys, statuses, grouping keys and rows; remove only volatile event timestamps.
def normalize(value):
 if isinstance(value,dict):return {k:normalize(v) for k,v in value.items() if k not in ('created_at','updated_at','settled_at','canceled_at','opened_at','closed_at')}
 if isinstance(value,list):return [normalize(v) for v in value]
 return value
with open(os.environ['SILEX_COMPARE_OUTPUT'],'w') as f:json.dump(normalize(output),f,sort_keys=True)
engine.dispose()
'''


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--base',default='7214ad2543e0e980366a386b27cc7bbb39eddb32');parser.add_argument('--output',default='/tmp/silex-financial-comparison.json');args=parser.parse_args()
    base=subprocess.check_output(['git','rev-parse',args.base+'^{commit}'],cwd=ROOT,text=True).strip()
    with tempfile.TemporaryDirectory(prefix='silex-finance-compare-') as directory:
        temp=Path(directory);baseline=temp/'baseline';baseline.mkdir()
        archive=temp/'baseline.tar'
        with archive.open('wb') as f:subprocess.run(['git','archive',base,'backend','frontend/src/financePlanning.tsx'],cwd=ROOT,stdout=f,check=True)
        with tarfile.open(archive) as tar:tar.extractall(baseline,filter='data')
        data=[]
        for name,source in [('baseline',baseline),('candidate',ROOT)]:
            folder=temp/name;folder.mkdir(exist_ok=True);result=folder/'comparison.json'
            env={**os.environ,'PYTHONPATH':str(source/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{folder}/fixture.sqlite3','GESTAO_ENV':'local','SILEX_COMPARE_OUTPUT':str(result)}
            for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):env.pop(key,None)
            subprocess.run([sys.executable,'-c',PROBE],cwd=source,env=env,check=True,stdout=subprocess.DEVNULL)
            data.append(json.loads(result.read_text()))
        mismatches=[k for k in data[0].keys()|data[1].keys() if data[0].get(k)!=data[1].get(k)]
        # Reports and OFX component implementations must remain identical, not merely their outputs.
        original=(baseline/'frontend/src/financePlanning.tsx').read_text();candidate=(ROOT/'frontend/src/financePlanning.tsx').read_text()
        reports_equal=original.split('export function FinanceReports(){',1)[1]==candidate.split('export function FinanceReports(){',1)[1]
        ofx_equal=original.split('/** Never display',1)[1].split('export function FinanceOverview(',1)[0]==candidate.split('/** Never display',1)[1].split('export {FinanceOverview}',1)[0]
        # Strip trailing whitespace only at the extracted boundary.
        if not ofx_equal:
            ofx_equal=original.split('/** Never display',1)[1].split('export function FinanceOverview(',1)[0].strip()==candidate.split('/** Never display',1)[1].split('export {FinanceOverview}',1)[0].strip()
        protected=['backend/app/reporting.py','backend/app/services.py','backend/app/financial.py','backend/app/models.py','backend/app/schemas.py','frontend/src/api.ts','frontend/src/styles.css','frontend/src/ui.tsx','frontend/src/format.ts','frontend/src/dashboardPresentation.tsx','frontend/src/SilexDatePicker.tsx','frontend/src/SilexMonthField.tsx','frontend/src/civilDates.ts','frontend/package.json','frontend/package-lock.json','backend/requirements.txt']
        hashes={}
        for file in protected:
            old=subprocess.check_output(['git','show',base+':'+file],cwd=ROOT);new=(ROOT/file).read_bytes()
            hashes[file]={'sha256':hashlib.sha256(new).hexdigest(),'unchanged':old==new}
        record={'base':base,'snapshots':2,'comparisons':len(data[0]),'json_comparisons':sum(not k.endswith('.csv') for k in data[0]),'csv_byte_comparisons':sum(k.endswith('.csv') for k in data[0]),'mismatches':mismatches,'reports_component_unchanged':reports_equal,'ofx_component_unchanged':ofx_equal,'protected':hashes,'fixture_event_timestamp':'2026-11-07T12:00:00','normalization':'Only volatile registration/event timestamp keys; additive summary.as_of_date omitted. Civil dates, cents, IDs and CSV bytes compared unchanged.'}
        Path(args.output).write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps({k:v for k,v in record.items() if k!='protected'},indent=2))
        return int(bool(mismatches) or not reports_equal or not ofx_equal or not all(v['unchanged'] for v in hashes.values()))
if __name__=='__main__':raise SystemExit(main())
