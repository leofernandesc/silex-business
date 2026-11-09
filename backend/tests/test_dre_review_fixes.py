"""Independent review regressions; only disposable, fictitious records."""
from datetime import date,timedelta
import pytest
from sqlalchemy import select
from app import services as V
from app.models import Category,Subcategory,FinanceEntry
from test_finance_expansion import title,post
from test_dre_api import mapping,recognize,period


def reviewed(admin,params=None):
    params=params or period()
    current=admin.get('/api/finance/dre',params=params).json()
    r=post(admin,'/finance/dre/period-reviews',{**params,'source_fingerprint':current['source_fingerprint'],'report_fingerprint':current['report_fingerprint'],'reason':'Revisão fictícia anterior à mudança'})
    return r,current


def test_used_catalog_economic_attributes_cannot_bypass_versioned_review(env):
    app,admin,*_=env
    entry=title(admin,'income',10001)
    sub=post(admin,'/subcategories',{'name':'Subcategoria fictícia','category_id':entry['category_id'],'affects_result':True})
    with app.state.sessions() as db:db.get(FinanceEntry,entry['id']).subcategory_id=sub['id'];db.commit()
    mapping(admin,entry);recognize(admin,f"finance_entry:{entry['id']}:principal")
    review,before=reviewed(admin)
    category=next(c for c in admin.get('/api/categories').json() if c['id']==entry['category_id'])
    assert admin.put('/api/categories/'+str(category['id']),json={k:('financing' if k=='classification' else category[k]) for k in ('name','direction','classification','result_group','active')}).status_code==409
    assert admin.put('/api/subcategories/'+str(sub['id']),json={'name':sub['name'],'category_id':sub['category_id'],'active':True,'affects_result':False}).status_code==409
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==before['facts']
    assert admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).json()['snapshot']['facts']==before['facts']
    unused=post(admin,'/subcategories',{'name':'Subcategoria sem vínculos','category_id':entry['category_id'],'affects_result':True})
    assert admin.put('/api/subcategories/'+str(unused['id']),json={'name':unused['name'],'category_id':unused['category_id'],'active':True,'affects_result':False}).status_code==200


def test_mapping_can_split_a_period_without_changing_the_original_row(env):
    app,admin,*_=env
    entry=title(admin,'income',10001);first=mapping(admin,entry)
    payload={'category_id':entry['category_id'],'line_code':'OR','valid_from':V.today().isoformat(),'valid_to':'2099-12-31','expected_revision':1,'supersedes_id':first['id'],'reason':'Nova classificação com início explícito'}
    preview=post(admin,'/finance/dre/mappings/preview',payload,200)
    changed=post(admin,'/finance/dre/mappings',{**payload,'preview_token':preview['preview_token']})
    rows=admin.get('/api/finance/dre/mappings').json()
    assert [(r['line_code'],r['valid_from'],r['valid_to']) for r in rows]==[('RB','2000-01-01',(V.today()-timedelta(days=1)).isoformat()),('OR',V.today().isoformat(),'2099-12-31')]
    assert admin.get('/api/finance/dre/mappings',params={'version':first['id']}).json()[0]['valid_to']=='2099-12-31'


def recognize_at(admin,key,when,params):
    issue=next(r for r in admin.get('/api/finance/dre/issues',params=params).json() if r.get('key')==key and r.get('recognition_revision') is not None)
    policy=admin.get('/api/finance/dre/recognition-policy',params={'source_key':key,'economic_date':when.isoformat()}).json()
    return post(admin,'/finance/dre/recognition-review',{'source_key':key,'decision':'recognize','economic_date':when.isoformat(),'source_fingerprint':issue['source_fingerprint'],'policy_fingerprint':policy['policy_fingerprint'],'expected_revision':issue['recognition_revision'],'evidence_kind':'comprovação_sintética','request_key':f'recognition-review-{key}-{issue["recognition_revision"]}','reason':'Reconhecimento confirmado na competência fictícia'})


