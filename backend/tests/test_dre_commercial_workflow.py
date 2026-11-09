"""Prove reusable setup without inferring per-source evidence or double-counting cash."""
from sqlalchemy import select,func
from app import services as V
from app.models import DreMapping,DreDecision,DreAssertion
from test_finance_expansion import post,title
from test_dre_api import mapping,period,recognize


def test_initial_setup_reused_for_services_but_not_unproven_manual_facts(env):
    app,admin,operator,visitor=env
    today=V.today().isoformat()
    # Obtain the actual category used by title generation, not its display name.
    customer=post(admin,'/customers',{'name':'Empresa fictícia da DRE comercial'})
    account=next(a for a in admin.get('/api/accounts').json() if a['kind']=='bank')
    def service(completed=True):
        order=post(admin,'/service-orders',{'customer_id':customer['id'],'description':'Serviço sintético comprovável','service_date':today,'negotiated_cents':500001,'costs':[]})
        if completed:post(admin,f"/service-orders/{order['id']}/complete",{'completed_on':today,'reason':'Execução comprovada com documento fictício','request_key':f"complete-commercial-fixture-{order['id']}",'incurred_costs':[]},200)
        payload={'account_id':account['id'],'due_date':today,'competence_date':today}
        generated=post(admin,f"/service-orders/{order['id']}/generate-titles",payload,200)
        assert not post(admin,f"/service-orders/{order['id']}/generate-titles",payload,200)['created']
        return order,generated['service_order']['titles'][0]
    first,entry=service();entry=admin.get(f"/api/finance/dre/source-entry/{entry['id']}").json();mapping(admin,entry)
    second,second_entry=service()
    initial=admin.get('/api/finance/dre',params=period()).json()
    assert {(f['source_id'],f['amount_cents']) for f in initial['facts']}=={(first['id'],500001),(second['id'],500001)}
    assert not initial['issues']
    paid=post(admin,f"/finance/{entry['id']}/settle",{'account_id':account['id'],'method':'pix','principal_cents':200001,'request_key':'commercial-fixture-partial'},200)
    reconciliation=admin.get('/api/finance/dre/reconciliation',params=period()).json()
    assert next(r for r in reconciliation['reconciliation'] if r['key']==f"service_order:{first['id']}:revenue")['outstanding_principal_cents']==300000
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==initial['facts']
    post(admin,f"/finance/payments/{paid['payments'][0]['id']}/reverse",{'reason':'Estorno sintético sem cancelar serviço'},200)
    assert admin.get('/api/finance/dre',params=period()).json()['facts']==initial['facts']
    unfinished,_=service(False)
    current=admin.get('/api/finance/dre',params=period()).json()
    assert any(i.get('key')==f"service_order:{unfinished['id']}:revenue" and 'service_not_completed' in i['codes'] for i in current['issues'])
    assert current['facts']==initial['facts']
    manual=title(admin,'income',10001);mapping(admin,manual)
    key=f"finance_entry:{manual['id']}:principal"
    assert not any(f['key']==key for f in admin.get('/api/finance/dre',params=period()).json()['facts'])
    recognize(admin,key)
    current=admin.get('/api/finance/dre',params=period()).json()
    assert len([f for f in current['facts'] if f['key']==key and f['amount_cents']==10001])==1
    assert not any(i.get('key')==key for i in current['issues'])
    assert next(l for l in current['lines'] if l['code']=='LL')['final_amount_cents'] is None
    with app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(DreDecision))==1
        assert db.scalar(select(func.count()).select_from(DreMapping))==2
        assert db.scalar(select(func.count()).select_from(DreAssertion))==0
    for client,status in ((operator,403),(visitor,401)):
        for path in ('/finance/dre','/finance/dre/mappings','/finance/dre/issues','/finance/dre.csv'):
            assert client.get('/api'+path,params=period()).status_code==status
