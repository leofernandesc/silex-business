import csv
import hashlib
import io
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.api import create_app
from app.cli import backup
from app.db import build_engine
from app.models import CashSession, FinanceEntry, Payment, Product, Sale, Session, StockMovement, User
from app.services import line_total, today


def post(client, path, body, status=201):
    response = client.post("/api" + path, json=body)
    assert response.status_code == status, response.text
    return response.json()


def product(client, stock=10000, kind="product", code="ITEM-1", price=1234):
    row = post(client, "/products", {"code": code, "description": code, "kind": kind, "price_cents": price})
    if stock and kind == "product":
        post(client, "/stock-movements", {"product_id": row["id"], "quantity_milli": stock, "kind": "opening", "reason": "Saldo teste"})
    return row


def draft(client, items, **kwargs):
    return post(client, "/sales", {"items": [{"product_id": p["id"], "quantity_milli": qty, "unit_price_cents": p["price_cents"]} for p, qty in items], **kwargs})


def cash(client, opening=10000):
    return post(client, "/cash-sessions", {"opening_cents": opening})


def finalize(client, sale, method="cash", **kwargs):
    return post(client, f"/sales/{sale['id']}/finalize", {"method": method, **kwargs}, 200)


def accounts(client):
    return client.get("/api/accounts").json()


def manual(client, direction="income", value=1000, due=None):
    account = next(a for a in accounts(client) if a["kind"] == "bank")
    category = client.get("/api/categories").json()[0]
    return post(client, "/finance", {"description": "Conta de teste", "direction": direction, "amount_cents": value, "account_id": account["id"], "category_id": category["id"], "due_date": (due or today()).isoformat()})


def test_auth_cookie_sessions_and_logout(env):
    app, admin, _, anonymous = env
    assert anonymous.get("/api/products").status_code == 401
    response = anonymous.post("/api/auth/login", json={"username": "ADMIN", "password": "TestPassword#2026"})
    assert response.status_code == 200
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=strict" in response.headers["set-cookie"].lower()
    assert "password_hash" not in response.json()
    token = anonymous.cookies["gestao_session"]
    with app.state.sessions() as db:
        assert db.get(Session, hashlib.sha256(token.encode()).hexdigest())
    assert anonymous.get("/api/auth/me").status_code == 200
    assert anonymous.post("/api/auth/logout").status_code == 200
    assert anonymous.get("/api/auth/me").status_code == 401


