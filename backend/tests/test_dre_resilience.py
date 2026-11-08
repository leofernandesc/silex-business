"""Economic read model: transactional recovery and bounded query count on disposable data."""
import json
import os
import sqlite3
from pathlib import Path
from time import perf_counter
from datetime import datetime,date,timezone
from alembic import command
from alembic.config import Config
from alembic.operations import Operations
from sqlalchemy import select,event
import pytest
from app import services as V
from app.db import ROOT
from app.models import Account,Category,FinanceEntry,User,Sale,SaleItem,Product
from test_finance_expansion import title,post,ofx
from test_dre_api import mapping,recognize,period


def test_interruption_during_completion_schema_rolls_back_entire_upgrade(tmp_path,monkeypatch):
    path=tmp_path/'interrupted.sqlite3';monkeypatch.setenv('GESTAO_DATABASE_URL',f'sqlite:///{path}')
    cfg=Config(str(ROOT/'backend/alembic.ini'));command.upgrade(cfg,'0013')
    with sqlite3.connect(path) as db:
        before=[r[1] for r in db.execute('PRAGMA table_info(service_orders)')]
    execute=Operations.execute
    def interrupted(self,statement,*args,**kwargs):
        result=execute(self,statement,*args,**kwargs)
        if str(statement).startswith('ALTER TABLE service_orders ADD COLUMN completed_on'):
            raise RuntimeError('Synthetic interruption in completion schema')
        return result
    with monkeypatch.context() as patch:
        patch.setattr(Operations,'execute',interrupted)
        with pytest.raises(RuntimeError,match='Synthetic interruption'):command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT version_num FROM alembic_version').fetchone()==('0013',)
        assert [r[1] for r in db.execute('PRAGMA table_info(service_orders)')]==before
        assert db.execute("SELECT name FROM sqlite_master WHERE name='dre_category_mapping_history'").fetchall()==[]
    command.upgrade(cfg,'head');command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_batch_read_does_not_make_a_query_per_source(env):
    app,admin,*_=env
    with app.state.sessions() as db:
        category=db.scalar(select(Category).where(Category.name=='Outras receitas'))
        account=db.scalar(select(Account));actor=db.scalar(select(User).where(User.role=='admin'))
        db.add_all([FinanceEntry(description=f'Synthetic bulk {i}',direction='income',amount_cents=10001+i,account_id=account.id,category_id=category.id,user_id=actor.id,due_date=V.today(),competence_date=V.today()) for i in range(1000)])
        db.commit();engine=db.bind
    queries=[]
    def count(_conn,_cursor,statement,_parameters,_context,_many):
        if statement.lstrip().upper().startswith('SELECT'):queries.append(statement)
    event.listen(engine,'before_cursor_execute',count)
    try:
        started=perf_counter();response=admin.get('/api/finance/dre',params=period());elapsed=perf_counter()-started
    finally:event.remove(engine,'before_cursor_execute',count)
    assert response.status_code==200,response.text
    assert len(response.json()['issues'])==1000
    assert len(queries)<=25, len(queries)
    assert elapsed<5,elapsed
    target=os.environ.get('SILEX_DRE_PERFORMANCE_OUTPUT')
    if target:Path(target).write_text(json.dumps({'synthetic_sources':1000,'select_queries':len(queries),'elapsed_seconds':elapsed,'status':response.status_code})+'\n')


def test_sale_uses_manaus_economic_day_instead_of_title_or_payment_month(env,monkeypatch):
    app,admin,*_=env
    monkeypatch.setattr(V,'today',lambda:date(2026,12,1))
    with app.state.sessions() as db:
        for a in db.scalars(select(Account)):a.opening_date=date(2026,11,1)
        actor=db.scalar(select(User).where(User.username=='admin'))
        product=Product(code='DRE-TZ',description='Fictício',kind='product',price_cents=10001)
        db.add(product);db.flush()
        sale=Sale(user_id=actor.id,total_cents=10001,status='finalized',finalized_at=datetime(2026,12,1,3,30))
        db.add(sale);db.flush();sale_id=sale.id
        db.add(SaleItem(sale_id=sale.id,product_id=product.id,description='Fictício',unit='UN',quantity_milli=1000,unit_price_cents=10001,total_cents=10001))
        db.commit()
    entry=title(admin,'income',10001,due=date(2026,12,1))
    with app.state.sessions() as db:db.get(FinanceEntry,entry['id']).sale_id=sale_id;db.commit()
    mapping(admin,entry)
    november={'start':'2026-11-01','end':'2026-11-30'}
    before=admin.get('/api/finance/dre',params=november).json()
    assert before['facts'][0]['economic_date']=='2026-11-30'
    assert before['facts'][0]['amount_cents']==10001
    post(admin,f"/finance/{entry['id']}/settle",{'method':'pix','account_id':entry['account_id'],'principal_cents':3001,'request_key':'dre-cross-month-partial'},200)
    assert admin.get('/api/finance/dre',params=november).json()['facts']==before['facts']
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==[]


def test_ofx_match_and_replay_do_not_duplicate_recognized_principal(env):
    _,admin,*_=env
    entry=title(admin,'income',10001);mapping(admin,entry);recognize(admin,f"finance_entry:{entry['id']}:principal")
    before=admin.get('/api/finance/dre',params=period()).json()['facts']
    response=admin.post('/api/finance/ofx/imports',params={'account_id':entry['account_id']},content=ofx('DRE-SYNTHETIC-OFX',10001).encode(),headers={'Content-Type':'application/x-ofx'})
    assert response.status_code==201,response.text
    statement=response.json();item=statement['items'][0]
    path=f"/api/finance/ofx/imports/{statement['id']}/items/{item['id']}/confirm"
    payload={'entry_id':entry['id']}
    assert admin.post(path,json=payload).status_code==200
    assert admin.post(path,json=payload).status_code==200
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==before


def test_cancellation_review_uses_manaus_day_without_erasing_original_fact(env,monkeypatch):
    app,admin,*_=env
    monkeypatch.setattr(V,'today',lambda:date(2026,12,1))
    entry=title(admin,'income',10001,due=date(2026,12,1));mapping(admin,entry)
    recognize(admin,f"finance_entry:{entry['id']}:principal",economic_date='2026-11-15')
    november={'start':'2026-11-01','end':'2026-11-30'}
    original=admin.get('/api/finance/dre',params=november).json()['facts']
    with app.state.sessions() as db:
        row=db.get(FinanceEntry,entry['id']);row.status='canceled';row.canceled_at=datetime(2026,12,1,3,30);db.commit()
    after=admin.get('/api/finance/dre',params=november).json()
    assert after['facts']==original
    assert any('economic_cancellation_review_required' in i['codes'] for i in after['issues'])
    december=admin.get('/api/finance/dre',params=period()).json()
    assert not any('economic_cancellation_review_required' in i['codes'] for i in december['issues'])
