import pytest
from datetime import date
from sqlalchemy import select
from app import services as V
from app.models import FinanceEntry,DreMapping,DreDecision
from test_finance_expansion import title,post


def period():
    return {'start':V.today().replace(day=1).isoformat(),'end':V.today().isoformat()}


def mapping(admin,entry,line='RB',**extra):
    payload={'category_id':entry['category_id'],'line_code':line,'valid_from':'2000-01-01','valid_to':'2099-12-31','expected_revision':0,'reason':'Classificação sintética supervisionada',**extra}
    preview=post(admin,'/finance/dre/mappings/preview',payload,200)
    return post(admin,'/finance/dre/mappings',{**payload,'preview_token':preview['preview_token']})


def recognize(admin,key,**extra):
    issues=admin.get('/api/finance/dre/issues',params=period()).json()
    issue=next(i for i in issues if i.get('key')==key)
    return post(admin,'/finance/dre/recognition-review',{'source_key':key,'decision':'recognize','economic_date':V.today().isoformat(),
        'evidence_kind':'documento_comprovado','expected_revision':issue['recognition_revision'],'source_fingerprint':issue['source_fingerprint'],
        'request_key':'dre-synthetic-recognition-'+key,'reason':'Reconhecimento comprovado em teste',**extra})


def test_manual_principal_not_payment_then_partial_and_reversal(env):
    _,admin,operator,anonymous=env
    entry=title(admin,'income',10001); mapping(admin,entry)
    before=admin.get('/api/finance/dre',params=period()).json()
    assert before['facts']==[] and before['issues']
    recognize(admin,f"finance_entry:{entry['id']}:principal")
    first=admin.get('/api/finance/dre',params=period()).json()
    assert sum(f['amount_cents'] for f in first['facts'])==10001
    assert next(r for r in first['lines'] if r['code']=='RB')['final_amount_cents']==10001
    paid=post(admin,f"/finance/{entry['id']}/settle",{'account_id':entry['account_id'],'method':'pix','principal_cents':4001,'request_key':'dre-unique-partial-payment'},200)
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==first['facts']
    reconciled=admin.get('/api/finance/dre/reconciliation',params=period()).json()['reconciliation'][0]
    assert (reconciled['recognized_principal_cents'],reconciled['title_principal_cents'],reconciled['outstanding_principal_cents'],reconciled['cash_amount_cents_lifetime'])==(10001,10001,6000,4001)
    post(admin,f"/finance/payments/{paid['payments'][0]['id']}/reverse",{'reason':'Estorno fictício'},200)
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==first['facts']
    reconciled=admin.get('/api/finance/dre/reconciliation',params=period()).json()['reconciliation'][0]
    assert reconciled['cash_amount_cents_lifetime']==0 and reconciled['outstanding_principal_cents']==10001
    assert next(r for r in first['lines'] if r['code']=='LL')['final_amount_cents'] is None
    for path in ('/finance/dre','/finance/dre/items','/finance/dre/issues','/finance/dre/reconciliation','/finance/dre.csv'):
        assert operator.get('/api'+path,params=period()).status_code==403
        assert anonymous.get('/api'+path,params=period()).status_code==401


def test_preview_mandatory_stale_revision_and_replay(env):
    app,admin,*_=env
    entry=title(admin,'income',10001)
    first=mapping(admin,entry); recognize(admin,f"finance_entry:{entry['id']}:principal")
    payload={'category_id':entry['category_id'],'line_code':'OR','valid_from':'2000-01-01','valid_to':'2099-12-31','expected_revision':1,'supersedes_id':first['id'],'reason':'Reclassificação retroativa sintética'}
    assert admin.post('/api/finance/dre/mappings',json=payload).status_code==409
    preview=post(admin,'/finance/dre/mappings/preview',payload,200)
    second=post(admin,'/finance/dre/mappings',{**payload,'preview_token':preview['preview_token']})
    assert admin.post('/api/finance/dre/mappings',json={**payload,'preview_token':preview['preview_token']}).status_code==409
    assert admin.get('/api/finance/dre',params={**period(),'mapping_version':first['id']}).json()['facts'][0]['dre_line_code']=='RB'
    assert admin.get('/api/finance/dre',params=period()).json()['facts'][0]['dre_line_code']=='OR'
    with app.state.sessions() as db:
        assert db.get(FinanceEntry,entry['id']).amount_cents==10001
        assert db.get(DreMapping,first['id']).line_code=='RB'
        assert db.get(DreMapping,second['id']).line_code=='OR'
        assert len(list(db.scalars(select(DreDecision))))==1