def test_login_throttling_and_no_secret_in_validation(env):
    _, _, _, client = env
    for _ in range(8):
        assert client.post("/api/auth/login", json={"username": "unknown", "password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "unknown", "password": "wrong"}).status_code == 429
    response = client.post("/api/auth/login", json={"username": "admin", "password": "should-not-echo", "extra": "secret"})
    assert response.status_code == 422
    assert "should-not-echo" not in response.text and "secret" not in response.text


def test_permissions_backend_and_own_records(env):
    _, admin, operator, _ = env
    p = product(admin)
    for path in ("/users", "/accounts", "/categories", "/finance", "/stock-movements", "/audit", "/reports/finance.csv"):
        assert operator.get("/api" + path).status_code == 403
    post(operator, "/products", {"code": "x", "description": "x", "price_cents": 100}, 403)
    c = post(operator, "/customers", {"name": "Cliente"})
    assert c["name"] == "Cliente"
    sale = draft(admin, [(p, 1000)])
    assert operator.get(f"/api/sales/{sale['id']}").status_code == 403
    assert operator.get("/api/sales").json()["total"] == 0
    register = cash(admin)
    post(operator, f"/cash-sessions/{register['id']}/close", {"counted_cents": 10000}, 403)


def test_origin_boundary(env):
    _, admin, _, _ = env
    assert admin.post("/api/customers", json={"name": "X"}, headers={"Origin": "https://attacker.test"}).status_code == 403
    assert admin.post("/api/customers", json={"name": "X"}, headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403


def test_customer_document_uniqueness_pagination_and_deactivation(env):
    _, admin, _, _ = env
    c = post(admin, "/customers", {"name": "Ana", "document": "123.456.789-00"})
    assert c["document"] == "12345678900"
    post(admin, "/customers", {"name": "Dup", "document": "12345678900"}, 409)
    post(admin, "/customers", {"name": "Beta"})
    assert admin.get("/api/customers?page_size=1").json()["total"] == 2
    assert len(admin.get("/api/customers?page_size=1&page=2").json()["items"]) == 1
    response = admin.put(f"/api/customers/{c['id']}", json={"name": "Ana", "active": False})
    assert response.status_code == 200
    assert admin.get("/api/customers?active=true&q=Ana").json()["total"] == 0


def test_product_uniqueness_history_and_price_snapshot(env):
    _, admin, _, _ = env
    p = product(admin)
    post(admin, "/products", {"code": p["code"], "description": "Duplicate", "price_cents": 1}, 409)
    s = draft(admin, [(p, 1000)])
    response = admin.put(f"/api/products/{p['id']}", json={"code": p["code"], "description": "Nome atualizado", "price_cents": 9999})
    assert response.status_code == 200
    saved = admin.get(f"/api/sales/{s['id']}").json()
    assert saved["items"][0]["unit_price_cents"] == p["price_cents"]
    assert saved["items"][0]["description"] == p["description"]
    assert admin.put(f"/api/products/{p['id']}", json={"code": p["code"], "description": "x", "kind": "service", "price_cents": 9999}).status_code == 409


def test_stock_ledger_inventory_and_insufficient_balance(env):
    app, admin, _, _ = env
    p = product(admin, stock=1250)
    post(admin, "/stock-movements", {"product_id": p["id"], "quantity_milli": 1000, "kind": "out", "reason": "Retirada teste"})
    post(admin, "/stock-movements", {"product_id": p["id"], "quantity_milli": 251, "kind": "out", "reason": "Retirada teste"}, 409)
    post(admin, "/stock-movements", {"product_id": p["id"], "quantity_milli": 375, "kind": "inventory", "reason": "Contagem física"})
    post(admin, "/stock-movements", {"product_id": p["id"], "quantity_milli": 10, "kind": "opening", "reason": "Inicial repetido"}, 409)
    with app.state.sessions() as db:
        assert db.get(Product, p["id"]).stock_milli == 375
        assert db.scalar(select(func.sum(StockMovement.quantity_milli)).where(StockMovement.product_id == p["id"])) == 375


def test_service_never_moves_stock(env):
    app, admin, _, _ = env
    p = product(admin, kind="service")
    post(admin, "/stock-movements", {"product_id": p["id"], "quantity_milli": 1000, "kind": "in", "reason": "Teste serviço"}, 409)
    cash(admin)
    finalize(admin, draft(admin, [(p, 1000)]))
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(StockMovement.id))) == 0


def test_sale_requires_cash_and_customer_for_credit(env):
    _, admin, _, _ = env
    p = product(admin)
    sale = draft(admin, [(p, 1000)])
    post(admin, f"/sales/{sale['id']}/finalize", {"method": "pix"}, 409)
    cash(admin)
    post(admin, f"/sales/{sale['id']}/finalize", {"method": "credit", "due_date": today().isoformat()}, 422)
    customer = post(admin, "/customers", {"name": "Cliente a prazo"})
    credit = draft(admin, [(p, 1000)], customer_id=customer["id"])
    post(admin, f"/sales/{credit['id']}/finalize", {"method": "credit"}, 422)
    post(admin, f"/sales/{credit['id']}/finalize", {"method": "credit", "due_date": (today()-timedelta(days=1)).isoformat()}, 422)


@pytest.mark.parametrize("method", ["cash", "pix", "card", "credit"])
def test_finalize_atomic_and_idempotent(env, method):
    app, admin, _, _ = env
    p = product(admin)
    register = cash(admin)
    customer = post(admin, "/customers", {"name": "Cliente"})
    sale = draft(admin, [(p, 1500)], customer_id=customer["id"], discount_cents=1)
    first = finalize(admin, sale, method, due_date=today().isoformat() if method == "credit" else None)
    second = finalize(admin, sale, method, due_date=today().isoformat() if method == "credit" else None)
    assert first == second
    assert first["total_cents"] == 1850
    with app.state.sessions() as db:
        assert db.get(Product, p["id"]).stock_milli == 8500
        assert db.scalar(select(func.count(FinanceEntry.id))) == 1
        assert db.scalar(select(func.count(Payment.id))) == (0 if method == "credit" else 1)
    current = admin.get("/api/cash-sessions/current").json()
    assert current["expected_cents"] == register["opening_cents"] + (1850 if method == "cash" else 0)


def test_insufficient_stock_rolls_back_all_items_and_finance(env):
    app, admin, _, _ = env
    a, b = product(admin, stock=2000), product(admin, stock=0, code="SECOND")
    cash(admin)
    sale = draft(admin, [(a, 1000), (b, 1000)])
    post(admin, f"/sales/{sale['id']}/finalize", {"method": "cash"}, 409)
    with app.state.sessions() as db:
        assert db.get(Product, a["id"]).stock_milli == 2000
        assert db.get(Sale, sale["id"]).status == "draft"
        assert db.scalar(select(func.count(FinanceEntry.id))) == 0
        assert db.scalar(select(func.count(Payment.id))) == 0
        assert db.scalar(select(func.count(StockMovement.id)).where(StockMovement.sale_id == sale["id"])) == 0


def test_concurrent_sales_do_not_oversell(env):
    app, admin, _, _ = env
    p = product(admin, stock=1000)
    cash(admin)
    a, b = draft(admin, [(p, 1000)]), draft(admin, [(p, 1000)])
    cookies = dict(admin.cookies)
    def run(sale):
        with TestClient(app) as client:
            client.cookies.update(cookies)
            return client.post(f"/api/sales/{sale['id']}/finalize", json={"method": "cash"}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(run, [a, b])) == [200, 409]
    with app.state.sessions() as db:
        assert db.get(Product, p["id"]).stock_milli == 0
        assert db.scalar(select(func.count(FinanceEntry.id))) == 1


def test_concurrent_finalize_same_sale_single_payment(env):
    app, admin, _, _ = env
    p = product(admin)
    cash(admin)
    sale = draft(admin, [(p, 1000)])
    cookies = dict(admin.cookies)
    def run(_):
        with TestClient(app) as client:
            client.cookies.update(cookies)
            return client.post(f"/api/sales/{sale['id']}/finalize", json={"method": "pix"}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(run, range(2))) == [200, 200]
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(Payment.id))) == 1
        assert db.get(Product, p["id"]).stock_milli == 9000


