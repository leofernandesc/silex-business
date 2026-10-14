import sqlite3

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import select

from app.db import ROOT, build_engine, session_factory
from app.models import Account, Category, Supplier, User
from app.services import default_records, today


@pytest.mark.parametrize('key_type,key,expected', [
    ('cpf', '123.456.789-01', '12345678901'),
    ('cnpj', '12.ABC.345/01DE-35', '12ABC34501DE35'),
    ('email', 'PIX@EXAMPLE.COM', 'pix@example.com'),
    ('phone', '(92) 99999-1234', '+5592999991234'),
    ('random', '123E4567-E89B-12D3-A456-426655440000', '123e4567-e89b-12d3-a456-426655440000'),
])
def test_pix_formats_are_normalized_and_do_not_create_payments(env, key_type, key, expected):
    _, admin, operator, anonymous = env
    response = admin.post('/api/suppliers', json={
        'kind': 'day_worker', 'name': 'Diarista de teste',
        'pix_key_type': key_type, 'pix_key': key,
    })
    assert response.status_code == 201, response.text
    row = response.json()
    assert row['pix_key'] == expected and row['pix_holder'] == row['name']
    assert admin.get('/api/finance').json()['total'] == 0
    assert admin.get('/api/finance/movements').json()['total'] == 0
    assert admin.get('/api/suppliers?kind=day_worker').json()['total'] == 1
    assert admin.get('/api/suppliers?kind=subcontracted_freight').json()['total'] == 0
    assert operator.get('/api/suppliers').status_code == 403
    assert anonymous.get('/api/suppliers').status_code == 401
    assert operator.post('/api/suppliers', json={'name': 'Sem acesso'}).status_code == 403


@pytest.mark.parametrize('changes', [
    {'kind': 'invalid'},
    {'pix_key_type': 'email', 'pix_key': 'sem-arroba'},
    {'pix_key_type': 'cpf', 'pix_key': '123'},
    {'pix_key_type': 'cnpj', 'pix_key': '123'},
    {'pix_key_type': 'phone', 'pix_key': '+00000'},
    {'pix_key_type': 'random', 'pix_key': 'nao-e-uuid'},
    {'pix_key_type': '', 'pix_key': 'valor sem tipo'},
    {'pix_key_type': 'email', 'pix_key': ''},
    {'pix_key_type': 'email', 'pix_key': 'a' * 68 + '@example.com'},
])
def test_invalid_pix_and_recipient_types_are_rejected(env, changes):
    _, admin, _, _ = env
    assert admin.post('/api/suppliers', json={'name': 'Teste', **changes}).status_code == 422
    assert admin.get('/api/suppliers').json()['total'] == 0


@pytest.mark.parametrize('kind', ['day_worker', 'subcontracted_freight'])
def test_partner_in_payables_preserves_history_and_pix_does_not_send_money(env, kind):
    _, admin, _, _ = env
    payload = {'name': 'Prestador de teste', 'kind': kind, 'document': '123.456.789-01',
               'phone': '(92) 99999-1234', 'pix_key_type': 'email', 'pix_key': 'pix@example.com',
               'pix_holder': 'Titular indicado', 'notes': 'Valor acertado por serviço'}
    response = admin.post('/api/suppliers', json=payload)
    assert response.status_code == 201, response.text
    recipient = response.json()
    assert admin.post('/api/suppliers', json={**payload, 'kind': 'supplier'}).status_code == 409
    assert admin.get('/api/suppliers?kind=' + kind + '&q=pix%40example.com').json()['total'] == 1
    bank = next(row for row in admin.get('/api/accounts').json() if row['kind'] == 'bank')
    category = next(row for row in admin.get('/api/categories').json() if row['direction'] in ('expense', 'both'))
    title = {'description': 'Serviço do prestador', 'direction': 'expense', 'amount_cents': 15000,
             'account_id': bank['id'], 'category_id': category['id'], 'supplier_id': recipient['id'],
             'due_date': today().isoformat()}
    created = admin.post('/api/finance', json=title)
    assert created.status_code == 201, created.text
    entry = created.json()
    assert entry['supplier_kind'] == kind
    assert entry['supplier_pix'] == {'key_type': 'email', 'key': 'pix@example.com', 'holder': 'Titular indicado'}
    assert next(row for row in admin.get('/api/accounts').json() if row['id'] == bank['id'])['balance_cents'] == bank['balance_cents']
    assert admin.put('/api/suppliers/' + str(recipient['id']), json={**payload, 'kind': 'supplier'}).status_code == 409
    edited = admin.put('/api/suppliers/' + str(recipient['id']), json={**payload, 'name': 'Prestador atualizado', 'active': False})
    assert edited.status_code == 200, edited.text
    assert admin.get('/api/suppliers?kind=' + kind + '&active=true').json()['total'] == 0
    assert admin.get('/api/suppliers?kind=' + kind + '&active=false').json()['total'] == 1
    assert admin.post('/api/finance', json=title).status_code == 409
    historical = admin.get('/api/finance').json()['items'][0]
    assert historical['supplier_name'] == 'Prestador atualizado' and historical['status'] == 'open'
    assert historical['supplier_pix']['key'] == 'pix@example.com'
    # Cadastro inativo não elimina a obrigação já assumida.
    settled = admin.post('/api/finance/' + str(entry['id']) + '/settle',
                         json={'method': 'pix', 'account_id': bank['id']})
    assert settled.status_code == 200 and settled.json()['status'] == 'paid'
    assert len(settled.json()['payments']) == 1
    assert next(row for row in admin.get('/api/accounts').json() if row['id'] == bank['id'])['balance_cents'] == bank['balance_cents'] - 15000
    assert admin.post('/api/finance', json={**title, 'direction': 'income'}).status_code == 422


def test_supplier_migration_keeps_existing_supplier_and_financial_reference(tmp_path, monkeypatch):
    path = tmp_path / 'legacy.sqlite3'
    monkeypatch.setenv('GESTAO_DATABASE_URL', 'sqlite:///' + str(path))
    config = Config(str(ROOT / 'backend' / 'alembic.ini'))
    command.upgrade(config, '0006')
    engine = build_engine()
    with session_factory(engine)() as db:
        user = User(name='Legado', username='legacy', role='admin', password_hash='hash')
        db.add(user); default_records(db); db.flush()
        account = db.scalar(select(Account).where(Account.kind == 'bank'))
        category = db.scalar(select(Category).where(Category.name == 'Despesas operacionais'))
        db.commit()
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO suppliers (name,document,email,phone,address,active) VALUES ('Legado','12345678901','','','','1')")
        supplier_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
        db.execute('INSERT INTO finance_entries (description,direction,amount_cents,status,account_id,category_id,user_id,due_date,competence_date,created_at,supplier_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                   ('Título existente', 'expense', 4321, 'open', account.id, category.id, user.id, '2026-01-01', '2026-01-01', '2026-01-01 12:00:00', supplier_id))
        db.commit()
    command.upgrade(config, 'head')
    with session_factory(engine)() as db:
        row = db.get(Supplier, supplier_id)
        assert row.name == 'Legado' and row.kind == 'supplier' and row.pix_key == ''
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT supplier_id,amount_cents FROM finance_entries').fetchone() == (supplier_id, 4321)
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
    engine.dispose()