@pytest.mark.parametrize('attribute',['classification','affects_result'])
def test_versioned_policy_invalidates_confirmations_and_replays_older_versions(env,attribute):
    app,admin,*_=env
    entry=title(admin,'income',10001);key=f"finance_entry:{entry['id']}:principal"
    sub=post(admin,'/subcategories',{'name':'Política fictícia por vigência','category_id':entry['category_id'],'affects_result':True})
    if attribute=='affects_result':
        with app.state.sessions() as db:db.get(FinanceEntry,entry['id']).subcategory_id=sub['id'];db.commit()
    first=mapping(admin,entry,subcategory_id=sub['id'] if attribute=='affects_result' else None)
    decision=recognize(admin,key);review,original=reviewed(admin)
    old_context=admin.get('/api/finance/dre/recognition-policy',params={'source_key':key,'economic_date':V.today().isoformat()}).json()
    changed=mapping(admin,entry,'outside_dre',subcategory_id=first['subcategory_id'],expected_revision=1,supersedes_id=first['id'],**({'economic_classification':'financing'} if attribute=='classification' else {'economic_affects_result':False}))
    current=admin.get('/api/finance/dre',params=period()).json()
    assert current['source_fingerprint']!=original['source_fingerprint'] and current['facts']==[]
    assert any('source_or_policy_changed_since_review' in r['codes'] for r in current['issues'])
    issue=next(r for r in current['issues'] if r.get('key')==key)
    stale={'source_key':key,'decision':'recognize','economic_date':V.today().isoformat(),'source_fingerprint':issue['source_fingerprint'],'policy_fingerprint':old_context['policy_fingerprint'],'expected_revision':1,'request_key':'stale-policy-confirmation-'+attribute,'reason':'Confirmação antiga recusada','evidence_kind':'documento_fictício'}
    assert admin.post('/api/finance/dre/recognition-review',json=stale).status_code==409
    recognize_at(admin,key,V.today(),period())
    assert admin.get('/api/finance/dre',params=period()).json()['excluded'][0]['amount_cents']==10001
    replay=admin.get('/api/finance/dre',params={**period(),'mapping_version':first['id'],'decision_version':decision['id']}).json()
    assert replay['facts']==original['facts']
    assert admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).json()['snapshot']['facts']==original['facts']
    with app.state.sessions() as db:
        assert db.get(Category,entry['category_id']).classification=='operating'
        assert db.get(Subcategory,sub['id']).affects_result is True


def test_catalog_policy_is_part_of_source_fingerprint_even_for_out_of_band_changes(env):
    app,admin,*_=env
    entry=title(admin,'income',10001);mapping(admin,entry);recognize(admin,f"finance_entry:{entry['id']}:principal")
    _,original=reviewed(admin)
    # Simulate an unsupported external write, not an application editing path.
    with app.state.sessions() as db:db.get(Category,entry['category_id']).classification='financing';db.commit()
    current=admin.get('/api/finance/dre',params=period()).json()
    assert current['source_fingerprint']!=original['source_fingerprint']
    assert any('source_or_policy_changed_since_review' in r['codes'] for r in current['issues'])
    assert current['facts']==[]


def test_repeated_interval_splits_preserve_all_original_rows_and_old_coverage(env):
    app,admin,*_=env
    entry=title(admin,'income',10001);first=mapping(admin,entry)
    recognize(admin,f"finance_entry:{entry['id']}:principal")
    original=admin.get('/api/finance/dre',params=period()).json()
    for line in ('RB','DED','CD','DO','OR','OD','DA','FI','FE','TL'):
        post(admin,'/finance/dre/component-assertions',{**period(),'source_fingerprint':original['source_fingerprint'],'reason':'Cobertura da fixture comprovadamente completa','line_code':line})
    before=admin.get('/api/finance/dre',params=period()).json()
    review,_=reviewed(admin)
    tomorrow=V.today()+timedelta(days=1)
    second=mapping(admin,entry,'OR',valid_from=tomorrow.isoformat(),expected_revision=1,supersedes_id=first['id'])
    third=mapping(admin,entry,'FI',valid_from='2001-01-01',valid_to='2001-12-31',expected_revision=2,supersedes_id=first['id'])
    after=admin.get('/api/finance/dre',params=period()).json()
    assert after['source_fingerprint']==before['source_fingerprint']
    assert after['lines']==before['lines']
    assert admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).json()['source_changed'] is False
    old=admin.get('/api/finance/dre/mappings',params={'version':first['id']}).json()
    assert len(old)==1 and old[0]['line_code']=='RB' and old[0]['valid_to']=='2099-12-31'
    rows=admin.get('/api/finance/dre/mappings').json()
    assert len(rows)==4 and [r['line_code'] for r in rows]==['RB','FI','RB','OR']
    assert [r['id'] for r in rows].count(first['id'])==2
    with app.state.sessions() as db:
        from app.models import DreMapping
        assert db.get(DreMapping,first['id']).valid_to==date(2099,12,31)
        assert len(list(db.scalars(select(DreMapping))))==3


