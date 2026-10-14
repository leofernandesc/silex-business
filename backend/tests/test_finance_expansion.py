import base64
import csv
import io
import sqlite3
import zipfile
from datetime import date, timedelta

from alembic import command
from alembic.config import Config
from sqlalchemy import select

from app.cli import backup_bundle
from app.db import ROOT, build_engine, session_factory
from app.models import Account, Category, FinanceEntry, Payment, User
from app.services import default_records, today


def post(client, path, body, status=201):
    response = client.post('/api' + path, json=body)
    assert response.status_code == status, response.text
    return response.json()


def title(client, direction='expense', amount=10_000, *, due=None, competence=None, **extra):
    accounts = client.get('/api/accounts').json()
    categories = client.get('/api/categories').json()
    category = next(row for row in categories if row['name'] == ('Despesas operacionais' if direction == 'expense' else 'Outras receitas'))
    body = {
        'description': 'Título de teste',
        'direction': direction,
        'amount_cents': amount,
        'account_id': next(row['id'] for row in accounts if row['kind'] == 'bank'),
        'category_id': category['id'],
        'due_date': (due or today()).isoformat(),
        'competence_date': (competence or due or today()).isoformat(),
        **extra,
    }
    return post(client, '/finance', body)


def ofx(fitid, cents, posted=None, name='Fornecedor teste'):
    posted = posted or today()
    amount = f'{abs(cents) // 100}.{abs(cents) % 100:02d}'
    if cents < 0:
        amount = '-' + amount
    return f'''OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN>
<TRNTYPE>{'CREDIT' if cents > 0 else 'DEBIT'}
<DTPOSTED>{posted:%Y%m%d}120000[-4:AMT]
<TRNAMT>{amount}
<FITID>{fitid}
<NAME>{name}
<MEMO>Movimento de teste
</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>'''


def test_recurrence_is_finite_month_clamped_and_does_not_move_account(env):
    _, admin, _, _ = env
    customer = post(admin, '/customers', {'name': 'Cliente recorrente'})
    account = next(a for a in admin.get('/api/accounts').json() if a['kind'] == 'bank')
    balance_before = account['balance_cents']
    result = post(admin, '/finance', {
        'description': 'Mensalidade de teste', 'direction': 'income', 'amount_cents': 10_000,
        'account_id': account['id'], 'category_id': next(c['id'] for c in admin.get('/api/categories').json() if c['name'] == 'Outras receitas'),
        'customer_id': customer['id'], 'document': 'DOC-REC-01', 'due_date': '2026-01-31',
        'competence_date': '2026-01-31', 'recurrence_count': 3, 'recurrence_frequency': 'monthly',
    })
    assert result['total'] == 3
    assert [row['due_date'] for row in result['items']] == ['2026-01-31', '2026-02-28', '2026-03-31']
    assert [row['amount_cents'] for row in result['items']] == [10_000] * 3
    assert [row['recurrence_index'] for row in result['items']] == [1, 2, 3]
    assert all(row['status'] == 'open' and row['payments'] == [] for row in result['items'])
    assert all(row['customer_name'] == 'Cliente recorrente' and row['document'] == 'DOC-REC-01' for row in result['items'])
    assert result['items'][0]['recurrence_id'] == result['items'][2]['recurrence_id']
    assert next(a for a in admin.get('/api/accounts').json() if a['id'] == account['id'])['balance_cents'] == balance_before
    assert admin.post('/api/finance', json={**{
        'description': 'Contagem inválida', 'direction': 'income', 'amount_cents': 100,
        'account_id': account['id'], 'category_id': result['items'][0]['category_id'],
        'due_date': today().isoformat(), 'recurrence_count': 61,
    }}).status_code == 422


