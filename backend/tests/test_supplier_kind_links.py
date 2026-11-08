"""Supplier kind is immutable while operational or financial records reference it."""
import sqlite3

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api import create_app
from app.db import build_engine
from app.models import Account, FinanceEntry, Payment, ServiceOrder, ServiceOrderCost, ServiceOrderTitleRun, Supplier
from app.services import today
from test_transport_capabilities import accounts, partner


def contracted_cost(client, kind='subcontracted_freight'):
    provider = partner(client, kind)
    response = client.post('/api/customers', json={'name': 'Cliente fictício dos vínculos'})
    assert response.status_code == 201, response.text
    cost = {'kind': kind, 'supplier_id': provider['id'], 'agreed_amount_cents': 12_345}
    if kind == 'day_worker':
        cost['quantity_milli'] = 1500
    response = client.post('/api/service-orders', json={
        'customer_id': response.json()['id'], 'description': 'Serviço genérico fictício',
        'service_date': today().isoformat(), 'negotiated_cents': 123_456, 'costs': [cost],
    })
    assert response.status_code == 201, response.text
    return provider, response.json()


def snapshot(app):
    """Capture every stored column of the affected catalog/operational/financial tables."""
    models = (Supplier, ServiceOrder, ServiceOrderCost, ServiceOrderTitleRun, FinanceEntry, Payment, Account)
    with app.state.sessions() as db:
        return {model.__tablename__: [tuple(row) for row in db.execute(select(model.__table__).order_by(model.id))] for model in models}


def generation_body(client):
    bank = next(row for row in client.get('/api/accounts').json() if row['kind'] == 'bank')
    return {'account_id': bank['id'], 'due_date': today().isoformat(), 'competence_date': today().isoformat()}


@pytest.mark.parametrize('kind', ['subcontracted_freight', 'day_worker'])
def test_cost_without_finance_blocks_kind_change_and_preserves_every_link(accounts, kind):
    client, app = accounts['sammya'], accounts['app']
    provider, order = contracted_cost(client, kind)
    assert order['title_run_id'] is None and order['titles'] == []
    assert client.get('/api/finance').json()['total'] == 0
    before = snapshot(app)
    response = client.put(f"/api/suppliers/{provider['id']}", json={
        'name': 'Não deve ser gravado', 'kind': 'supplier', 'phone': '000000000',
    })
    assert response.status_code == 409, response.text
    assert response.json()['detail'] == 'Beneficiário com custos operacionais vinculados não pode mudar de tipo'
    assert snapshot(app) == before
    if kind == 'subcontracted_freight':
        assert accounts['demo'].get('/api/suppliers').json()['total'] == 0


def test_legacy_generic_supplier_with_operational_link_is_protected(accounts):
    client, app = accounts['sammya'], accounts['app']
    provider, _ = contracted_cost(client, 'day_worker')
    # Emulate inconsistent history reachable through the old edit endpoint. This is NOT
    # an API-supported association of a generic supplier to a newly contracted cost.
    with app.state.sessions() as db:
        db.get(Supplier, provider['id']).kind = 'supplier'
        db.commit()
    before = snapshot(app)
    response = accounts['demo'].put(f"/api/suppliers/{provider['id']}", json={'name': provider['name'], 'kind': 'day_worker'})
    assert response.status_code == 409, response.text
    assert snapshot(app) == before


def test_new_generic_supplier_cannot_be_associated_as_day_worker(accounts):
    client = accounts['demo']
    provider = partner(client, 'supplier')
    response = client.post('/api/customers', json={'name': 'Cliente fictício da validação'})
    assert response.status_code == 201
    before = snapshot(accounts['app'])
    response = client.post('/api/service-orders', json={
        'customer_id': response.json()['id'], 'description': 'Associação incompatível fictícia',
        'service_date': today().isoformat(), 'negotiated_cents': 123_456,
        'costs': [{'kind': 'day_worker', 'supplier_id': provider['id'], 'quantity_milli': 1000, 'agreed_amount_cents': 12_345}],
    })
    assert response.status_code == 422
    assert snapshot(accounts['app']) == before


@pytest.mark.parametrize('kind', ['supplier', 'day_worker', 'subcontracted_freight'])
def test_financial_history_restriction_is_preserved(accounts, kind):
    client, app = accounts['sammya'], accounts['app']
    provider = partner(client, kind)
    account = generation_body(client)['account_id']
    category = next(row for row in client.get('/api/categories').json() if row['direction'] in ('expense', 'both'))
    response = client.post('/api/finance', json={
        'description': 'Histórico financeiro fictício', 'direction': 'expense', 'amount_cents': 12_345,
        'account_id': account, 'category_id': category['id'], 'supplier_id': provider['id'], 'due_date': today().isoformat(),
    })
    assert response.status_code == 201, response.text
    before = snapshot(app)
    response = client.put(f"/api/suppliers/{provider['id']}", json={'name': provider['name'], 'kind': 'day_worker' if kind == 'supplier' else 'supplier'})
    assert response.status_code == 409
    assert response.json()['detail'] == 'Beneficiário com histórico financeiro não pode mudar de tipo'
    assert snapshot(app) == before


