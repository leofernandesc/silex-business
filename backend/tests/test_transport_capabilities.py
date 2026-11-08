"""Module boundaries, ownership, historical finance and secure provisioning (temporary DBs)."""
import secrets
import getpass
import sqlite3
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import ROOT
from app.models import User
from app.services import today
from app.transport_admin import provision_sammya


@pytest.fixture
def accounts(env):
    from app.api import passwords
    app, admin, operator, anonymous = env
    secret = secrets.token_urlsafe(24)
    password_hash = passwords.hash(secret)
    with app.state.sessions() as db:
        demo = User(name="Generic demo", username="demo.restricted.admin", role="admin", password_hash=password_hash)
        sammya = User(name="Synthetic authorized", username="sammya", role="admin", password_hash=password_hash, transport_operations=True)
        second = User(name="Other identity", username="other.transport", role="admin", password_hash=password_hash, transport_operations=True)
        db.add_all([demo, sammya, second]); db.commit()
    with TestClient(app) as demo, TestClient(app) as sammya, TestClient(app) as second:
        for client, username in [(demo,"demo.restricted.admin"),(sammya,"sammya"),(second,"other.transport")]:
            assert client.post('/api/auth/login',json={'username':username,'password':secret}).status_code == 200
        yield {'app':app,'admin':admin,'operator':operator,'anonymous':anonymous,'demo':demo,'sammya':sammya,'second':second,'login_sammya':lambda: sammya.post('/api/auth/login',json={'username':'sammya','password':secret})}


def partner(client, kind='subcontracted_freight'):
    response=client.post('/api/suppliers',json={'name':'Synthetic provider '+secrets.token_hex(3),'kind':kind})
    assert response.status_code == 201, response.text
    return response.json()


def order(client, freight):
    c=client.post('/api/customers',json={'name':'Synthetic customer'}).json()
    payload={'customer_id':c['id'],'description':'Generic service with historical transport cost','service_date':today().isoformat(),'negotiated_cents':123456,'costs':[{'kind':'subcontracted_freight','supplier_id':freight['id'],'agreed_amount_cents':12345}]}
    r=client.post('/api/service-orders',json=payload);assert r.status_code==201,r.text
    return r.json(),payload


@pytest.mark.parametrize('who,status',[('sammya',200),('second',200),('demo',403),('admin',403),('operator',403),('anonymous',401)])
def test_backend_module_boundary_and_account_capabilities(accounts,who,status):
    client=accounts[who]
    assert client.get('/api/suppliers?kind=subcontracted_freight').status_code==status
    r=client.post('/api/suppliers',json={'name':'New freight','kind':'subcontracted_freight'})
    assert r.status_code==(201 if status==200 else status)
    me=client.get('/api/auth/me')
    if who!='anonymous':
        assert me.json()['capabilities']==(['transport_operations'] if who in ('sammya','second') else [])
        assert 'transport_operations' not in me.json()  # Internal DB flag is not a writable public contract.
    if who in ('demo','admin','sammya'):
        for path in ['/api/users','/api/finance','/api/service-orders','/api/accounts','/api/finance/dashboard']:
            assert client.get(path).status_code==200


def test_capability_cannot_be_self_granted_and_rechecked_on_each_request(accounts):
    admin=accounts['admin'];app=accounts['app'];s=accounts['sammya']
    for field,value in [('capabilities',['transport_operations']),('transport_operations',True)]:
        assert admin.post('/api/users',json={'name':'No escalation','username':'no.escalation','role':'admin','password':secrets.token_urlsafe(20),field:value}).status_code==422
    uid=s.get('/api/auth/me').json()['id']
    with app.state.sessions() as db:
        db.get(User,uid).transport_operations=False;db.commit()
    assert s.get('/api/auth/me').json()['capabilities']==[]
    assert s.get('/api/suppliers?kind=subcontracted_freight').status_code==403
    with app.state.sessions() as db:
        u=db.get(User,uid);u.transport_operations=True;u.role='operator';db.commit()
    assert s.get('/api/auth/me').json()['capabilities']==[]
    assert s.get('/api/suppliers?kind=subcontracted_freight').status_code==403
    with app.state.sessions() as db:
        u=db.get(User,uid);u.role='admin';u.active=False;db.commit()
    assert s.get('/api/auth/me').status_code==401
    assert s.get('/api/suppliers?kind=subcontracted_freight').status_code==401


def test_customer_details_are_owned_by_id_and_generic_edits_preserve_them(accounts):
    s,d,o=accounts['sammya'],accounts['demo'],accounts['second']
    addr={key:'X' for key in ('postal_code','street','address_number','complement','neighborhood','city','state')}
    details={'collection_address':addr,'delivery_address':{**addr,'street':'Independent destination'},'service_type':'interstate'}
    r=s.post('/api/customers',json={'name':'Preserved customer','street':'Legacy street','service_details':details});assert r.status_code==201
    row=r.json();cid=row['id']
    assert row['service_details']['collection_address']==addr
    assert row['service_details']['delivery_address']['street']=='Independent destination'
    assert d.put(f'/api/customers/{cid}',json={'name':'Edited generic'}).status_code==200
    assert 'service_details' not in d.get('/api/customers').json()['items'][0]
    assert d.put(f'/api/customers/{cid}',json={'name':'Denied','service_details':details}).status_code==403
    assert o.get('/api/customers').json()['items'][0]['service_details']['collection_address']['street']==''
    assert s.get('/api/customers').json()['items'][0]['service_details']==row['service_details']
    with accounts['app'].state.sessions() as db:
        u=db.scalar(select(User).where(User.username=='sammya'));u.username='renamed.identity';db.commit()
    assert s.get('/api/auth/me').json()['capabilities']==['transport_operations']
    assert s.get('/api/customers').json()['items'][0]['service_details']==row['service_details']