def test_partial_settlements_are_idempotent_and_reversals_restore_balance(env):
    app, admin, _, _ = env
    entry = title(admin)
    account_id = entry['account_id']
    first_body = {'method': 'pix', 'account_id': account_id, 'principal_cents': 3_000, 'interest_cents': 125, 'fine_cents': 75, 'discount_cents': 200, 'request_key': 'payment-partial-001'}
    first = admin.post(f"/api/finance/{entry['id']}/settle", json=first_body)
    assert first.status_code == 200, first.text
    saved = first.json()
    assert saved['status'] == 'partial' and saved['remaining_cents'] == 7_000
    assert saved['payments'][0]['amount_cents'] == -3_000
    assert saved['payments'][0]['interest_cents'] == -125
    assert saved['payments'][0]['fine_cents'] == -75
    assert saved['payments'][0]['discount_cents'] == -200
    again = admin.post(f"/api/finance/{entry['id']}/settle", json=first_body)
    assert again.status_code == 200 and len(again.json()['payments']) == 1
    conflict = admin.post(f"/api/finance/{entry['id']}/settle", json={**first_body, 'fine_cents': 76})
    assert conflict.status_code == 409
    second = admin.post(f"/api/finance/{entry['id']}/settle", json={'method': 'pix', 'account_id': account_id, 'principal_cents': 7_000, 'request_key': 'payment-final-001'})
    assert second.status_code == 200 and second.json()['status'] == 'paid'
    payment_id = saved['payments'][0]['id']
    reversed_result = post(admin, f'/finance/payments/{payment_id}/reverse', {'reason': 'Pagamento lançado em duplicidade'}, 200)
    assert reversed_result['status'] == 'partial' and reversed_result['remaining_cents'] == 3_000
    reversal = next(row for row in reversed_result['payments'] if row['reversal_of'] == payment_id)
    assert reversal['reversal_reason'] == 'Pagamento lançado em duplicidade'
    post(admin, f'/finance/payments/{payment_id}/reverse', {'reason': 'Pagamento lançado em duplicidade'}, 200)
    final_reversal = post(admin, f"/finance/payments/{second.json()['payments'][-1]['id']}/reverse", {'reason': 'Baixa de teste cancelada'}, 200)
    assert final_reversal['status'] == 'open' and final_reversal['remaining_cents'] == 10_000
    with app.state.sessions() as db:
        assert len(list(db.scalars(select(Payment).where(Payment.entry_id == entry['id'])))) == 4


def test_finance_filter_summary_uses_full_result_and_seven_day_boundary(env):
    _, admin, _, _ = env
    late = title(admin, direction='income', amount=10_000, due=today() - timedelta(days=1), description='Resumo vencido')
    due_last_day = title(admin, direction='income', amount=20_000, due=today() + timedelta(days=7), description='Resumo em sete dias')
    after_window = title(admin, direction='expense', amount=30_000, due=today() + timedelta(days=8), description='Resumo fora de sete dias')
    partial = admin.post(f"/api/finance/{due_last_day['id']}/settle", json={
        'method': 'pix', 'account_id': due_last_day['account_id'], 'principal_cents': 5_000,
        'request_key': 'summary-boundary-partial-01',
    })
    assert partial.status_code == 200, partial.text

    filters = {
        'start': (today() - timedelta(days=1)).isoformat(),
        'end': (today() + timedelta(days=8)).isoformat(),
        'date_field': 'due', 'page_size': 1,
    }
    result = admin.get('/api/finance', params=filters).json()
    assert result['total'] == result['summary']['count'] == 3
    assert len(result['items']) == 1
    assert result['summary'] == {
        'pending_cents': 55_000,
        'overdue_cents': 10_000,
        'due_7_days_cents': 15_000,
        'count': 3,
    }

    due_filter = admin.get('/api/finance', params={**filters, 'q': 'Resumo em sete dias', 'search_field': 'description', 'status': 'partial'}).json()
    assert due_filter['total'] == 1
    assert due_filter['summary'] == {
        'pending_cents': 15_000,
        'overdue_cents': 0,
        'due_7_days_cents': 15_000,
        'count': 1,
    }
    assert due_filter['items'][0]['id'] == due_last_day['id']
    csv_response = admin.get('/api/reports/finance.csv', params={**filters, 'q': 'Resumo', 'search_field': 'description'})
    assert csv_response.status_code == 200
    assert 'Resumo vencido' in csv_response.text and 'Resumo fora de sete dias' in csv_response.text
    assert after_window['id'] != late['id']
    printed = admin.get('/api/finance/print', params={**filters, 'q': 'Resumo', 'search_field': 'description'})
    assert printed.status_code == 200
    assert '3 títulos' in printed.text and 'vence em 7 dias R$ 150,00' in printed.text
    assert all(name in printed.text for name in ('Resumo vencido', 'Resumo em sete dias', 'Resumo fora de sete dias'))


