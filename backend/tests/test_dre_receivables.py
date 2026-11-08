from datetime import timedelta
from app import services as V
from test_finance_expansion import title, post


def test_home_and_financial_receivables_share_partial_and_reversal(env):
    _, admin, operator, _ = env
    entry=title(admin,'income',10001,due=V.today()-timedelta(days=1))
    paid=post(admin,f"/finance/{entry['id']}/settle",{'account_id':entry['account_id'],'method':'pix','principal_cents':4001,'request_key':'dre-partial-fictitious-key'},200)
    for expected in (6000,10001):
        home=admin.get('/api/dashboard').json()
        financial=admin.get('/api/finance/dashboard').json()
        assert home['receivable_cents']==financial['receivable_open_cents']==expected
        assert home['overdue_cents']==financial['receivable_overdue_cents']==expected
        assert operator.get('/api/dashboard').json()['receivable_cents'] is None
        if expected==6000:
            post(admin,f"/finance/payments/{paid['payments'][0]['id']}/reverse",{'reason':'Estorno fictício'},200)
