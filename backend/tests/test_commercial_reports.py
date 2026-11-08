"""Independent expectations for report filters and their existing classification semantics."""
import csv
import io
from datetime import datetime,date
from sqlalchemy import select
from app.models import FinanceEntry,Subcategory
from test_finance_expansion import title,post


def test_document_report_period_is_the_same_posting_day_in_manaus(env):
    app,admin,_,_=env
    entries=[title(admin,'income',amount,document=f'DOC-{amount}') for amount in [101,202,303]]
    with app.state.sessions() as db:
        for row,created in zip(entries,[datetime(2026,1,31,3,59,59),datetime(2026,1,31,4),datetime(2026,2,1,4)]):
            db.get(FinanceEntry,row['id']).created_at=created
        db.commit()
    response=admin.get('/api/finance/reports/documents?start=2026-01-31&end=2026-01-31')
    assert response.status_code==200
    assert [r['id'] for r in response.json()['items']]==[entries[1]['id']]
    output=admin.get('/api/finance/reports/documents.csv?start=2026-01-31&end=2026-01-31')
    rows=list(csv.DictReader(io.StringIO(output.content.decode('utf-8-sig')),delimiter=';'))
    assert [int(r['id']) for r in rows]==[entries[1]['id']]


def test_result_report_honors_non_result_subcategory_without_changing_cash(env):
    app,admin,_,_=env
    normal=title(admin,'income',10001)
    category=normal['category_id']
    sub=post(admin,'/subcategories',{'name':'Fora do resultado fictício','category_id':category,'affects_result':False})
    excluded=title(admin,'income',2345,subcategory_id=sub['id'])
    for row in [normal,excluded]:
        assert admin.post(f"/api/finance/{row['id']}/settle",json={'method':'pix','account_id':row['account_id']}).status_code==200
    dashboard=admin.get('/api/finance/dashboard').json()
    assert dashboard['income_cents']==12346
    assert sum(r['income_cents'] for r in dashboard['result_groups'])==10001
    report=admin.get('/api/finance/reports/result-monthly').json()
    assert sum(r['income_cents'] for r in report['items'])==10001
    assert sum(r['net_cents'] for r in report['items'])==10001
    assert sum(r['income_cents'] for r in admin.get('/api/finance/reports/cash-monthly').json()['items'])==12346


def test_global_budget_does_not_silently_accept_an_account_filter(env):
    _,admin,_,_=env
    account=admin.get('/api/accounts').json()[0]
    for suffix in ['', '.csv']:
        response=admin.get('/api/finance/reports/budget-actual'+suffix,params={'account_id':account['id']})
        assert response.status_code==422
        assert 'conta' in response.json()['detail'].lower()
    assert admin.get('/api/finance/reports/budget-actual').status_code==200


def test_catalog_describes_actual_date_basis(env):
    _,admin,_,_=env
    catalog={r['id']:r['date_basis'] for r in admin.get('/api/finance/reports/catalog').json()}
    assert catalog['payable-open']=='due'
    assert catalog['titles-due']=='due'
    assert catalog['documents']=='posting'
    assert catalog['budget-actual']=='competence'


def test_settlement_idempotency_key_cannot_acknowledge_a_different_title(env):
    _,admin,_,_=env
    first=title(admin,'income',12345);second=title(admin,'income',12345)
    payload={'method':'pix','account_id':first['account_id'],'principal_cents':101,'request_key':'commercial-fixed-key-only'}
    response=admin.post(f"/api/finance/{first['id']}/settle",json=payload);assert response.status_code==200
    before=admin.get('/api/finance').json()['items']
    denied=admin.post(f"/api/finance/{second['id']}/settle",json=payload)
    assert denied.status_code==409
    after=admin.get('/api/finance').json()['items'];assert after==before
    assert admin.post(f"/api/finance/{first['id']}/settle",json=payload).json()==response.json()

from app.reporting import REPORTS
from datetime import timedelta
from app.services import today
import pytest

@pytest.mark.parametrize('slug',[r[0] for r in REPORTS])
def test_all_26_reports_csv_cells_match_full_paged_api_and_period_is_not_ignored(env,slug):
    """Real DB, no mocks of reports: compare exported cells with every API page."""
    app,admin,operator,anonymous=env
    customer=post(admin,'/customers',{'name':'=Cliente fictício; com delimitador'})
    rows=[title(admin,direction,amount,document='@DOC-fictício',customer_id=customer['id'] if direction=='income' else None) for direction,amount in [('income',10001),('expense',20003),('income',301)]]
    for i,row in enumerate(rows):
        result=admin.post(f"/api/finance/{row['id']}/settle",json={'method':'pix','account_id':row['account_id'],'principal_cents':amount if (amount:=row['amount_cents'])<1000 else 1000,'interest_cents':17,'fine_cents':3,'discount_cents':2,'request_key':f'commercial-oracle-report-{i}'})
        assert result.status_code==200,result.text
        if i==2:assert admin.post(f"/api/finance/payments/{result.json()['payments'][0]['id']}/reverse",json={'reason':'Estorno fictício para oracle'}).status_code==200
    reference=today()
    post(admin,'/finance/budgets',{'year':reference.year,'month':reference.month,'category_id':rows[1]['category_id'],'target_cents':54321})
    path='/api/finance/reports/'+slug
    params={'start':str(reference),'end':str(reference),'page_size':1}
    first=admin.get(path,params=params);assert first.status_code==200
    value=first.json();items=value['items'][:]
    for page in range(2,value['total']+1):
        more=admin.get(path,params={**params,'page':page}).json();assert more['page']==page;items.extend(more['items'])
    assert len(items)==value['total']
    exported=admin.get(path+'.csv',params={k:v for k,v in params.items() if k!='page_size'})
    assert exported.status_code==200
    records=list(csv.DictReader(io.StringIO(exported.content.decode('utf-8-sig')),delimiter=';'))
    if items:
        assert len(records)==len(items)
        for record,row in zip(records,items):
            assert list(record)==list(row)
            for key,original in row.items():
                if original is None or isinstance(original,(dict,list)):expected=''
                elif key.endswith('_cents'):
                    expected=('-' if original<0 else '')+f'{abs(original)//100},{abs(original)%100:02d}'
                else:
                    expected=str(original)
                    if expected.lstrip().startswith(('=','+','-','@','\t','\r')):expected="'"+expected
                assert record[key]==expected,(slug,key)
    else:assert records==[]
    # Every source uses its documented date basis and excludes this unrelated month.
    outside=admin.get(path,params={'start':'2001-01-01','end':'2001-01-31'})
    assert outside.status_code==200 and outside.json()['items']==[]
    assert operator.get(path).status_code==403 and anonymous.get(path).status_code==401
    assert operator.get(path+'.csv').status_code==403 and anonymous.get(path+'.csv').status_code==401