def test_zero_assertion_requires_current_evidence_and_review_snapshot(env):
    _,admin,*_=env
    result=admin.get('/api/finance/dre',params=period()).json()
    assert all(r['final_amount_cents'] is None for r in result['lines'])
    for line in ('RB','DED','CD','DO','OR','OD','DA','FI','FE','TL'):
        post(admin,'/finance/dre/component-assertions',{**period(),'source_fingerprint':result['source_fingerprint'],'reason':'Ausência comprovada na fixture sintética','line_code':line,'assertion_kind':'not_applicable' if line=='DA' else 'complete'})
    result=admin.get('/api/finance/dre',params=period()).json()
    assert all(r['final_amount_cents']==0 for r in result['lines'])
    review=post(admin,'/finance/dre/period-reviews',{**period(),'source_fingerprint':result['source_fingerprint'],'report_fingerprint':result['report_fingerprint'],'reason':'Período sintético revisado'})
    title(admin,'income',10001)
    replay=admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).json()
    assert replay['source_changed']
    assert all(r['final_amount_cents']==0 for r in replay['snapshot']['lines'])
    current=admin.get('/api/finance/dre',params=period()).json()
    assert next(r for r in current['lines'] if r['code']=='LL')['final_amount_cents'] is None


def test_bad_dates_and_unsafe_rubric_are_rejected(env):
    _,admin,*_=env
    assert admin.get('/api/finance/dre',params={'start':'2026-12-01','end':'2026-01-01'}).status_code==422
    entry=title(admin,'income',10001);mapping(admin,entry,line='DO')
    recognize(admin,f"finance_entry:{entry['id']}:principal")
    result=admin.get('/api/finance/dre',params=period()).json()
    assert result['facts']==[]
    assert any('direction_mapping_conflict' in i['codes'] for i in result['issues'])


def test_finalized_sale_has_one_fact_before_and_after_payment(env):
    app,admin,*_=env
    product=post(admin,'/products',{'code':'DRE-SYNTHETIC','description':'Produto fictício','price_cents':100001})
    from app.models import Sale,SaleItem,User
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username=='admin'))
        sale=Sale(user_id=actor.id,status='finalized',total_cents=100001,discount_cents=0,finalized_at=V.now())
        db.add(sale);db.flush();sale_id=sale.id
        db.add(SaleItem(sale_id=sale.id,product_id=product['id'],description='Produto fictício',unit='UN',quantity_milli=1000,unit_price_cents=100001,total_cents=100001))
        db.commit()
    entry=title(admin,'income',100001)
    with app.state.sessions() as db:
        db.get(FinanceEntry,entry['id']).sale_id=sale_id;db.commit()
    mapping(admin,entry)
    result=admin.get('/api/finance/dre',params=period()).json()
    assert len(result['facts'])==1
    assert result['facts'][0]['key']==f'sale:{sale_id}:principal'
    assert result['facts'][0]['amount_cents']==100001
    post(admin,f"/finance/{entry['id']}/settle",{'account_id':entry['account_id'],'method':'pix'},200)
    after=admin.get('/api/finance/dre',params=period()).json()
    assert after['facts']==result['facts']
    assert next(r for r in after['lines'] if r['code']=='LB')['final_amount_cents'] is None
    assert admin.get('/api/finance/dre.csv',params=period()).text.count(f'sale:{sale_id}:principal')==1


def test_transport_sources_not_disclosed_to_generic_or_another_identity(env):
    app,admin,other,_=env
    from app.models import User,Supplier
    entry=title(admin,'expense',12345)
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username=='admin'))
        supplier=Supplier(name='Privado fictício não expor',kind='subcontracted_freight')
        db.add(supplier);db.flush();db.get(FinanceEntry,entry['id']).supplier_id=supplier.id
        db.commit()
    result=admin.get('/api/finance/dre',params=period()).json()
    assert result['facts']==[]
    assert result['issues']==[{'codes':['restricted_sources'],'message':'Há fontes não disponíveis para esta identidade; demonstrativo incompleto.'}]
    for path in ('/finance/dre','/finance/dre/items','/finance/dre/issues','/finance/dre/reconciliation','/finance/dre.csv'):
        text=admin.get('/api'+path,params=period()).text
        assert '12345' not in text and 'Privado fictício' not in text
    assert admin.post('/api/finance/dre/recognition-review',json={
        'source_key':f"finance_entry:{entry['id']}:principal",'decision':'recognize','economic_date':V.today().isoformat(),
        'evidence_kind':'ficticio','source_fingerprint':'0'*64,'expected_revision':0,'request_key':'forged-recognition-key','reason':'Tentativa sintética'}).status_code==404
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username=='admin'));actor.transport_operations=True;db.commit()
    assert any(i.get('key')==f"finance_entry:{entry['id']}:principal" for i in admin.get('/api/finance/dre/issues',params=period()).json())
    with app.state.sessions() as db:
        second=db.scalar(select(User).where(User.role=='operator'))
        second.role='admin';second.transport_operations=True;db.commit()
    assert admin.get(f"/api/finance/dre/source-entry/{entry['id']}").status_code==200
    assert other.get(f"/api/finance/dre/source-entry/{entry['id']}").status_code==404
    for path in ('/finance/dre','/finance/dre/items','/finance/dre/issues','/finance/dre/reconciliation','/finance/dre.csv'):
        response=other.get('/api'+path,params=period())
        assert response.status_code==200
        assert '12345' not in response.text and 'Privado fictício' not in response.text