def test_freight_catalog_and_historical_orders_without_losing_financial_data(accounts):
    s,d=accounts['sammya'],accounts['demo'];freight=partner(s)
    assert d.get('/api/suppliers').json()['total']==0
    assert d.put(f"/api/suppliers/{freight['id']}",json={'name':'Smuggled','kind':'supplier'}).status_code==403
    assert d.post('/api/suppliers',json={'name':'Smuggled','kind':'subcontracted_freight','capabilities':['transport_operations']}).status_code==422
    worker=partner(d,'day_worker');partner(d,'supplier')
    historical,payload=order(s,freight);oid=historical['id']
    other=accounts['second']
    assert other.get(f'/api/service-orders/{oid}').json()['costs']==[]
    assert other.put(f'/api/service-orders/{oid}',json=payload).status_code==403
    view=d.get(f'/api/service-orders/{oid}').json()
    assert view['costs']==[] and view['restricted_transport_costs']
    assert view['expected_cost_cents']==12345 and view['expected_result_cents']==111111
    assert d.put(f'/api/service-orders/{oid}',json={**payload,'costs':[]}).status_code==403
    bank=next(x for x in s.get('/api/accounts').json() if x['kind']=='bank')
    generation={'account_id':bank['id'],'due_date':today().isoformat(),'competence_date':today().isoformat()}
    assert d.post(f'/api/service-orders/{oid}/generate-titles',json=generation).status_code==403
    assert d.post(f'/api/service-orders/{oid}/cancel',json={'reason':'Forbidden operation'}).status_code==403
    assert s.post(f'/api/service-orders/{oid}/generate-titles',json=generation).status_code==200
    for path in ['/api/finance','/api/reports/finance.csv','/api/finance/reports/payable-open','/api/finance/reports/payable-open.csv']:
        assert d.get(path).content==s.get(path).content
    for path in ['/api/finance','/api/finance/print','/api/reports/finance.csv','/api/finance/reports/payable-open','/api/finance/reports/payable-open.csv','/api/finance/budgets?year=2026&month=1']:
        sep='&' if '?' in path else '?'
        assert d.get(path+sep+'supplier_kind=subcontracted_freight').status_code==403
    cat=next(x for x in d.get('/api/categories').json() if x['direction'] in ('expense','both'))
    assert d.post('/api/finance',json={'description':'Denied new freight','direction':'expense','amount_cents':100,'account_id':bank['id'],'category_id':cat['id'],'supplier_id':freight['id'],'due_date':today().isoformat()}).status_code==403
    generic={**payload,'costs':[{'kind':'day_worker','supplier_id':worker['id'],'quantity_milli':1000,'agreed_amount_cents':3500}]}
    r=d.post('/api/service-orders',json=generic);assert r.status_code==201,r.text
    assert d.post(f"/api/service-orders/{r.json()['id']}/generate-titles",json=generation).status_code==200


def test_secure_provisioning_creates_reuses_and_preserves_demo(env,monkeypatch):
    app,admin,_,_=env
    with app.state.sessions() as db:
        demo=User(username='demo.restricted.admin',name='Demo',role='admin',password_hash='unchanged-hash');db.add(demo);db.commit();did=demo.id
    secret=secrets.token_urlsafe(24)
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    with patch('builtins.input',return_value='sammya'),patch('getpass.getpass',return_value=secret):provision_sammya()
    with TestClient(app) as c:
        r=c.post('/api/auth/login',json={'username':'sammya','password':secret});assert r.status_code==200
        assert r.json()['role']=='admin' and r.json()['active'] and r.json()['capabilities']==['transport_operations'];sid=r.json()['id']
    with TestClient(app) as c:
        c.post('/api/auth/login',json={'username':'sammya','password':secret})
        owned=c.post('/api/customers',json={'name':'Preserved during provisioning','service_details':{'start_address':'Legacy owned text'}}).json()
    with app.state.sessions() as db:
        u=db.get(User,sid);before=u.password_hash;u.username='sammya.previous';u.active=False;db.commit()
    with pytest.raises(SystemExit,match='identidades anteriores'),patch('builtins.input',return_value='sammya'):provision_sammya()
    with patch('builtins.input',return_value='sammya'),patch('getpass.getpass',side_effect=AssertionError('Existing password must not be prompted/replaced')):provision_sammya(sid)
    with app.state.sessions() as db:
        assert db.get(User,sid).password_hash==before and db.get(User,sid).username=='sammya'
        from app.models import CustomerServiceDetails
        assert db.scalar(select(CustomerServiceDetails).where(CustomerServiceDetails.user_id==sid,CustomerServiceDetails.customer_id==owned['id'])).start_address=='Legacy owned text'
        demo=db.get(User,did);assert demo.username=='demo.restricted.admin' and demo.password_hash=='unchanged-hash' and not demo.transport_operations
    with pytest.raises(SystemExit,match='Demo'):provision_sammya(did)
    with pytest.raises(SystemExit,match='entrada protegida'),patch('builtins.input',return_value='sammya'),patch('getpass.getpass',side_effect=getpass.GetPassWarning('No secure input')):
        provision_sammya(sid,reset_password=True)
    with app.state.sessions() as db:
        assert db.get(User,sid).password_hash==before
    monkeypatch.setattr('sys.stdin.isatty',lambda:False)
    with pytest.raises(SystemExit,match='terminal interativo'):provision_sammya()