def test_cancel_creates_reversals_once_and_restores_stock(env):
    app, admin, _, _ = env
    p = product(admin)
    register = cash(admin)
    sale = finalize(admin, draft(admin, [(p, 1000)]))
    for _ in range(2):
        post(admin, f"/sales/{sale['id']}/cancel", {"reason": "Cliente desistiu"}, 200)
    with app.state.sessions() as db:
        assert db.get(Product, p["id"]).stock_milli == 10000
        assert db.scalar(select(func.count(Payment.id))) == 2
        assert db.scalar(select(func.sum(Payment.amount_cents))) == 0
        assert db.scalar(select(FinanceEntry)).status == "canceled"
    assert admin.get("/api/cash-sessions/current").json()["expected_cents"] == register["opening_cents"]


def test_operator_cannot_cancel_finalized_sale(env):
    _, admin, operator, _ = env
    p = product(admin)
    cash(operator)
    sale = finalize(operator, draft(operator, [(p, 1000)]))
    post(operator, f"/sales/{sale['id']}/cancel", {"reason": "Teste cancelamento"}, 403)
    post(admin, f"/sales/{sale['id']}/cancel", {"reason": "Teste cancelamento"}, 200)


def test_closed_cash_blocks_sale_cancel_and_preserves_discrepancy(env):
    _, admin, _, _ = env
    p = product(admin)
    register = cash(admin)
    sale = finalize(admin, draft(admin, [(p, 1000)]))
    closed = post(admin, f"/cash-sessions/{register['id']}/close", {"counted_cents": 10000}, 200)
    assert closed["expected_cents"] == 11234 and closed["difference_cents"] == -1234
    assert admin.get("/api/cash-sessions/current").json() is None
    post(admin, f"/sales/{sale['id']}/cancel", {"reason": "Teste fechado"}, 409)
    repeat = post(admin, f"/cash-sessions/{register['id']}/close", {"counted_cents": 1}, 200)
    assert repeat["counted_cents"] == 10000


def test_one_active_cash_and_opening_not_revenue(env):
    _, admin, _, _ = env
    cash(admin, 99000)
    post(admin, "/cash-sessions", {"opening_cents": 0}, 409)
    assert admin.get("/api/dashboard").json()["sales_today_cents"] == 0
    assert sum(a["balance_cents"] for a in accounts(admin)) == 0