def test_attachments_are_private_validated_deduplicated_and_bounded(env):
    _, admin, operator, _ = env
    entry = title(admin)
    first = b'%PDF-1.4\ncomprovante 1'
    body = {'filename': 'nota.pdf', 'content_type': 'application/pdf', 'content_base64': base64.b64encode(first).decode()}
    saved = post(admin, f"/finance/{entry['id']}/attachments", body)
    repeated = post(admin, f"/finance/{entry['id']}/attachments", body)
    assert repeated['id'] == saved['id']
    assert 'content' not in saved
    download = admin.get(f"/api/finance/attachments/{saved['id']}")
    assert download.content == first and download.headers['cache-control'] == 'no-store'
    refreshed = admin.get(f"/api/finance?q={entry['description']}").json()['items'][0]
    assert refreshed['attachments'][0]['id'] == saved['id'] and refreshed['attachments'][0]['content'] is None
    for index in range(2, 4):
        content = f'%PDF-1.4\ncomprovante {index}'.encode()
        post(admin, f"/finance/{entry['id']}/attachments", {'filename': f'nota-{index}.pdf', 'content_type': 'application/pdf', 'content_base64': base64.b64encode(content).decode()})
    too_many = admin.post(f"/api/finance/{entry['id']}/attachments", json={'filename': 'quarta.pdf', 'content_type': 'application/pdf', 'content_base64': base64.b64encode(b'%PDF-1.4\nquarta').decode()})
    assert too_many.status_code == 409
    invalid = admin.post(f"/api/finance/{entry['id']}/attachments", json={'filename': 'nota.pdf', 'content_type': 'application/pdf', 'content_base64': base64.b64encode(b'nao e pdf').decode()})
    assert invalid.status_code == 422
    assert operator.get(f"/api/finance/attachments/{saved['id']}").status_code == 403


def test_ofx_preview_duplicates_matching_creation_and_manual_ignore(env):
    _, admin, _, _ = env
    bank = next(row for row in admin.get('/api/accounts').json() if row['kind'] == 'bank')
    debit = ofx('FITID-DEBIT-1', -10_000).encode()
    headers = {'Content-Type': 'application/x-ofx', 'X-Statement-Name': 'teste.ofx'}
    imported = admin.post(f"/api/finance/ofx/imports?account_id={bank['id']}", content=debit, headers=headers)
    assert imported.status_code == 201, imported.text
    statement = imported.json()
    assert statement['pending'] == 1 and statement['items'][0]['status'] == 'pending'
    duplicate = admin.post(f"/api/finance/ofx/imports?account_id={bank['id']}", content=debit, headers=headers).json()
    assert duplicate['duplicates'] == 1 and duplicate['items'][0]['status'] == 'duplicate'
    entry = title(admin, amount=10_000)
    suggestions = admin.get(f"/api/finance/ofx/imports/{statement['id']}/items/{statement['items'][0]['id']}/suggestions")
    assert suggestions.status_code == 200 and suggestions.json()[0]['entry']['id'] == entry['id']
    confirm_body = {'entry_id': entry['id'], 'principal_cents': 10_000}
    confirmed = admin.post(f"/api/finance/ofx/imports/{statement['id']}/items/{statement['items'][0]['id']}/confirm", json=confirm_body)
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()['status'] == 'complete' and confirmed.json()['items'][0]['status'] == 'matched'
    again = admin.post(f"/api/finance/ofx/imports/{statement['id']}/items/{statement['items'][0]['id']}/confirm", json=confirm_body)
    assert again.status_code == 200
    assert admin.post(f"/api/finance/ofx/imports/{duplicate['id']}/items/{duplicate['items'][0]['id']}/confirm", json=confirm_body).status_code == 409
    credit = ofx('FITID-CREDIT-2', 1_234, name='Recebimento avulso').encode()
    second = admin.post(f"/api/finance/ofx/imports?account_id={bank['id']}", content=credit, headers=headers).json()
    category = next(c for c in admin.get('/api/categories').json() if c['name'] == 'Outras receitas')
    subcategory = next(s for s in admin.get('/api/subcategories').json() if s['category_id'] == category['id'])
    created = admin.post(f"/api/finance/ofx/imports/{second['id']}/items/{second['items'][0]['id']}/confirm", json={'create_title': True, 'category_id': category['id'], 'subcategory_id': subcategory['id']})
    assert created.status_code == 200, created.text
    assert created.json()['items'][0]['status'] == 'posted'
    ignore_file = ofx('FITID-IGNORE-3', -345).encode()
    ignored_import = admin.post(f"/api/finance/ofx/imports?account_id={bank['id']}", content=ignore_file, headers=headers).json()
    ignored = admin.post(f"/api/finance/ofx/imports/{ignored_import['id']}/items/{ignored_import['items'][0]['id']}/confirm", json={'ignore': True, 'reason': 'Transação não pertence ao período'})
    assert ignored.status_code == 200 and ignored.json()['items'][0]['status'] == 'ignored'
    assert admin.post(f"/api/finance/ofx/imports/{ignored_import['id']}/items/{ignored_import['items'][0]['id']}/confirm", json={'ignore': True, 'reason': 'x'}).status_code == 422


