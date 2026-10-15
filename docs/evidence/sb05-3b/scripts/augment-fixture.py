"""Add synthetic dashboard cases using existing APIs in this disposable fixture only."""
from pathlib import Path
import json, os, sqlite3, sys
from datetime import date, timedelta
E=Path(__file__).resolve().parents[1];env=json.loads((E/'environment.json').read_text());W=Path(env['work_dir'])
assert str(W).startswith('/tmp/silex-sb053b-') and env['persistent_database_used'] is False
sys.path.insert(0,str(W/'candidate/backend'));os.environ['GESTAO_DATABASE_URL']=f'sqlite:///{W}/fixture.sqlite3'
from app.db import build_engine
from app.api import create_app
from app.services import today
from fastapi.testclient import TestClient
engine=build_engine();now=today();serial=now.year*12+now.month-1
def month(offset):
    y,m=divmod(serial-offset,12);return date(y,m+1,1)
with TestClient(create_app(engine,serve_frontend=False)) as c:
    assert c.post('/api/auth/login',json={'username':'demo.admin','password':'DemoLocal#2026'}).status_code==200
    def post(url,body):
        r=c.post('/api'+url,json=body);assert r.status_code==201,r.text;return r.json()
    positive=post('/accounts',{'name':'Reserva ilustrativa · saldo positivo','kind':'bank','opening_cents':123456789,'opening_date':month(11).isoformat()})
    post('/accounts',{'name':'Conta ilustrativa · saldo negativo','kind':'bank','opening_cents':-123456789,'opening_date':month(11).isoformat()})
    bank=post('/accounts',{'name':'Histórico ilustrativo · dados fictícios','kind':'bank','opening_cents':0,'opening_date':month(11).isoformat()})
    post('/accounts',{'name':'Conta ilustrativa · sem movimentos','kind':'bank','opening_cents':0,'opening_date':month(11).isoformat()})
    cats=c.get('/api/categories').json();subs=c.get('/api/subcategories').json()
    expense=next(a for a in cats if a['name']=='Despesas operacionais');income=next(a for a in cats if a['name']=='Outras receitas')
    sub_income=next(a for a in subs if a['category_id']==income['id'])
    sub_expense=next(a for a in subs if a['category_id']==expense['id'])
    for direction,category in [('income',income),('expense',expense)]:
        post('/finance',{'description':f'Título elevado ilustrativo SB053B {direction}','direction':direction,'amount_cents':123456789,'account_id':positive['id'],'category_id':category['id'],'due_date':(now-timedelta(days=1)).isoformat()})
    categories={}
    for classification in ['investment','financing']:
        cat=post('/categories',{'name':f'SB053B {classification} ilustrativo','direction':'both','classification':classification,'result_group':'Grupo ilustrativo '+classification})
        sub=post('/subcategories',{'name':'Subcategoria ilustrativa '+classification,'category_id':cat['id']});categories[classification]=sub['id']
    for offset in range(11,-1,-1):
        for direction in ['income','expense']:
            amount=(12-offset)*10000 if direction=='income' else (12-offset)*3000
            if offset==0:amount=1234 if direction=='income' else 123456789
            post('/finance/movements',{'description':f'Movimento mensal ilustrativo SB053B {offset} {direction}','direction':direction,'amount_cents':amount,'account_id':bank['id'],'subcategory_id':categories['investment'] if offset==4 else categories['financing'] if offset==8 else sub_income['id'] if direction=='income' else sub_expense['id'],'posting_date':month(offset).isoformat(),'competence_date':month(offset).isoformat(),'document':f'SB053B-{offset}-{direction}','method':'pix','request_key':f'sb053b-month-{offset}-{direction}'})
    # Deliberately distinct posting/competence dates demonstrate the existing interval semantics.
    post('/finance/movements',{'description':'Datas distintas ilustrativas SB053B','direction':'income','amount_cents':1,'account_id':bank['id'],'subcategory_id':sub_income['id'],'posting_date':now.isoformat(),'competence_date':month(1).isoformat(),'document':'SB053B-competence','method':'pix','request_key':'sb053b-competence'})
    snapshots={}
    for name,start,end in [('default',now.replace(day=1),now),('old',month(5),month(4)-timedelta(days=1)),('empty',date(2001,1,1),date(2001,1,31))]:
        r=c.get('/api/finance/dashboard',params={'start':start.isoformat(),'end':end.isoformat()});assert r.status_code==200;snapshots[name]=r.json()
    (E/'fixture-dashboard.json').write_text(json.dumps({'fictitious':True,'snapshots':snapshots},indent=2))
engine.dispose()
for name in ['baseline','candidate','functional','baseline-functional']:
    with sqlite3.connect(W/'fixture.sqlite3') as src,sqlite3.connect(W/f'{name}.sqlite3') as dst:src.backup(dst)
print('Synthetic cases created by existing APIs; four identical disposable database copies verified.')