def test_credit_settlement_once_full_amount(env):
    app, admin, _, _ = env
    p = product(admin)
    cash(admin)
    customer = post(admin, "/customers", {"name": "Cliente"})
    sale = finalize(admin, draft(admin, [(p, 1000)], customer_id=customer["id"]), "credit", due_date=today().isoformat())
    entry = admin.get("/api/finance").json()["items"][0]
    account = next(a for a in accounts(admin) if a["kind"] == "bank")
    assert entry["status"] == "open" and sale["finance_status"] == "open"
    for _ in range(2):
        paid = post(admin, f"/finance/{entry['id']}/settle", {"method": "pix", "account_id": account["id"]}, 200)
        assert paid["status"] == "paid"
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(Payment.id))) == 1
        assert db.scalar(select(Payment)).amount_cents == sale["total_cents"]


def test_manual_cash_income_expense_and_reversal(env):
    _, admin, _, _ = env
    cash(admin, opening=10000)
    a = next(a for a in accounts(admin) if a["kind"] == "cash")
    income, expense = manual(admin, value=1000), manual(admin, direction="expense", value=300)
    for entry in (income, expense):
        post(admin, f"/finance/{entry['id']}/settle", {"method": "cash", "account_id": a["id"]}, 200)
    assert admin.get("/api/cash-sessions/current").json()["expected_cents"] == 10700
    post(admin, f"/finance/{expense['id']}/cancel", {"reason": "Pagamento errado"}, 200)
    assert admin.get("/api/cash-sessions/current").json()["expected_cents"] == 11000


def test_finance_rejects_partial_and_wrong_account_and_cash_without_session(env):
    _, admin, _, _ = env
    entry = manual(admin)
    bank = next(a for a in accounts(admin) if a["kind"] == "bank")
    cash_account = next(a for a in accounts(admin) if a["kind"] == "cash")
    post(admin, f"/finance/{entry['id']}/settle", {"method": "pix", "account_id": bank["id"], "amount_cents": 100}, 422)
    post(admin, f"/finance/{entry['id']}/settle", {"method": "cash", "account_id": bank["id"]}, 422)
    post(admin, f"/finance/{entry['id']}/settle", {"method": "cash", "account_id": cash_account["id"]}, 409)


def test_overdue_filters_and_dashboard_derived(env):
    _, admin, _, _ = env
    late = manual(admin, value=1500, due=today()-timedelta(days=1))
    manual(admin, direction="expense", value=500)
    assert admin.get("/api/finance?status=overdue").json()["items"][0]["id"] == late["id"]
    dashboard = admin.get("/api/dashboard").json()
    assert dashboard["overdue_cents"] == 1500 and dashboard["receivable_cents"] == 1500 and dashboard["payable_cents"] == 500
    assert admin.get("/api/finance?start=2026-01-02&end=2026-01-01").status_code == 422


def test_csv_respects_filters_and_neutralizes_formula(env):
    _, admin, _, _ = env
    post(admin, "/customers", {"name": "=HYPERLINK(test)"})
    post(admin, "/customers", {"name": "Outro"})
    response = admin.get("/api/reports/customers.csv?q=HYPERLINK")
    rows = list(csv.reader(io.StringIO(response.text.lstrip("\ufeff")), delimiter=";"))
    assert len(rows) == 2 and rows[1][1].startswith("'=HYPERLINK")
    assert "Outro" not in response.text


def test_integer_precision_rounding_and_reject_floats(env):
    _, admin, _, _ = env
    assert line_total(101, 500) == 51
    assert line_total(10, 333) == 3
    post(admin, "/products", {"code": "FLOAT", "description": "x", "price_cents": 1.1}, 422)
    p = product(admin, price=101)
    sale = draft(admin, [(p, 500)])
    assert sale["total_cents"] == 51
    post(admin, "/sales", {"items": [{"product_id": p["id"], "quantity_milli": 1_000_000_000, "unit_price_cents": 100_000_000_000}]}, 422)


def test_disabled_user_session_revoked(env):
    _, admin, operator, _ = env
    users = admin.get("/api/users").json()
    op = next(u for u in users if u["role"] == "operator")
    post(admin, f"/users/{op['id']}/toggle", {}, 200)
    assert operator.get("/api/auth/me").status_code == 401
    own = next(u for u in users if u["role"] == "admin")
    post(admin, f"/users/{own['id']}/toggle", {}, 409)


