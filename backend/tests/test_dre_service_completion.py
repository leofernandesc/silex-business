from sqlalchemy import select
from app import services as V
from app.models import ServiceOrder,ServiceOrderCost,FinanceEntry
from test_finance_expansion import post
from test_dre_api import mapping,period


def test_completion_cost_evidence_then_unique_titles_and_dre(env):
    app,admin,operator,anonymous=env
    customer=post(admin,'/customers',{'name':'Cliente fictício DRE'})
    worker=post(admin,'/suppliers',{'name':'Prestador fictício','kind':'day_worker'})
    order=post(admin,'/service-orders',{'customer_id':customer['id'],'description':'Serviço comprovado fictício','service_date':V.today().isoformat(),'negotiated_cents':500001,
        'costs':[{'supplier_id':worker['id'],'kind':'day_worker','quantity_milli':1000,'agreed_amount_cents':200001}]})
    payload={'completed_on':V.today().isoformat(),'reason':'Execução e custo comprovados na fixture','request_key':'completion-unique-fixture-key','incurred_costs':[{'cost_id':order['costs'][0]['id'],'incurred_on':V.today().isoformat()}]}
    path=f"/service-orders/{order['id']}/complete"
    assert operator.post('/api'+path,json=payload).status_code==403
    assert anonymous.post('/api'+path,json=payload).status_code==401
    completed=post(admin,path,payload,200)
    assert completed['status']=='completed' and completed['completed_on']==V.today().isoformat()
    assert completed['title_run_id'] is None
    assert post(admin,path,payload,200)['completed_at']==completed['completed_at']
    assert admin.post('/api'+path,json={**payload,'reason':'Outra conclusão não autorizada'}).status_code==409
    pending=admin.get('/api/finance/dre',params=period()).json()
    assert pending['facts']==[] and any('titles_required' in issue['codes'] for issue in pending['issues'])
    account=next(a for a in admin.get('/api/accounts').json() if a['kind']=='bank')
    title_payload={'account_id':account['id'],'due_date':V.today().isoformat(),'competence_date':V.today().isoformat()}
    generated=post(admin,f"/service-orders/{order['id']}/generate-titles",title_payload,200)
    replayed=post(admin,f"/service-orders/{order['id']}/generate-titles",title_payload,200)
    assert generated['created'] is True and replayed['created'] is False
    assert replayed['service_order']['title_run_id']==generated['service_order']['title_run_id']
    with app.state.sessions() as db:
        entries=list(db.scalars(select(FinanceEntry).where(FinanceEntry.service_order_id==order['id'])))
        assert len(entries)==2
        values=[V.data(e) for e in entries]
        assert db.get(ServiceOrderCost,order['costs'][0]['id']).incurred_on==V.today()
    for entry in values:mapping(admin,entry,'RB' if entry['direction']=='income' else 'CD')
    result=admin.get('/api/finance/dre',params=period()).json()
    assert {(f['dre_line_code'],f['amount_cents']) for f in result['facts']}=={('RB',500001),('CD',200001)}
    assert len({f['key'] for f in result['facts']})==2
    assert next(r for r in result['lines'] if r['code']=='LL')['final_amount_cents'] is None
    # A separate request/session reads the persisted dates and the same existing IDs.
    restored=admin.get(f"/api/service-orders/{order['id']}").json()
    assert restored['completed_on']==completed['completed_on']
    assert restored['costs'][0]['id']==order['costs'][0]['id']
    assert restored['costs'][0]['incurred_on']==V.today().isoformat()