def cancellation_payload(admin,key,params,**extra):
    issue=next(i for i in admin.get('/api/finance/dre/issues',params=params).json() if i.get('key')==key and i.get('cancellation_fingerprint'))
    return {'source_key':key,'source_fingerprint':issue['source_fingerprint'],'cancellation_fingerprint':issue['cancellation_fingerprint'],'expected_revision':issue['cancellation_revision'],'decision':'reverse','economic_date':issue['economic_date'],'evidence_kind':'cancelamento_documentado_fictício','reason':'Cancelamento econômico confirmado em documento sintético','request_key':'cancel-review-'+key+'-'+str(issue['cancellation_revision']),**extra}


def save_cancellation(admin,payload):
    impact=post(admin,'/finance/dre/cancellation-review/preview',payload,200)
    return post(admin,'/finance/dre/cancellation-review',{**payload,'preview_token':impact['preview_token']})


@pytest.mark.parametrize('month',['same','later'])
@pytest.mark.parametrize('has_review',[False,True])
def test_economic_cancellation_preserves_original_and_resolves_the_competence(env,monkeypatch,month,has_review):
    app,admin,operator,visitor=env
    from datetime import datetime
    from app.models import Payment,DrePeriodReview,DreCancellationReview
    monkeypatch.setattr(V,'today',lambda:date(2026,11,20));monkeypatch.setattr(V,'now',lambda:datetime(2026,11,20,16))
    when=date(2026,11,10) if month=='same' else date(2026,10,10)
    original_period={'start':when.replace(day=1).isoformat(),'end':when.replace(day=28).isoformat()}
    current_period={'start':'2026-11-01','end':'2026-11-30'}
    entry=title(admin,'income',10001,due=when);key=f"finance_entry:{entry['id']}:principal";mapping(admin,entry)
    recognize_at(admin,key,when,original_period)
    before=admin.get('/api/finance/dre',params=original_period).json()
    if has_review:
        review,_=reviewed(admin,original_period)
        with app.state.sessions() as db:original_json=db.get(DrePeriodReview,review['id']).report_json
    post(admin,f"/finance/{entry['id']}/cancel",{'reason':'Cancelamento financeiro sintético preexistente'},200)
    with app.state.sessions() as db:cancelled=V.data(db.get(FinanceEntry,entry['id']))
    payload=cancellation_payload(admin,key,current_period)
    for client,status in [(operator,403),(visitor,401)]:
        assert client.post('/api/finance/dre/cancellation-review/preview',json=payload).status_code==status
        assert client.post('/api/finance/dre/cancellation-review',json=payload).status_code==status
    impact=post(admin,'/finance/dre/cancellation-review/preview',payload,200)
    assert impact['original_facts'][0]['amount_cents']==10001
    assert impact['adjustment_facts'][0]['amount_cents']==-10001
    if has_review:
        assert impact['reviewed_period'] is True
        assert admin.post('/api/finance/dre/cancellation-review',json={**payload,'preview_token':impact['preview_token']}).status_code==409
        payload['reviewed_period_acknowledged']=True
    resolution=save_cancellation(admin,payload)
    current=admin.get('/api/finance/dre',params=current_period).json()
    assert not any('cancellation' in code for i in current['issues'] for code in i['codes'])
    assert sum(f['amount_cents'] for f in current['facts'])==(0 if month=='same' else -10001)
    assert sum(f['amount_cents'] for f in admin.get('/api/finance/dre',params=original_period).json()['facts'])==(0 if month=='same' else 10001)
    # Idempotent retry is not another economic or financial mutation.
    assert save_cancellation_replay(admin,payload,resolution)['id']==resolution['id']
    with app.state.sessions() as db:
        assert V.data(db.get(FinanceEntry,entry['id']))==cancelled
        assert len(list(db.scalars(select(FinanceEntry))))==1
        assert list(db.scalars(select(Payment)))==[]
        assert len(list(db.scalars(select(DreCancellationReview))))==1
        if has_review:assert db.get(DrePeriodReview,review['id']).report_json==original_json
    if has_review:
        snapshot=admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).json()['snapshot']
        assert snapshot['facts']==before['facts']
    new_review,_=reviewed(admin,current_period)
    assert admin.get('/api/finance/dre/period-reviews/'+str(new_review['id'])).status_code==200


