import csv
import io
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import func, select

from app.db import ROOT
from app.models import FinanceEntry, Payment
from app.services import today
from test_app import accounts, cash, manual, post, product, draft


def movement_body(client, **changes):
    account = next(a for a in accounts(client) if a['kind']=='bank')
    sub = client.get('/api/subcategories').json()[0]
    return {'description':'Movimento de teste','direction':'income','amount_cents':1234,'account_id':account['id'],'subcategory_id':sub['id'],'posting_date':today().isoformat(),'competence_date':today().isoformat(),'document':'DOC-8','method':'pix','request_key':str(uuid4()),**changes}


def test_opening_balance_period_totals_and_pending_titles(env):
    _,client,_,_=env
    account=post(client,'/accounts',{'name':'Banco novo','kind':'bank','opening_cents':25000,'opening_date':(today()-timedelta(days=10)).isoformat()})
    pending=manual(client,value=9000)
    body=movement_body(client,account_id=account['id'])
    post(client,'/finance/movements',body)
    result=client.get('/api/finance/movements',params={'account_id':account['id'],'start':today().isoformat(),'end':today().isoformat()}).json()
    assert result['summary']=={'income_cents':1234,'expense_cents':0,'net_cents':1234,'count':1}
    assert next(a for a in accounts(client) if a['id']==account['id'])['balance_cents']==26234
    assert not any(row['entry_id']==pending['id'] for row in result['items'])
    old=client.get('/api/finance/movements',params={'start':'2000-01-01','end':'2000-01-02'}).json()
    assert old['total']==0
    assert next(a for a in accounts(client) if a['id']==account['id'])['balance_cents']==26234


def test_movement_retry_concurrency_and_reversal(env):
    app,client,_,_=env
    body=movement_body(client)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(lambda _:client.post('/api/finance/movements',json=body),range(2)))
    assert all(r.status_code==201 for r in responses)
    assert responses[0].json()['id']==responses[1].json()['id']
    assert client.post('/api/finance/movements',json={**body,'amount_cents':999}).status_code==409
    row=responses[0].json()
    for _ in range(2): post(client,f"/finance/movements/{row['id']}/reverse",{'reason':'Correção local'},200)
    result=client.get('/api/finance/movements').json()
    assert result['summary']=={'income_cents':1234,'expense_cents':1234,'net_cents':0,'count':2}
    assert len([a for a in result['items'] if a['origin']=='reversal'])==1
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(Payment.id)))==2
        assert db.scalar(select(func.count(FinanceEntry.id)))==1


def test_cash_rules_and_atomic_rollback(env):
    app,client,_,_=env
    account=next(a for a in accounts(client) if a['kind']=='cash')
    body=movement_body(client,account_id=account['id'],method='cash')
    post(client,'/finance/movements',body,409)
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(FinanceEntry.id)))==0
    register=cash(client,opening=2000)
    post(client,'/finance/movements',{**body,'posting_date':(today()-timedelta(days=1)).isoformat()},422)
    row=post(client,'/finance/movements',body)
    post(client,'/finance/movements',movement_body(client,account_id=account['id'],method='cash',direction='expense',amount_cents=9999),409)
    assert client.get('/api/finance/movements').json()['total']==1
    post(client,f"/cash-sessions/{register['id']}/close",{'counted_cents':3234},200)
    post(client,f"/finance/movements/{row['id']}/reverse",{'reason':'Caixa já fechado'},409)


def test_backdated_competence_document_origin_and_paging(env):
    _,client,_,_=env
    account=post(client,'/accounts',{'name':'Banco histórico','kind':'bank','opening_date':'2020-01-01'})
    past=(today()-timedelta(days=2)).isoformat()
    for i in range(22):
        post(client,'/finance/movements',movement_body(client,account_id=account['id'],posting_date=past,competence_date='2020-05-01',description=f'Histórico {i}',document=f'DOC-{i}',amount_cents=100,direction='expense' if i%2 else 'income'))
    first=client.get('/api/finance/movements',params={'account_id':account['id']}).json()
    assert len(first['items'])==20 and first['total']==22
    assert first['summary']=={'income_cents':1100,'expense_cents':1100,'net_cents':0,'count':22}
    second=client.get('/api/finance/movements',params={'page':2,'account_id':account['id']}).json()
    assert len(second['items'])==2 and second['summary']==first['summary']
    filters={'date_field':'competence','start':'2020-05-01','end':'2020-05-01','search_field':'document','q':'DOC-21','origin':'manual','direction':'expense'}
    result=client.get('/api/finance/movements',params=filters).json()
    assert result['total']==1 and result['items'][0]['amount_cents']==-100
    assert client.get('/api/finance/movements',params={**filters,'date_field':'posting'}).json()['total']==0
    assert client.get('/api/finance/movements',params={'has_attachment':True}).json()['total']==0
    assert client.get('/api/finance/movements',params={'has_attachment':False}).json()['total']==22
    csv_data=list(csv.reader(io.StringIO(client.get('/api/finance/movements.csv',params=filters).text.lstrip('\ufeff')),delimiter=';'))
    assert len(csv_data)==2 and csv_data[1][-1]=='-1,00'
    assert client.get('/api/finance/movements',params={'start':'2026-10-20','end':'2026-10-01'}).status_code==422
    assert client.get('/api/finance/movements',params={'date_field':'invalid'}).status_code==422