def test_dashboard_all_reports_budgets_and_export(env):
    _, admin, operator, _ = env
    assert operator.get('/api/finance/dashboard').status_code == 403
    catalog = admin.get('/api/finance/reports/catalog').json()
    assert len(catalog) == 26
    income = title(admin, 'income', 12_345)
    expense = title(admin, 'expense', 2_500)
    paid_rows = []
    for row, key in ((income, 'income-payment-01'), (expense, 'expense-payment-01')):
        paid = admin.post(f"/api/finance/{row['id']}/settle", json={'method': 'pix', 'account_id': row['account_id'], 'request_key': key})
        assert paid.status_code == 200, paid.text
        paid_rows.append(paid.json()['payments'][0])
    today_text = today().isoformat()
    dash = admin.get(f'/api/finance/dashboard?start={today_text}&end={today_text}').json()
    assert dash['income_cents'] == 12_345 and dash['expense_cents'] == 2_500 and dash['net_cents'] == 9_845
    category = next(c for c in admin.get('/api/categories').json() if c['name'] == 'Despesas operacionais')
    subcategory = next(s for s in admin.get('/api/subcategories').json() if s['category_id'] == category['id'])
    budget = post(admin, '/finance/budgets', {'year': today().year, 'month': today().month, 'category_id': category['id'], 'subcategory_id': subcategory['id'], 'target_cents': 10_000, 'notes': 'Meta de teste'})
    assert budget['actual_cents'] == 2_500 and budget['remaining_cents'] == 7_500
    updated = post(admin, '/finance/budgets', {'year': today().year, 'month': today().month, 'category_id': category['id'], 'subcategory_id': subcategory['id'], 'target_cents': 12_000, 'notes': 'Meta revisada'})
    assert updated['id'] == budget['id'] and updated['actual_cents'] == 2_500
    report = admin.get(f'/api/finance/reports/expense-category?start={today_text}&end={today_text}')
    assert report.status_code == 200 and report.json()['total'] == 1
    assert report.json()['items'][0]['expense_cents'] == 2_500
    exported = admin.get(f'/api/finance/reports/expense-category.csv?start={today_text}&end={today_text}')
    assert exported.status_code == 200 and exported.content.startswith(b'\xef\xbb\xbf')
    assert 'Despesas operacionais' in exported.content.decode('utf-8-sig')
    for report_definition in catalog:
        report_url = f"/api/finance/reports/{report_definition['id']}?start={today_text}&end={today_text}"
        assert admin.get(report_url).status_code == 200, report_definition['id']
        csv_url = f"/api/finance/reports/{report_definition['id']}.csv?start={today_text}&end={today_text}"
        assert admin.get(csv_url).content.startswith(b'\xef\xbb\xbf'), report_definition['id']
    for payment in paid_rows:
        reversed_payment = admin.post(f"/api/finance/payments/{payment['id']}/reverse", json={'reason': 'Ajuste de teste'})
        assert reversed_payment.status_code == 200, reversed_payment.text
    income_after_reversal = admin.get(f'/api/finance/reports/income-category?start={today_text}&end={today_text}').json()['items']
    expense_after_reversal = admin.get(f'/api/finance/reports/expense-category?start={today_text}&end={today_text}').json()['items']
    assert sum(row['income_cents'] for row in income_after_reversal) == 0
    assert sum(row['expense_cents'] for row in expense_after_reversal) == 0
    dash_after_reversal = admin.get(f'/api/finance/dashboard?start={today_text}&end={today_text}').json()
    assert sum(row['income_cents'] for row in dash_after_reversal['result_groups']) == 0
    assert sum(row['expense_cents'] for row in dash_after_reversal['result_groups']) == 0
    assert admin.get(f"/api/finance/budgets?year={today().year}&month={today().month}").json()[0]['actual_cents'] == 0
    assert admin.delete(f"/api/finance/budgets/{budget['id']}").status_code == 200
    assert admin.get(f"/api/finance/budgets?year={today().year}&month={today().month}").json() == []
    assert admin.get('/api/finance/reports/not-a-report').status_code == 404