@pytest.mark.parametrize('who,old,new,status', [
    ('demo', 'supplier', 'day_worker', 200),
    ('demo', 'day_worker', 'supplier', 200),
    ('sammya', 'subcontracted_freight', 'supplier', 200),
    ('sammya', 'supplier', 'subcontracted_freight', 200),
    ('demo', 'supplier', 'subcontracted_freight', 403),
    ('admin', 'supplier', 'subcontracted_freight', 403),
])
def test_unlinked_kind_change_follows_existing_capability(accounts, who, old, new, status):
    creator = accounts['sammya'] if old == 'subcontracted_freight' else accounts[who]
    provider = partner(creator, old)
    before = snapshot(accounts['app'])
    response = accounts[who].put(f"/api/suppliers/{provider['id']}", json={'name': provider['name'], 'kind': new})
    assert response.status_code == status, response.text
    if status == 200:
        assert response.json()['id'] == provider['id'] and response.json()['kind'] == new
        after = snapshot(accounts['app'])
        assert {k: v for k, v in before.items() if k != 'suppliers'} == {k: v for k, v in after.items() if k != 'suppliers'}
    else:
        assert snapshot(accounts['app']) == before


@pytest.mark.parametrize('kind', ['subcontracted_freight', 'day_worker'])
def test_common_edit_retains_costs_and_generates_identical_contracted_amounts(accounts, kind):
    client = accounts['sammya'] if kind == 'subcontracted_freight' else accounts['demo']
    provider, order = contracted_cost(client, kind)
    before = snapshot(accounts['app'])
    response = client.put(f"/api/suppliers/{provider['id']}", json={
        'name': 'Prestador fictício atualizado', 'kind': kind,
        'contact_name': 'Contato fictício', 'phone': '000000000', 'email': 'provider@example.invalid',
    })
    assert response.status_code == 200, response.text
    assert response.json()['contact_name'] == 'Contato fictício'
    after = snapshot(accounts['app'])
    assert {k: v for k, v in before.items() if k != 'suppliers'} == {k: v for k, v in after.items() if k != 'suppliers'}
    response = client.post(f"/api/service-orders/{order['id']}/generate-titles", json=generation_body(client))
    assert response.status_code == 200, response.text
    result = response.json()['service_order']
    assert result['id'] == order['id'] and result['expected_cost_cents'] == 12_345
    assert result['negotiated_cents'] == 123_456
    cost = result['costs'][0]
    assert (cost['id'], cost['supplier_id'], cost['kind'], cost['agreed_amount_cents']) == (order['costs'][0]['id'], provider['id'], kind, 12_345)
    expense = next(row for row in result['titles'] if row['direction'] == 'expense')
    income = next(row for row in result['titles'] if row['direction'] == 'income')
    assert expense['amount_cents'] == 12_345 and cost['finance_entry_id'] == expense['id']
    # order_data exposes a compact title summary, not supplier_id/service_order_cost_id.
    # Check the actual persisted FKs, without changing the public contract or weakening them.
    with accounts['app'].state.sessions() as db:
        saved = db.get(FinanceEntry, expense['id'])
        assert saved.supplier_id == provider['id'] and saved.amount_cents == 12_345
        assert saved.service_order_id == order['id'] and saved.service_order_cost_id == cost['id']
    assert income['amount_cents'] == 123_456
    assert snapshot(accounts['app'])['payments'] == before['payments']
    assert snapshot(accounts['app'])['accounts'] == before['accounts']
    # Generic financial history is still readable without the specialized module.
    assert accounts['demo'].get('/api/finance').content == accounts['sammya'].get('/api/finance').content


@pytest.mark.parametrize('who,status', [('demo', 403), ('admin', 403), ('operator', 403), ('anonymous', 401)])
def test_direct_specialized_requests_remain_denied_without_capability(accounts, who, status):
    provider, order = contracted_cost(accounts['sammya'])
    body = generation_body(accounts['sammya'])
    before = snapshot(accounts['app'])
    client = accounts[who]
    assert client.get('/api/suppliers?kind=subcontracted_freight').status_code == status
    assert client.put(f"/api/suppliers/{provider['id']}", json={'name': 'Não autorizado', 'kind': 'supplier'}).status_code == status
    assert client.post(f"/api/service-orders/{order['id']}/generate-titles", json=body).status_code == status
    assert snapshot(accounts['app']) == before


def test_kind_guard_and_common_edits_survive_application_restart(accounts):
    app, authorized = accounts['app'], accounts['sammya']
    provider, order = contracted_cost(authorized)
    response = authorized.put(f"/api/suppliers/{provider['id']}", json={
        'name': 'Nome fictício persistente', 'kind': 'subcontracted_freight', 'contact_name': 'Contato persistente',
    })
    assert response.status_code == 200
    before = snapshot(app)
    url = str(app.state.engine.url)
    app.state.engine.dispose()
    engine = build_engine(url)
    restarted = create_app(engine, serve_frontend=False)
    try:
        with TestClient(restarted) as client:
            client.cookies.update(authorized.cookies)
            assert client.get('/api/auth/me').status_code == 200
            rows = client.get('/api/suppliers?kind=subcontracted_freight').json()['items']
            saved = next(row for row in rows if row['id'] == provider['id'])
            assert saved['name'] == 'Nome fictício persistente' and saved['contact_name'] == 'Contato persistente'
            response = client.put(f"/api/suppliers/{provider['id']}", json={'name': 'Não gravado', 'kind': 'supplier'})
            assert response.status_code == 409
            assert snapshot(restarted) == before
            result = client.post(f"/api/service-orders/{order['id']}/generate-titles", json=generation_body(client))
            assert result.status_code == 200, result.text
            assert result.json()['service_order']['costs'][0]['supplier_id'] == provider['id']
        with sqlite3.connect(engine.url.database) as db:
            assert db.execute('pragma integrity_check').fetchone() == ('ok',)
            assert db.execute('pragma foreign_key_check').fetchall() == []
    finally:
        engine.dispose()