def test_catalog_edits_deactivation_and_history(env):
    _,client,_,_=env
    category=post(client,'/categories',{'name':'Compras','direction':'expense','classification':'investment','result_group':'Equipamentos'})
    sub=next(s for s in client.get('/api/subcategories').json() if s['category_id']==category['id'])
    supplier=post(client,'/suppliers',{'name':'Fornecedor fictício','document':'12.345.678/0001-99','email':'compras@example.test'})
    body=movement_body(client,direction='expense',subcategory_id=sub['id'],supplier_id=supplier['id'])
    post(client,'/finance/movements',body)
    account=next(a for a in accounts(client) if a['id']==body['account_id'])
    account_fields={k:v for k,v in account.items() if k not in ('id','balance_cents')}
    assert client.put(f"/api/accounts/{account['id']}",json={**account_fields,'opening_cents':100}).status_code==409
    assert client.put(f"/api/accounts/{account['id']}",json={**account_fields,'name':'Banco renomeado','active':False}).status_code==200
    post(client,'/finance/movements',{**body,'request_key':str(uuid4())},409)
    assert client.get('/api/finance/movements').json()['items'][0]['account_name']=='Banco renomeado'
    assert client.put(f"/api/categories/{category['id']}",json={'name':'Compras','direction':'income'}).status_code==409
    assert client.put(f"/api/categories/{category['id']}",json={'name':'Compras','direction':'expense','active':False}).status_code==200
    assert client.put(f"/api/subcategories/{sub['id']}",json={'name':'Geral','category_id':client.get('/api/categories').json()[0]['id']}).status_code==409
    assert client.put(f"/api/suppliers/{supplier['id']}",json={'name':'Fornecedor fictício','document':supplier['document'],'active':False}).status_code==200
    assert client.get('/api/suppliers',params={'active':False}).json()['total']==1
    assert client.get('/api/finance/movements').json()['items'][0]['supplier_name']=='Fornecedor fictício'


def test_category_supplier_validation_and_permissions(env):
    _,client,operator,anonymous=env
    category=post(client,'/categories',{'name':'Somente despesas','direction':'expense'})
    sub=next(s for s in client.get('/api/subcategories').json() if s['category_id']==category['id'])
    post(client,'/finance/movements',movement_body(client,subcategory_id=sub['id']),422)
    assert client.put(f"/api/subcategories/{sub['id']}",json={'name':'Desativada','category_id':category['id'],'active':False}).status_code==200
    post(client,'/finance/movements',movement_body(client,direction='expense',subcategory_id=sub['id']),409)
    assert post(client,'/accounts',{'name':'Limite','kind':'bank','opening_cents':-1000})['opening_cents']==-1000
    post(client,'/accounts',{'name':'Caixa negativo','kind':'cash','opening_cents':-1},422)
    post(client,'/accounts',{'name':'Futuro','kind':'bank','opening_date':(today()+timedelta(days=1)).isoformat()},422)
    for path in ('/finance/movements','/finance/movements.csv','/suppliers','/subcategories'):
        assert operator.get('/api'+path).status_code==403
        assert anonymous.get('/api'+path).status_code==401
    post(operator,'/finance/movements',movement_body(client),403)


def test_migration_0002_preserves_ids_values_foreign_keys_and_manaus(tmp_path,monkeypatch):
    database=tmp_path/'legacy.sqlite3'
    monkeypatch.setenv('GESTAO_DATABASE_URL',f'sqlite:///{database}')
    config=Config(str(ROOT/'backend'/'alembic.ini'))
    command.upgrade(config,'0002')
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO users VALUES(17,'Legado','legado','hash','admin',1)")
        db.execute("INSERT INTO accounts VALUES(23,'Banco legado','bank')")
        db.execute("INSERT INTO categories VALUES(29,'Categoria legada')")
        db.execute("INSERT INTO finance_entries(id,description,direction,amount_cents,status,account_id,category_id,user_id,due_date,created_at,settled_at) VALUES(31,'Pagamento legado','income',4567,'paid',23,29,17,'2026-10-12','2026-10-13 02:00:00','2026-10-13 03:00:00')")
        db.execute("INSERT INTO payments(id,entry_id,account_id,amount_cents,method,user_id,created_at) VALUES(37,31,23,4567,'pix',17,'2026-10-13 03:00:00')")
    command.upgrade(config,'head')
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT id,amount_cents,posting_date,competence_date FROM payments').fetchone()==(37,4567,'2026-10-12','2026-10-12')
        assert db.execute('SELECT id,amount_cents,status FROM finance_entries').fetchone()==(31,4567,'paid')
        assert db.execute('SELECT opening_cents FROM accounts').fetchone()==(0,)
        assert db.execute('SELECT name,category_id FROM subcategories').fetchone()==('Geral',29)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
        assert db.execute("SELECT count(*) FROM pragma_foreign_key_list('finance_entries') WHERE \"table\" IN ('subcategories','suppliers')").fetchone()==(2,)


def test_automatic_sale_respects_inactive_category_and_rolls_back(env):
    app,client,_,_=env
    item=product(client)
    cash(client)
    sale=draft(client,[(item,1000)])
    category=next(c for c in client.get('/api/categories').json() if c['name']=='Vendas')
    assert client.put(f"/api/categories/{category['id']}",json={'name':'Vendas','active':False}).status_code==200
    post(client,f"/sales/{sale['id']}/finalize",{'method':'pix'},409)
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(Payment.id)))==0
        assert db.scalar(select(func.count(FinanceEntry.id)))==0
    assert client.get('/api/products').json()['items'][0]['stock_milli']==10000
    assert client.put(f"/api/categories/{category['id']}",json={'name':'Vendas','active':True}).status_code==200
    sub=next(s for s in client.get('/api/subcategories').json() if s['category_id']==category['id'])
    assert client.put(f"/api/subcategories/{sub['id']}",json={'name':'Geral','category_id':category['id'],'active':False}).status_code==200
    post(client,f"/sales/{sale['id']}/finalize",{'method':'pix'},409)
    assert client.get('/api/products').json()['items'][0]['stock_milli']==10000