def test_concurrent_mapping_confirmations_never_create_two_revisions(env):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    app,admin,*_=env
    entry=title(admin,'income',10001)
    payload={'category_id':entry['category_id'],'line_code':'RB','valid_from':'2000-01-01','valid_to':'2099-12-31','expected_revision':0,'reason':'Concorrência sintética supervisionada'}
    preview=post(admin,'/finance/dre/mappings/preview',payload,200)
    body={**payload,'preview_token':preview['preview_token']}
    # Mutating requests acquire BEGIN IMMEDIATE in the existing get_db dependency.
    # Synchronize HTTP submission before that lock, never create an artificial barrier inside it.
    barrier=Barrier(2)
    def submit(_):
        barrier.wait(timeout=10)
        return admin.post('/api/finance/dre/mappings',json=body)
    with ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(submit,range(2)))
    assert sorted(r.status_code for r in responses)==[201,409]
    with app.state.sessions() as db:
        rows=list(db.scalars(select(DreMapping)))
        assert len(rows)==1 and rows[0].revision==1


def test_all_dre_mutations_require_admin_before_touching_sources(env):
    app,admin,operator,visitor=env
    entry=title(admin,'income',10001)
    mapping_body={'category_id':entry['category_id'],'line_code':'RB','valid_from':'2026-01-01','valid_to':'2026-12-31','expected_revision':0,'reason':'Negativa sintética'}
    bodies={
      '/mappings/preview':mapping_body,'/mappings':mapping_body,
      '/recognition-review':{'source_key':f"finance_entry:{entry['id']}:principal",'decision':'recognize','economic_date':V.today().isoformat(),'source_fingerprint':'0'*64,'evidence_kind':'teste','request_key':'unauthorized-fixture-key','expected_revision':0,'reason':'Negativa sintética'},
      '/component-assertions':{**period(),'source_fingerprint':'0'*64,'reason':'Negativa sintética','line_code':'RB'},
      '/period-reviews':{**period(),'source_fingerprint':'0'*64,'reason':'Negativa sintética'},
    }
    for path,payload in bodies.items():
        assert operator.post('/api/finance/dre'+path,json=payload).status_code==403,path
        assert visitor.post('/api/finance/dre'+path,json=payload).status_code==401,path
    with app.state.sessions() as db:
        assert list(db.scalars(select(DreMapping)))==[]
        assert list(db.scalars(select(DreDecision)))==[]


def test_revocation_hides_previous_specialized_snapshot_and_source_metadata(env):
    app,admin,*_=env
    from app.models import User,Supplier
    entry=title(admin,'expense',12345)
    with app.state.sessions() as db:
        user=db.scalar(select(User).where(User.username=='admin'));user.transport_operations=True
        supplier=Supplier(name='Fictício especializado privado',kind='subcontracted_freight');db.add(supplier);db.flush()
        db.get(FinanceEntry,entry['id']).supplier_id=supplier.id;db.commit()
    current=admin.get('/api/finance/dre',params=period()).json()
    record=post(admin,'/finance/dre/period-reviews',{**period(),'source_fingerprint':current['source_fingerprint'],'report_fingerprint':current['report_fingerprint'],'reason':'Revisão sintética especializada'})
    assert admin.get(f"/api/finance/dre/source-entry/{entry['id']}").status_code==200
    with app.state.sessions() as db:
        db.scalar(select(User).where(User.username=='admin')).transport_operations=False;db.commit()
    assert admin.get(f"/api/finance/dre/source-entry/{entry['id']}").status_code==404
    assert admin.get('/api/finance/dre/period-reviews',params=period()).json()==[]
    assert admin.get('/api/finance/dre/period-reviews/'+str(record['id'])).status_code==403