def test_additive_migration_preserves_every_legacy_column_and_defaults_disabled(env,accounts):
    app=accounts['app'];s=accounts['sammya'];freight=partner(s);row,_=order(s,freight)
    s.post('/api/customers',json={'name':'Historical metadata','service_details':{'start_address':'Retained text','collection_address':{'street':'Retained structured'}}})
    with app.state.sessions() as db:
        from app.models import CustomerServiceDetails
        did=db.scalar(select(User.id).where(User.username=='demo.restricted.admin'))
        db.add(CustomerServiceDetails(customer_id=row['customer_id'],user_id=did,start_address='Demo legacy metadata retained; never transferred'))
        db.commit()
    path=app.state.engine.url.database;app.state.engine.dispose()
    cfg=Config(str(ROOT/'backend/alembic.ini'))
    # Build a realistic populated 0012 fixture; downgrade is ONLY in this disposable test DB.
    command.downgrade(cfg,'0012')
    with sqlite3.connect(path) as db:
        tables=[r[0] for r in db.execute("select name from sqlite_master where type='table' and name not in ('alembic_version','sqlite_sequence')")]
        cols={t:[r[1] for r in db.execute(f'pragma table_info("{t}")')] for t in tables}
        before={t:db.execute(f'select * from "{t}"').fetchall() for t in tables}
    command.upgrade(cfg,'head');command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        for table in tables:
            selection=','.join(f'"{c}"' for c in cols[table])
            assert db.execute(f'select {selection} from "{table}"').fetchall()==before[table]
        assert set(r[0] for r in db.execute('select transport_operations from users'))=={0}
        assert db.execute('pragma integrity_check').fetchone()==('ok',)
        assert not db.execute('pragma foreign_key_check').fetchall()


def test_new_freight_associations_in_ledger_and_ofx_are_blocked_atomically(accounts):
    from test_finance_expansion import ofx
    d,s=accounts['demo'],accounts['sammya'];freight=partner(s)
    bank=next(a for a in d.get('/api/accounts').json() if a['kind']=='bank')
    cat=next(c for c in d.get('/api/categories').json() if c['direction'] in ('expense','both'))
    sub=next(c for c in d.get('/api/subcategories').json() if c['category_id']==cat['id'])
    body={'description':'Denied specialized beneficiary','direction':'expense','amount_cents':1000,'account_id':bank['id'],'subcategory_id':sub['id'],'posting_date':today().isoformat(),'competence_date':today().isoformat(),'method':'pix','request_key':secrets.token_hex(16),'supplier_id':freight['id']}
    before=d.get('/api/accounts').content
    assert d.post('/api/finance/movements',json=body).status_code==403
    imported=d.post(f"/api/finance/ofx/imports?account_id={bank['id']}",content=ofx('SYNTHETIC-DENIED',-1000).encode(),headers={'Content-Type':'application/x-ofx','X-Statement-Name':'synthetic.ofx'})
    assert imported.status_code==201,imported.text
    statement=imported.json()
    result=d.post(f"/api/finance/ofx/imports/{statement['id']}/items/{statement['items'][0]['id']}/confirm",json={'create_title':True,'category_id':cat['id'],'subcategory_id':sub['id'],'supplier_id':freight['id']})
    assert result.status_code==403,result.text
    assert d.get('/api/finance').json()['total']==0
    assert d.get('/api/finance/movements').json()['total']==0
    assert d.get('/api/accounts').content==before
    current=d.get(f"/api/finance/ofx/imports/{statement['id']}").json()
    assert current['items'][0]['status']=='pending'


def test_provisioning_requires_fresh_login_without_resetting_existing_password(accounts,monkeypatch):
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    with patch('builtins.input',return_value='sammya'),patch('getpass.getpass',side_effect=AssertionError('Do not reset a valid password implicitly')):
        provision_sammya()
    s=accounts['sammya'];d=accounts['demo']
    assert s.get('/api/auth/me').status_code==401
    assert accounts['login_sammya']().status_code==200
    assert d.get('/api/auth/me').status_code==200
    assert d.get('/api/auth/me').json()['capabilities']==[]