def test_session_expires(env):
    app, admin, _, _ = env
    from app.models import now
    with app.state.sessions() as db:
        for session in db.scalars(select(Session)):
            session.expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert admin.get("/api/auth/me").status_code == 401


def test_persistence_across_app_restart_and_backup_restore(env, tmp_path):
    app, admin, _, _ = env
    p = product(admin)
    path = tmp_path / "backup.sqlite3"
    backup(path)
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert db.execute("SELECT stock_milli FROM products WHERE id=?", (p["id"],)).fetchone()[0] == 10000
    restored = build_engine(f"sqlite:///{path}")
    other = create_app(restored, serve_frontend=False)
    with TestClient(other) as client:
        client.cookies.update(dict(admin.cookies))
        assert client.get("/api/products").json()["items"][0]["stock_milli"] == 10000
    restored.dispose()
    with pytest.raises(SystemExit):
        backup(path)


def test_negative_cash_expense_rolls_back(env):
    app, admin, _, _ = env
    cash(admin, opening=500)
    expense = manual(admin, direction="expense", value=501)
    account = next(a for a in accounts(admin) if a["kind"] == "cash")
    post(admin, f"/finance/{expense['id']}/settle", {"method": "cash", "account_id": account["id"]}, 409)
    with app.state.sessions() as db:
        assert db.get(FinanceEntry, expense["id"]).status == "open"
        assert db.scalar(select(func.count(Payment.id))) == 0


def test_closed_receipt_cash_blocks_credit_sale_reversal(env):
    app, admin, _, _ = env
    p = product(admin)
    original = cash(admin)
    customer = post(admin, "/customers", {"name": "Cliente teste"})
    sale = finalize(admin, draft(admin, [(p, 1000)], customer_id=customer["id"]), "credit", due_date=today().isoformat())
    entry = admin.get("/api/finance").json()["items"][0]
    account = next(a for a in accounts(admin) if a["kind"] == "cash")
    post(admin, f"/finance/{entry['id']}/settle", {"method": "cash", "account_id": account["id"]}, 200)
    post(admin, f"/cash-sessions/{original['id']}/close", {"counted_cents": 11234}, 200)
    post(admin, f"/sales/{sale['id']}/cancel", {"reason": "Teste após fechamento"}, 409)
    with app.state.sessions() as db:
        assert db.get(Product, p["id"]).stock_milli == 9000
        assert db.get(FinanceEntry, entry["id"]).status == "paid"


def test_user_password_spaces_preserved_and_no_hash_output(env):
    _, admin, _, anonymous = env
    user = post(admin, "/users", {"name": "Operador Espaços", "username": "spaced", "password": " TestPassword123 ", "role": "operator"})
    assert "password_hash" not in user
    assert anonymous.post("/api/auth/login", json={"username": "spaced", "password": "TestPassword123"}).status_code == 401
    assert anonymous.post("/api/auth/login", json={"username": "spaced", "password": " TestPassword123 "}).status_code == 200


def test_manual_cancel_preserves_full_reason(env):
    _, admin, _, _ = env
    entry = manual(admin)
    reason = "Motivo completo " * 10
    canceled = post(admin, f"/finance/{entry['id']}/cancel", {"reason": reason}, 200)
    assert canceled["cancel_reason"] == reason.strip()


def test_receipt_date_filters_in_manaus(env):
    app, admin, _, _ = env
    from datetime import datetime
    p = product(admin)
    sale = draft(admin, [(p, 1000)])
    with app.state.sessions() as db:
        db.get(Sale, sale["id"]).created_at = datetime(2026, 10, 12, 3, 59, 59)  # Ainda 11/10 em Manaus.
        db.commit()
    assert admin.get("/api/sales?start=2026-10-11&end=2026-10-11").json()["total"] == 1
    assert admin.get("/api/sales?start=2026-10-12&end=2026-10-12").json()["total"] == 0


def test_large_identifier_fails_cleanly(env):
    _, admin, _, _ = env
    assert admin.get("/api/sales/99999999999999999999999999999").status_code == 404
    assert admin.get("/api/sales?q=99999999999999999999999999999").json()["total"] == 0