def test_integer_cent_journey_reconciles_api_database_restart_and_restored_backup(env,tmp_path):
    import sqlite3,zipfile,hashlib,base64
    from app.cli import backup_bundle
    from app.api import create_app
    from app.db import build_engine
    from fastapi.testclient import TestClient
    from app.models import Payment
    app,admin,_,_=env
    bank=next(a for a in admin.get('/api/accounts').json() if a['kind']=='bank')
    income=title(admin,'income',10001);expense=title(admin,'expense',4003)
    def settle(row,principal,key,**charges):
        response=admin.post(f"/api/finance/{row['id']}/settle",json={'method':'pix','account_id':bank['id'],'principal_cents':principal,'request_key':key,**charges})
        assert response.status_code==200,response.text
        return response.json()
    partial=settle(income,3001,'independent-income-partial',interest_cents=101,fine_cents=17,discount_cents=37)
    assert partial['remaining_cents']==7000
    # Independent oracle: 3001 + 101 + 17 - 37 = 3082; expense=4003.
    settle(expense,4003,'independent-expense-whole')
    assert next(a for a in admin.get('/api/accounts').json() if a['id']==bank['id'])['balance_cents']-bank['opening_cents']==-921
    invalid=admin.post(f"/api/finance/{income['id']}/settle",json={'method':'pix','account_id':bank['id'],'principal_cents':7001,'request_key':'independent-invalid-large'})
    assert invalid.status_code==422
    assert next(a for a in admin.get('/api/accounts').json() if a['id']==bank['id'])['balance_cents']-bank['opening_cents']==-921
    final=settle(income,7000,'independent-income-final')
    assert final['status']=='paid'
    assert admin.post(f"/api/finance/payments/{partial['payments'][0]['id']}/reverse",json={'reason':'Estorno fictício parcial'}).status_code==200
    assert admin.post(f"/api/finance/{expense['id']}/cancel",json={'reason':'Cancelamento sintético integral'}).status_code==200
    # Gross flows include signed reversal movements; independent net is exactly 7000.
    dash=admin.get('/api/finance/dashboard').json()
    assert (dash['income_cents'],dash['expense_cents'],dash['net_cents'])==(14085,7085,7000)
    with app.state.sessions() as db:
        payments=list(db.scalars(select(Payment)))
        assert sum(p.amount_cents for p in payments)==7000
        assert sorted(p.amount_cents for p in payments)==[-4003,-3082,3082,4003,7000]
        ids=[p.id for p in payments]
    content=b'%PDF-1.4\nOnly synthetic backup proof\n'
    attachment=admin.post(f"/api/finance/{income['id']}/attachments",json={'filename':'proof.pdf','content_base64':base64.b64encode(content).decode(),'content_type':'application/pdf'})
    assert attachment.status_code==201,attachment.text
    bundle=tmp_path/'journey.zip';backup_bundle(bundle)
    restored=tmp_path/'restored.sqlite3'
    with zipfile.ZipFile(bundle) as archive:
        assert archive.testzip() is None
        restored.write_bytes(archive.read('gestao.sqlite3'))
    with sqlite3.connect(restored) as db:
        assert db.execute('pragma integrity_check').fetchone()==('ok',)
        assert not db.execute('pragma foreign_key_check').fetchall()
        assert db.execute('select sum(amount_cents) from payments').fetchone()==(7000,)
        assert [r[0] for r in db.execute('select id from payments order by id')]==ids
        assert db.execute('select content from attachments').fetchone()==(content,)
    engine=build_engine(f'sqlite:///{restored}')
    for _ in range(2):
        with TestClient(create_app(engine,serve_frontend=False)) as client:
            assert client.post('/api/auth/login',json={'username':'admin','password':'TestPassword#2026'}).status_code==200
            assert client.get('/api/finance/dashboard').json()==dash
            response=client.get(f"/api/finance/attachments/{attachment.json()['id']}")
            assert response.status_code==200 and response.content==content
    engine.dispose()
