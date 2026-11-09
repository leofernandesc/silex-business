"""Independent synthetic service lifecycle: missing setup is not a zero result."""
from uuid import uuid4
from app.dre_policy import BASE_LINES


def test_service_lifecycle_demonstrates_empty_pending_partial_and_documented_complete_dre(env):
    app,admin,_,_=env
    period='start=2000-01-01&end=2000-01-31'
    def get():
        r=admin.get('/api/finance/dre?'+period);assert r.status_code==200;return r.json()
    def post(path,body,status=201):
        r=admin.post('/api'+path,json=body);assert r.status_code==status,r.text;return r.json()
    empty=get();assert empty['facts']==empty['issues']==empty['excluded']==[]
    assert all(row['known_amount_cents'] is None and row['final_amount_cents'] is None for row in empty['lines'])
    customer=post('/customers',{'name':'Empresa fictícia da homologação DRE'})
    supplier=post('/suppliers',{'name':'Prestador fictício de serviços gerais','kind':'day_worker'})
    order=post('/service-orders',{'customer_id':customer['id'],'description':'Serviço fictício comprovado','service_date':'2000-01-10','negotiated_cents':500001,'costs':[{'kind':'day_worker','supplier_id':supplier['id'],'quantity_milli':1000,'agreed_amount_cents':200001,'details':'Custo fictício documentado'}]})
    account=next(a for a in admin.get('/api/accounts').json() if a['kind']=='bank')
    post(f"/service-orders/{order['id']}/complete",{'completed_on':'2000-01-10','reason':'Execução e custo fictícios comprovados na fixture','request_key':str(uuid4()),'incurred_costs':[{'cost_id':order['costs'][0]['id'],'incurred_on':'2000-01-10'}]},200)
    generated=post(f"/service-orders/{order['id']}/generate-titles",{'account_id':account['id'],'due_date':'2000-01-20','competence_date':'2000-01-10'},200)
    pending=get();assert pending['mapping_version']==pending['decision_version']==pending['cancellation_version']==0
    assert pending['facts']==[] and len(pending['issues'])==2
    assert all('unclassified' in i['codes'] for i in pending['issues'])
    revenue=next(t for t in generated['service_order']['titles'] if t['direction']=='income')
    for title,line in [(t,'RB' if t['source_type']=='service_order' else 'CD') for t in pending['issues']]:
        values={'category_id':title['category_id'],'subcategory_id':title.get('subcategory_id'),'line_code':line,'valid_from':'2000-01-01','valid_to':'2000-01-31','expected_revision':0,'reason':'Classificação fictícia comprovada na fixture'}
        preview=post('/finance/dre/mappings/preview',values,200);post('/finance/dre/mappings',{**values,'preview_token':preview['preview_token']})
    partial=get();lines={r['code']:r for r in partial['lines']}
    assert lines['RB']['known_amount_cents']==500001 and lines['CD']['known_amount_cents']==200001
    assert lines['LL']['final_amount_cents'] is None and len(partial['facts'])==2 and partial['issues']==[]
    # Completed/dated evidence already permits recognition. Explicit review is
    # tested too, without inventing a second revenue or modifying any title.
    source=next(i for i in pending['issues'] if i['source_type']=='service_order')
    policy=admin.get('/api/finance/dre/recognition-policy',params={'source_key':source['key'],'economic_date':'2000-01-10'}).json()
    post('/finance/dre/recognition-review',{'source_key':source['key'],'decision':'recognize','economic_date':'2000-01-10','source_fingerprint':source['source_fingerprint'],'policy_fingerprint':policy['policy_fingerprint'],'evidence_kind':'Documento fictício da execução','reason':'Conferência explícita fictícia sem duplicar receita','expected_revision':0,'request_key':str(uuid4())})
    paid=post(f"/finance/{revenue['id']}/settle",{'method':'pix','account_id':account['id'],'principal_cents':200001,'interest_cents':0,'fine_cents':0,'discount_cents':0,'posting_date':admin.get('/api/dashboard').json()['date'],'request_key':str(uuid4())},200)
    assert paid['remaining_cents']==300000
    after_payment=get();assert sum(f['amount_cents'] for f in after_payment['facts'] if f['dre_line_code']=='RB')==500001
    assert len([f for f in after_payment['facts'] if f['dre_line_code']=='RB'])==1
    post(f"/finance/payments/{paid['payments'][0]['id']}/reverse",{'reason':'Estorno bancário fictício sem cancelamento econômico'},200)
    restored=admin.get(f"/api/finance/dre/source-entry/{revenue['id']}").json();assert restored['remaining_cents']==500001
    after_reversal=get();assert after_reversal['facts']==after_payment['facts'] and after_reversal['issues']==[]
    # Synthetic proof for every base component only. This never runs on a
    # persistent database and does not imply a real company's costs/taxes are zero.
    for line in BASE_LINES:
        report=get();post('/finance/dre/component-assertions',{'start':'2000-01-01','end':'2000-01-31','source_fingerprint':report['source_fingerprint'],'line_code':line,'assertion_kind':'complete','reason':'Cobertura integral e zeros comprovados SOMENTE nesta fixture fictícia'})
    complete=get();lines={r['code']:r for r in complete['lines']}
    assert all(r['coverage_status']=='complete' for r in complete['lines'])
    assert lines['LL']['final_amount_cents']==500001-200001==300000
    assert lines['EBITDA']['final_amount_cents']==300000 and complete['margins']['LL']['value']=='60.00'
    assert admin.get('/api/finance/dre.csv?'+period).status_code==200