def test_investment_principal_is_never_income_and_exclusion_remains_traceable(env):
    _,admin,*_=env
    category=post(admin,'/categories',{'name':'Empréstimo fictício','direction':'income','classification':'financing'})
    entry=title(admin,'income',100001,category_id=category['id']);first=mapping(admin,entry,'RB')
    recognize(admin,f"finance_entry:{entry['id']}:principal")
    rejected=admin.get('/api/finance/dre',params=period()).json()
    assert rejected['facts']==[]
    assert any('principal_outside_result_required' in i['codes'] for i in rejected['issues'])
    mapping(admin,entry,'outside_dre',expected_revision=1,supersedes_id=first['id'])
    result=admin.get('/api/finance/dre',params=period()).json()
    assert result['facts']==[] and result['excluded'][0]['amount_cents']==100001
    assert result['excluded'][0]['entry_ids']==[entry['id']]


def test_commercial_sale_discount_is_deduction_not_second_principal(env):
    app,admin,*_=env
    from app.models import Sale,SaleItem,User
    product=post(admin,'/products',{'code':'DRE-DISCOUNT','description':'Mercadoria fictícia com desconto','price_cents':10001})
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username=='admin'))
        sale=Sale(user_id=actor.id,status='finalized',total_cents=9000,discount_cents=1001,finalized_at=V.now())
        db.add(sale);db.flush();identifier=sale.id
        db.add(SaleItem(sale_id=sale.id,product_id=product['id'],description='Mercadoria fictícia',unit='UN',quantity_milli=1000,unit_price_cents=10001,total_cents=10001));db.commit()
    entry=title(admin,'income',9000)
    with app.state.sessions() as db:
        db.get(FinanceEntry,entry['id']).sale_id=identifier;db.commit()
    mapping(admin,entry)
    before=admin.get('/api/finance/dre',params=period()).json()
    assert {(f['dre_line_code'],f['amount_cents']) for f in before['facts']}=={('RB',10001),('DED',1001)}
    assert next(r for r in before['lines'] if r['code']=='RL')['known_amount_cents']==9000
    assert before['reconciliation'][0]['recognized_principal_cents']==9000
    post(admin,f"/finance/{entry['id']}/settle",{'account_id':entry['account_id'],'method':'pix','principal_cents':4001,'interest_cents':101,'fine_cents':1,'discount_cents':2,'request_key':'dre-commercial-discount-partial'},200)
    after=admin.get('/api/finance/dre',params=period()).json()
    assert after['facts']==before['facts']
    assert len([i for i in after['issues'] if i.get('source_type')=='payment'])==3
    cash=admin.get('/api/finance/dre/reconciliation',params=period()).json()['reconciliation'][0]
    assert (cash['outstanding_principal_cents'],cash['cash_amount_cents_lifetime'])==(4999,4101)


@pytest.mark.parametrize('direction',['income','expense'])
def test_confirmed_fee_components_and_their_reversals_keep_economic_signs(env,direction):
    _,admin,*_=env
    entry=title(admin,direction,10001);mapping(admin,entry,'RB' if direction=='income' else 'DO')
    principal_key=f"finance_entry:{entry['id']}:principal"
    recognize(admin,principal_key)
    paid=post(admin,f"/finance/{entry['id']}/settle",{'account_id':entry['account_id'],'method':'pix','principal_cents':4001,'interest_cents':101,'fine_cents':17,'discount_cents':37,'request_key':'dre-economic-fees-'+direction},200)
    payment=paid['payments'][0]
    for component in ('interest','fine','discount'):
        line=('FE' if component=='discount' else 'FI') if direction=='income' else ('FI' if component=='discount' else 'FE')
        recognize(admin,f"payment:{payment['id']}:{component}",line_code=line)
    result=admin.get('/api/finance/dre',params=period()).json()
    fees=[f for f in result['facts'] if f['source_type']=='payment']
    assert sorted(f['amount_cents'] for f in fees)==[17,37,101]
    actual=sum(f['amount_cents']*(1 if f['dre_line_code']=='FI' else -1) for f in fees)
    assert actual==(81 if direction=='income' else -81)
    reverse=post(admin,f"/finance/payments/{payment['id']}/reverse",{'reason':'Estorno econômico sintético'},200)
    reversal=next(p for p in reverse['payments'] if p['reversal_of']==payment['id'])
    for component in ('interest','fine','discount'):
        line=('FE' if component=='discount' else 'FI') if direction=='income' else ('FI' if component=='discount' else 'FE')
        recognize(admin,f"payment:{reversal['id']}:{component}",line_code=line)
    after=admin.get('/api/finance/dre',params=period()).json()
    assert next(f for f in after['facts'] if f['key']==principal_key)['amount_cents']==10001
    assert sum(f['amount_cents'] for f in after['facts'] if f['source_type']=='payment')==0
    cash=admin.get('/api/finance/dre/reconciliation',params=period()).json()['reconciliation'][0]
    assert cash['cash_amount_cents_lifetime']==0
    assert cash['outstanding_principal_cents']==10001
