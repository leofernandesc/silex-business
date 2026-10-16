from pathlib import Path
import os,sys,json,subprocess
from datetime import datetime,date
R=Path(__file__).resolve().parents[3];E=Path(os.environ.get('SILEX_PRINT_EVIDENCE', R/'docs/evidence/financial-print-ptbr'));cfg=json.loads((E/'baseline.json').read_text());W=Path(cfg['work']);P=W/'baseline';dbfile=W/'synthetic.sqlite3'
assert str(W).startswith('/tmp/silex-print-ptbr-') and not dbfile.exists()
os.environ['GESTAO_DATABASE_URL']=f'sqlite:///{dbfile}';os.environ['PYTHONPATH']=str(P/'backend');sys.path.insert(0,str(P/'backend'))
for cmd in ['init','seed-demo']:
 subprocess.run([R/'.venv/bin/python','-m','app.cli',cmd],cwd=P,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
from fastapi.testclient import TestClient
from app.api import create_app
from app.db import build_engine
from app.models import CompanySetting,Sale,Account
from sqlalchemy import select
app=create_app(build_engine(),serve_frontend=False)
with TestClient(app) as c:
 assert c.post('/api/auth/login',json={'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']}).status_code==200
 def req(method,path,**kwargs):
  r=c.request(method,'/api'+path,**kwargs);assert r.is_success,(path,r.status_code,r.text);return r.json()
 accounts=req('GET','/accounts');bank=next(a for a in accounts if a['kind']=='bank');cats=req('GET','/categories');subs=req('GET','/subcategories');titles=[];movements=[]
 # Historical payment cases require an account whose opening reference precedes them.
 with app.state.sessions() as db:
  db.get(Account,bank['id']).opening_date=date(2020,1,1);db.commit()
 for i in range(26):
  direction='income' if i%2==0 else 'expense';cat=next(a for a in cats if a['name']==('Outras receitas' if direction=='income' else 'Despesas operacionais'))
  dates=['2024-02-29','2026-01-31','2026-02-01','2026-12-31','2027-01-01']
  title=req('POST','/finance',json={'description':f'P05 impressão fictícia {i:02d} — Empresa Cliente de Comércio e Serviços com Nome Extenso','direction':direction,'amount_cents':123456789+i if i else 1,'account_id':bank['id'],'category_id':cat['id'],'due_date':dates[i%5],'competence_date':dates[(i+1)%5],'document':f'P05-FICT-{i:02d}'})
  titles.append(title)
  if i<6:
   sub=next(s for s in subs if s['category_id']==cat['id']);movements.append(req('POST','/finance/movements',json={'description':f'P05 movimento fictício {i} — identificação extensa para impressão','direction':direction,'amount_cents':123456789+i if i else 1,'account_id':bank['id'],'subcategory_id':sub['id'],'posting_date':['2024-02-29','2026-01-31','2026-02-01','2025-12-31','2026-01-01'][i%5],'competence_date':dates[(i+1)%5],'document':'' if i==0 else f'MOV-P05-{i}','request_key':f'p05-print-fixture-{i:02d}'}))
 # Exercise an existing financial state with charges without changing any rule.
 req('POST',f"/finance/{titles[1]['id']}/settle",json={'method':'pix','account_id':bank['id'],'principal_cents':12345,'interest_cents':7,'fine_cents':3,'discount_cents':1,'posting_date':'2026-01-31','request_key':'p05-print-partial-payment'})
 products=[]
 for i in range(24):
  products.append(req('POST','/products',json={'code':f'PRINT-P05-{i:02d}','description':f'Serviço fictício de conferência de impressão {i:02d} com descrição extensa','kind':'service','unit':'UN','price_cents':123456789 if i==0 else 101+i}))
 customers=req('GET','/customers',params={'page_size':100})['items'];customer=customers[0]
 sale=req('POST','/sales',json={'customer_id':customer['id'],'discount_cents':13,'items':[{'product_id':p['id'],'quantity_milli':1000,'unit_price_cents':p['price_cents']} for p in products]})
 sale=req('POST',f"/sales/{sale['id']}/finalize",json={'method':'credit','due_date':'2027-01-01'})
 with app.state.sessions() as db:
  settings=db.scalar(select(CompanySetting)) or CompanySetting(id=1);db.add(settings);settings.company_name='Empresa Cliente Fictícia com Nome Extenso';settings.brand_name='Apresentação Legada Fictícia'
  db.get(Sale,sale['id']).created_at=datetime(2026,1,1,2,30);db.commit()
 (E/'fixture.json').write_text(json.dumps({'database':str(dbfile),'synthetic_only':True,'persistent_database_used':False,'sale_id':sale['id'],'titles':titles,'movements':movements,'account_id':bank['id']},indent=2))
print('Disposable synthetic fixture prepared; 26 titles, 6 signed movements, 24-item credit sale.')