def save_cancellation_replay(admin,payload,record):
    # No new preview is needed to acknowledge a completed, identical request.
    return post(admin,'/finance/dre/cancellation-review',{**payload,'preview_token':'completed-identical-request'})


def test_bank_reversal_is_not_an_economic_cancellation(env):
    _,admin,*_=env
    entry=title(admin,'income',10001);key=f"finance_entry:{entry['id']}:principal";mapping(admin,entry);recognize(admin,key)
    settled=post(admin,f"/finance/{entry['id']}/settle",{'account_id':entry['account_id'],'method':'pix','principal_cents':4001,'request_key':'bank-reversal-is-not-cancellation'},200)
    post(admin,f"/finance/payments/{settled['payments'][0]['id']}/reverse",{'reason':'Correção bancária, fato econômico preservado'},200)
    result=admin.get('/api/finance/dre',params=period()).json()
    assert len(result['facts'])==1 and result['facts'][0]['amount_cents']==10001
    assert not any('cancellation' in c for r in result['issues'] for c in r['codes'])
    assert admin.post('/api/finance/dre/cancellation-review/preview',json={'source_key':key,'source_fingerprint':'0'*64,'cancellation_fingerprint':'0'*64,'expected_revision':0,'decision':'reverse','economic_date':V.today().isoformat(),'evidence_kind':'não_é_cancelamento','reason':'Não presumir cancelamento de um estorno bancário','request_key':'must-not-create-an-adjustment'}).status_code==409


def test_cancellation_revision_and_replay_are_supervised_after_reclassification(env):
    app,admin,*_=env
    from app.models import DreCancellationReview
    entry=title(admin,'income',10001);key=f"finance_entry:{entry['id']}:principal"
    first=mapping(admin,entry);decision=recognize(admin,key)
    post(admin,f"/finance/{entry['id']}/cancel",{'reason':'Cancelamento econômico fictício'},200)
    payload=cancellation_payload(admin,key,period());adjustment=save_cancellation(admin,payload)
    review,before=reviewed(admin)
    mapping(admin,entry,'OR',expected_revision=1,supersedes_id=first['id'])
    incomplete=admin.get('/api/finance/dre',params=period()).json()
    assert any('cancellation_source_changed_since_review' in r['codes'] for r in incomplete['issues'])
    revised=cancellation_payload(admin,key,period(),reviewed_period_acknowledged=True)
    second=save_cancellation(admin,revised)
    assert second['revision']==2
    current=admin.get('/api/finance/dre',params=period()).json()
    assert not current['issues'] and [(f['dre_line_code'],f['amount_cents']) for f in current['facts']]==[('OR',10001),('OR',-10001)]
    old=admin.get('/api/finance/dre',params={**period(),'mapping_version':first['id'],'decision_version':decision['id'],'cancellation_version':adjustment['id']}).json()
    assert old['facts']==before['facts']
    assert admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).json()['snapshot']['facts']==before['facts']
    with app.state.sessions() as db:
        assert len(list(db.scalars(select(DreCancellationReview))))==2
        assert db.get(DreCancellationReview,adjustment['id']).revision==1


def test_retaining_the_economic_fact_resolves_a_financial_only_cancellation(env):
    _,admin,*_=env
    entry=title(admin,'income',10001);key=f"finance_entry:{entry['id']}:principal";mapping(admin,entry);recognize(admin,key)
    original=admin.get('/api/finance/dre',params=period()).json()['facts']
    post(admin,f"/finance/{entry['id']}/cancel",{'reason':'Documento financeiro substituído, prestação mantida'},200)
    save_cancellation(admin,cancellation_payload(admin,key,period(),decision='retain'))
    result=admin.get('/api/finance/dre',params=period()).json()
    assert result['facts']==original and result['issues']==[]


