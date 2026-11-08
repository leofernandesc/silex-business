"""Integer-cent reconciliation of the existing financial read models and shortcuts."""
from datetime import date, timedelta

import pytest

from app import services as V
from test_finance_expansion import post, title


@pytest.mark.parametrize('direction', ['income', 'expense'])
def test_pending_shortcuts_reconcile_partial_overdue_and_due_window(env, monkeypatch, direction):
    _, admin, _, _ = env
    reference = date(2026, 11, 7)
    # The disposable account opening reference must belong to the same frozen scenario.
    # Freezing only services.today after the fixture was created made this test fail
    # on later wall-clock dates; production's opening-date guard must remain strict.
    from app.models import Account
    from sqlalchemy import select
    app = env[0]
    with app.state.sessions() as db:
        for account in db.scalars(select(Account)):
            account.opening_date = reference
        db.commit()
    monkeypatch.setattr(V, 'today', lambda: reference)
    late = title(admin, direction, 10_001, due=reference-timedelta(days=1))
    first = title(admin, direction, 20_002, due=reference)
    last = title(admin, direction, 30_003, due=reference+timedelta(days=7))
    outside = title(admin, direction, 40_004, due=reference+timedelta(days=8))
    canceled = title(admin, direction, 50_005, due=reference)
    post(admin, f"/finance/{canceled['id']}/cancel", {'reason': 'Cancelamento fictício'}, 200)
    settlement = post(admin, f"/finance/{late['id']}/settle", {
        'method': 'pix', 'account_id': late['account_id'], 'principal_cents': 3_001,
        'interest_cents': 101, 'fine_cents': 17, 'discount_cents': 37,
        'request_key': 'stage1-integer-cent-partial',
    }, 200)
    assert settlement['remaining_cents'] == 7_000
    pending = admin.get('/api/finance', params={'direction': direction, 'status': 'pending', 'page_size': 1}).json()
    assert pending['total'] == 4 and len(pending['items']) == 1
    assert pending['summary'] == dict(pending_cents=97_009, overdue_cents=7_000,
                                    due_7_days_cents=50_005, count=4, as_of_date='2026-11-07')
    # Open still means open; the additive alias must not redefine it.
    assert admin.get('/api/finance', params={'direction': direction, 'status': 'open'}).json()['total'] == 3
    due = admin.get('/api/finance', params={'direction': direction, 'status': 'pending',
             'date_field': 'due', 'start': '2026-11-07', 'end': '2026-11-14'}).json()
    assert {x['id'] for x in due['items']} == {first['id'], last['id']}
    assert due['summary']['pending_cents'] == pending['summary']['due_7_days_cents']
    dashboard = admin.get('/api/finance/dashboard', params={'start': '2026-01-01', 'end': '2026-12-31'}).json()
    prefix = 'receivable' if direction == 'income' else 'payable'
    assert dashboard[prefix+'_open_cents'] == pending['summary']['pending_cents']
    assert dashboard[prefix+'_overdue_cents'] == pending['summary']['overdue_cents']
    assert dashboard[direction+'_cents' if direction == 'income' else 'expense_cents'] == 3_082
    assert abs(sum(a['balance_cents']-a['opening_cents'] for a in dashboard['accounts'])) == 3_082
    ledger = admin.get('/api/finance/movements', params={'start': '2026-01-01', 'end': '2026-12-31', 'date_field': 'posting', 'direction': direction}).json()
    assert ledger['summary']['income_cents' if direction == 'income' else 'expense_cents'] == 3_082
    # Reversal does not disappear or modify original cash; existing signed movement semantics remain.
    post(admin, f"/finance/payments/{settlement['payments'][0]['id']}/reverse", {'reason': 'Estorno fictício'}, 200)
    restored = admin.get('/api/finance', params={'direction': direction, 'status': 'pending'}).json()
    assert restored['summary']['pending_cents'] == 100_010
    reversed_dash = admin.get('/api/finance/dashboard', params={'start': '2026-01-01', 'end': '2026-12-31'}).json()
    assert reversed_dash['income_cents'] == reversed_dash['expense_cents'] == 3_082
    assert reversed_dash['net_cents'] == 0
    assert sum(a['balance_cents']-a['opening_cents'] for a in reversed_dash['accounts']) == 0


def test_financial_shortcuts_keep_admin_authorization_and_zero_is_real(env):
    _, admin, operator, anonymous = env
    params = {'direction': 'income', 'status': 'pending'}
    assert operator.get('/api/finance', params=params).status_code == 403
    assert anonymous.get('/api/finance', params=params).status_code == 401
    assert operator.get('/api/finance/dashboard').status_code == 403
    data = admin.get('/api/finance', params=params).json()
    assert data['total'] == 0
    assert data['summary']['pending_cents'] == data['summary']['due_7_days_cents'] == 0
    dash = admin.get('/api/finance/dashboard').json()
    assert dash['income_cents'] == dash['expense_cents'] == dash['net_cents'] == 0
    assert len(dash['monthly']) == 12