def test_backup_bundle_contains_restorable_database_and_attachment_manifest(env, tmp_path):
    _, admin, _, _ = env
    entry = title(admin)
    content = b'%PDF-1.4\nbackup-test'
    post(admin, f"/finance/{entry['id']}/attachments", {'filename': 'recibo.pdf', 'content_type': 'application/pdf', 'content_base64': base64.b64encode(content).decode()})
    output = tmp_path / 'gestao-completa.zip'
    backup_bundle(output)
    with zipfile.ZipFile(output) as archive:
        assert {'gestao.sqlite3', 'attachments-manifest.csv'} <= set(archive.namelist())
        manifest = next(csv.DictReader(io.StringIO(archive.read('attachments-manifest.csv').decode('utf-8-sig')), delimiter=';'))
        assert archive.read(manifest['arquivo_no_zip']) == content
        db_path = tmp_path / 'restored.sqlite3'
        db_path.write_bytes(archive.read('gestao.sqlite3'))
    with sqlite3.connect(db_path) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('SELECT COUNT(*) FROM attachments').fetchone()[0] == 1


def test_0003_migration_preserves_existing_payment_and_backfills_principal(tmp_path, monkeypatch):
    path = tmp_path / 'legacy.sqlite3'
    monkeypatch.setenv('GESTAO_DATABASE_URL', f'sqlite:///{path}')
    config = Config(str(ROOT / 'backend' / 'alembic.ini'))
    command.upgrade(config, '0003')
    engine = build_engine()
    with session_factory(engine)() as db:
        user = User(name='Legado', username='legacy', password_hash='hash', role='admin')
        db.add(user)
        default_records(db)
        db.flush()
        account = db.scalar(select(Account).where(Account.kind == 'bank'))
        category = db.scalar(select(Category).where(Category.name == 'Outras receitas'))
        db.commit()
    with sqlite3.connect(path) as raw:
        raw.execute('INSERT INTO finance_entries (description,direction,amount_cents,status,account_id,category_id,user_id,due_date,created_at) VALUES (?,?,?,?,?,?,?,?,?)', ('Título legado', 'income', 4_321, 'paid', account.id, category.id, user.id, '2026-01-01', '2026-01-01 12:00:00'))
        entry_id = raw.execute('SELECT last_insert_rowid()').fetchone()[0]
        raw.execute('INSERT INTO payments (entry_id,account_id,amount_cents,method,user_id,created_at,posting_date,competence_date) VALUES (?,?,?,?,?,?,?,?)', (entry_id, account.id, 4_321, 'pix', user.id, '2026-01-01 12:00:00', '2026-01-01', '2026-01-01'))
        raw.commit()
    command.upgrade(config, 'head')
    with session_factory(engine)() as db:
        payment = db.scalar(select(Payment).where(Payment.entry_id == entry_id))
        assert payment.amount_cents == payment.principal_cents == 4_321
        assert db.get(FinanceEntry, entry_id).description == 'Título legado'
    engine.dispose()