def test_invalid_or_unauthorized_adjustment_cannot_change_financial_records(env):
    app,admin,other,visitor=env
    from app.models import Supplier,User,DreCancellationReview
    entry=title(admin,'expense',20001);key=f"finance_entry:{entry['id']}:principal"
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username=='admin'));actor.transport_operations=True
        supplier=Supplier(name='Prestador privado fictício',kind='subcontracted_freight');db.add(supplier);db.flush();db.get(FinanceEntry,entry['id']).supplier_id=supplier.id;db.commit()
    mapping(admin,entry,'DO');recognize(admin,key)
    post(admin,f"/finance/{entry['id']}/cancel",{'reason':'Cancelamento documentado fictício'},200)
    body=cancellation_payload(admin,key,period())
    assert other.post('/api/finance/dre/cancellation-review/preview',json=body).status_code==403
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.role=='operator'));actor.role='admin';db.commit()
    assert other.post('/api/finance/dre/cancellation-review/preview',json=body).status_code==404
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username!='admin'));actor.transport_operations=True;db.commit()
    assert other.post('/api/finance/dre/cancellation-review/preview',json=body).status_code==404
    for extra,status in [({'amount_cents':9999},422),({'economic_date':(V.today()+timedelta(days=1)).isoformat()},422),({'reason':''},422),({'source_fingerprint':'0'*64},409),({'source_key':'finance_entry:999999:principal'},404)]:
        assert admin.post('/api/finance/dre/cancellation-review/preview',json={**body,**extra}).status_code==status
    assert admin.post('/api/finance/dre/cancellation-review',json=body).status_code==409
    with app.state.sessions() as db:
        assert list(db.scalars(select(DreCancellationReview)))==[]
        db.scalar(select(User).where(User.username=='admin')).active=False;db.commit()
    assert admin.post('/api/finance/dre/cancellation-review/preview',json=body).status_code==401


def test_concurrent_cancellation_confirmations_create_exactly_one_review(env):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from app.models import DreCancellationReview
    app,admin,*_=env
    entry=title(admin,'income',10001);key=f"finance_entry:{entry['id']}:principal";mapping(admin,entry);recognize(admin,key)
    post(admin,f"/finance/{entry['id']}/cancel",{'reason':'Concorrência fictícia'},200)
    base=cancellation_payload(admin,key,period());bodies=[]
    for n in (1,2):
        data={**base,'request_key':f'concurrent-cancellation-fixture-{n}'}
        p=post(admin,'/finance/dre/cancellation-review/preview',data,200);bodies.append({**data,'preview_token':p['preview_token']})
    barrier=Barrier(2)
    def submit(body):
        barrier.wait(timeout=10)
        return admin.post('/api/finance/dre/cancellation-review',json=body)
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(submit,bodies))
    assert sorted(r.status_code for r in results)==[201,409]
    with app.state.sessions() as db:
        assert len(list(db.scalars(select(DreCancellationReview))))==1
        assert len(list(db.scalars(select(FinanceEntry))))==1


def test_revoking_transport_hides_economic_adjustments_and_their_frozen_review(env):
    app,admin,*_=env
    from app.models import User,Supplier
    entry=title(admin,'expense',20001);key=f"finance_entry:{entry['id']}:principal"
    with app.state.sessions() as db:
        actor=db.scalar(select(User).where(User.username=='admin'));actor.transport_operations=True
        supplier=Supplier(name='Prestador fictício restrito',kind='subcontracted_freight');db.add(supplier);db.flush();db.get(FinanceEntry,entry['id']).supplier_id=supplier.id;db.commit()
    mapping(admin,entry,'DO');recognize(admin,key);post(admin,f"/finance/{entry['id']}/cancel",{'reason':'Cancelamento especializado documentado'},200)
    save_cancellation(admin,cancellation_payload(admin,key,period()))
    review,_=reviewed(admin)
    assert admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).status_code==200
    with app.state.sessions() as db:db.scalar(select(User).where(User.username=='admin')).transport_operations=False;db.commit()
    for path in ('','/items','/issues','/reconciliation','.csv'):
        response=admin.get('/api/finance/dre'+path,params=period())
        assert response.status_code==200 and '20001' not in response.text and 'economic_adjustment:' not in response.text
    assert admin.get('/api/finance/dre',params=period()).json()['cancellation_version']==0
    assert admin.get('/api/finance/dre/period-reviews/'+str(review['id'])).status_code==403
