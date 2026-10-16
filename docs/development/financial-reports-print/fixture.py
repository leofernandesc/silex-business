"""Disposable IMP01 fixture. Never opens the application's persistent database."""
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import date

root = Path(__file__).resolve().parents[3]
evidence = Path(os.environ['SILEX_REPORT_EVIDENCE'])
work = Path(json.loads((evidence / 'baseline.json').read_text())['work'])
assert str(work).startswith('/tmp/silex-report-print-')
database = work / 'synthetic.sqlite3'
assert not database.exists()
os.environ['GESTAO_DATABASE_URL'] = f'sqlite:///{database}'
sys.path.insert(0, str(root / 'backend'))
for command in ['init', 'seed-demo']:
    subprocess.run([sys.executable, '-m', 'app.cli', command], cwd=root,
                   env={**os.environ, 'PYTHONPATH': str(root / 'backend')},
                   check=True, stdout=subprocess.DEVNULL)

from fastapi.testclient import TestClient
from app.api import create_app
from app.db import build_engine
from app.models import Account

app = create_app(build_engine(), serve_frontend=False)
with TestClient(app) as client:
    assert client.post('/api/auth/login', json={
        'username': 'demo.admin', 'password': os.environ['SILEX_TEST_PASSWORD'],
    }).is_success

    def api(method, path, **kwargs):
        response = client.request(method, '/api' + path, **kwargs)
        assert response.is_success, (path, response.status_code, response.text)
        return response.json()

    accounts = api('GET', '/accounts')
    bank = next(row for row in accounts if row['kind'] == 'bank')
    categories = api('GET', '/categories')
    subcategories = api('GET', '/subcategories')
    customer = api('GET', '/customers')['items'][0]
    supplier = api('POST', '/suppliers', json={
        'name': 'Fornecedor fictício IMP01', 'kind': 'supplier',
    })
    # Fixture only: permit historical test payments under existing account rules.
    with app.state.sessions() as db:
        db.get(Account, bank['id']).opening_date = date(2020, 1, 1)
        db.commit()
    for index in range(45):
        direction = 'income' if index % 2 == 0 else 'expense'
        category = next(row for row in categories if row['name'] == (
            'Outras receitas' if direction == 'income' else 'Despesas operacionais'))
        subcategory = next(row for row in subcategories if row['category_id'] == category['id'])
        title = api('POST', '/finance', json={
            'description': f'IMP01 documento fictício {index:02d} ' + ('Z' * 120 if index % 3 == 0 else 'Descrição extensa para conferência de impressão sem dados reais'),
            'direction': direction, 'amount_cents': 123456789 + index,
            'account_id': bank['id'], 'category_id': category['id'],
            'subcategory_id': subcategory['id'],
            'customer_id': customer['id'] if direction == 'income' else None,
            'supplier_id': supplier['id'] if direction == 'expense' else None,
            'due_date': ['2024-02-29', '2026-01-31', '2026-12-31', '2027-01-01'][index % 4],
            'competence_date': ['2024-02-29', '2026-01-01', '2026-03-04'][index % 3],
            'document': f'IMP01-{index:03d}',
        })
        if index < 30:
            paid = api('POST', f"/finance/{title['id']}/settle", json={
                'method': 'pix', 'account_id': bank['id'], 'principal_cents': 12345678,
                'interest_cents': 7, 'fine_cents': 3, 'discount_cents': 1,
                'posting_date': f'2024-03-{index % 28 + 1:02d}',
                'request_key': f'imp01-fixture-pay-{index:02d}',
            })
            if index == 1:
                api('POST', f"/finance/payments/{paid['payments'][-1]['id']}/reverse",
                    json={'reason': 'Estorno fictício para validar impressão IMP01'})
    expense = next(row for row in categories if row['name'] == 'Despesas operacionais')
    api('POST', '/finance/budgets', json={
        'year': 2024, 'month': 3, 'category_id': expense['id'],
        'target_cents': 123456789, 'notes': 'Meta fictícia IMP01 ' + 'N' * 220,
    })
    catalog = api('GET', '/finance/reports/catalog')
    assert len(catalog) == 26
    (evidence / 'fixture.json').write_text(json.dumps({
        'synthetic_only': True, 'database': str(database), 'catalog': catalog,
        'account_id': bank['id'], 'category_id': expense['id'],
    }, indent=2))
print('Disposable synthetic IMP01 fixture ready: 45 titles, 30 payments, reversal and budget.')
