from datetime import timedelta

from sqlalchemy import func, select

from app.models import Account, FinanceEntry, Payment, ServiceOrder, ServiceOrderCost, ServiceOrderTitleRun
from app.services import today


def create_partner(admin, name, kind, default_rate_cents=None):
    response = admin.post("/api/suppliers", json={
        "name": name, "kind": kind, "default_rate_cents": default_rate_cents,
    })
    assert response.status_code == 201, response.text
    return response.json()


def order_payload(customer_id, day_worker_id, freight_id):
    return {
        "customer_id": customer_id,
        "description": "Limpeza e manutenção do galpão",
        "service_date": today().isoformat(),
        "negotiated_cents": 100_000,
        "status": "scheduled",
        "notes": "Equipe e transporte acertados para a operação",
        "costs": [
            {"supplier_id": day_worker_id, "kind": "day_worker", "quantity_milli": 1500, "agreed_amount_cents": 25_000, "details": "Uma diária e meia"},
            {"supplier_id": freight_id, "kind": "subcontracted_freight", "quantity_milli": None, "agreed_amount_cents": 7_000, "details": "Transporte de materiais"},
        ],
    }


def test_service_order_costs_titles_actual_result_idempotency_and_cancel(env):
    app, admin, operator, anonymous = env
    customer_response = admin.post("/api/customers", json={"name": "Cliente do serviço", "city": "Manaus", "state": "AM"})
    assert customer_response.status_code == 201, customer_response.text
    customer = customer_response.json()
    worker = create_partner(admin, "Diarista do serviço", "day_worker", 15_000)
    freight = create_partner(admin, "Frete do serviço", "subcontracted_freight", 8_000)
    account = next(row for row in admin.get("/api/accounts").json() if row["kind"] == "bank")
    balance_before = account["balance_cents"]

    assert operator.get("/api/service-orders").status_code == 403
    assert anonymous.get("/api/service-orders").status_code == 401
    payload = order_payload(customer["id"], worker["id"], freight["id"])
    created = admin.post("/api/service-orders", json=payload)
    assert created.status_code == 201, created.text
    order = created.json()
    assert order["code"] == f"OS-{order['id']:06d}"
    assert order["customer_name"] == "Cliente do serviço"
    assert order["expected_cost_cents"] == 32_000
    assert order["expected_result_cents"] == 68_000
    assert order["actual_income_cents"] == order["actual_cost_cents"] == 0
    assert order["title_run_id"] is None and order["titles"] == []
    assert admin.get("/api/finance").json()["total"] == 0
    assert next(row for row in admin.get("/api/accounts").json() if row["id"] == account["id"])["balance_cents"] == balance_before

    wrong_kind = {**payload, "costs": [{**payload["costs"][0], "supplier_id": freight["id"]}]}
    assert admin.post("/api/service-orders", json=wrong_kind).status_code == 422
    worker_update = {"name": worker["name"], "kind": "day_worker", "default_rate_cents": worker["default_rate_cents"]}
    inactive = admin.put(f"/api/suppliers/{worker['id']}", json={**worker_update, "active": False})
    assert inactive.status_code == 200
    assert admin.post("/api/service-orders", json=payload).status_code == 409
    assert admin.put(f"/api/suppliers/{worker['id']}", json={**worker_update, "active": True}).status_code == 200

    due = (today() + timedelta(days=7)).isoformat()
    generated = admin.post(f"/api/service-orders/{order['id']}/generate-titles", json={
        "account_id": account["id"], "due_date": due, "competence_date": today().isoformat(),
    })
    assert generated.status_code == 200, generated.text
    generated_body = generated.json()
    assert generated_body["created"] is True
    order = generated_body["service_order"]
    assert order["title_run_id"]
    assert len(order["titles"]) == 3
    assert {title["direction"] for title in order["titles"]} == {"income", "expense"}
    payables = [title for title in order["titles"] if title["direction"] == "expense"]
    receivable = next(title for title in order["titles"] if title["direction"] == "income")
    assert {cost["finance_entry_id"] for cost in order["costs"]} == {title["id"] for title in payables}
    assert all(cost["finance_status"] == "open" for cost in order["costs"])
    assert all(title["status"] == "open" and title["remaining_cents"] == title["amount_cents"] for title in order["titles"])
    assert all(title["remaining_cents"] == title["amount_cents"] for title in order["titles"])
    repeated = admin.post(f"/api/service-orders/{order['id']}/generate-titles", json={
        "account_id": account["id"], "due_date": today().isoformat(), "competence_date": today().isoformat(),
    })
    assert repeated.status_code == 200 and repeated.json()["created"] is False
    assert len(repeated.json()["service_order"]["titles"]) == 3
    assert next(row for row in admin.get("/api/accounts").json() if row["id"] == account["id"])["balance_cents"] == balance_before

    financial_titles = {row["id"]: row for row in admin.get(f"/api/finance?direction=expense&supplier_kind=day_worker").json()["items"]}
    worker_cost = next(cost for cost in order["costs"] if cost["kind"] == "day_worker")
    assert worker_cost["finance_entry_id"] in financial_titles
    assert financial_titles[worker_cost["finance_entry_id"]]["service_order_code"] == order["code"]

    paid_receipt = admin.post(f"/api/finance/{receivable['id']}/settle", json={
        "method": "pix", "account_id": account["id"], "principal_cents": 40_000,
        "request_key": "service-order-receipt-01",
    })
    assert paid_receipt.status_code == 200, paid_receipt.text
    paid_cost = admin.post(f"/api/finance/{worker_cost['finance_entry_id']}/settle", json={
        "method": "pix", "account_id": account["id"],
    })
    assert paid_cost.status_code == 200, paid_cost.text
    order = admin.get(f"/api/service-orders/{order['id']}").json()
    assert order["actual_income_cents"] == 40_000
    assert order["actual_cost_cents"] == 25_000
    assert order["actual_result_cents"] == 15_000
    assert order["expected_result_cents"] == 68_000

    changed_contract = {**payload, "negotiated_cents": 120_000}
    assert admin.put(f"/api/service-orders/{order['id']}", json=changed_contract).status_code == 409
    allowed_edit = {**payload, "description": "Manutenção com descrição revisada", "status": "in_progress"}
    updated = admin.put(f"/api/service-orders/{order['id']}", json=allowed_edit)
    assert updated.status_code == 200, updated.text
    assert updated.json()["negotiated_cents"] == 100_000 and updated.json()["expected_cost_cents"] == 32_000

    canceled = admin.post(f"/api/service-orders/{order['id']}/cancel", json={"reason": "Cliente cancelou a operação"})
    assert canceled.status_code == 200, canceled.text
    canceled_order = canceled.json()
    assert canceled_order["status"] == "canceled"
    assert all(title["status"] == "canceled" for title in canceled_order["titles"])
    assert canceled_order["actual_income_cents"] == 0
    assert canceled_order["actual_cost_cents"] == 0
    assert canceled_order["actual_result_cents"] == 0
    again = admin.post(f"/api/service-orders/{order['id']}/cancel", json={"reason": "Cliente cancelou a operação"})
    assert again.status_code == 200

    with app.state.sessions() as db:
        assert db.scalar(select(func.count(ServiceOrderTitleRun.id)).where(ServiceOrderTitleRun.service_order_id == order["id"])) == 1
        assert db.scalar(select(func.count(FinanceEntry.id)).where(FinanceEntry.service_order_id == order["id"])) == 3
        assert db.scalar(select(func.count(ServiceOrderCost.id)).where(ServiceOrderCost.service_order_id == order["id"])) == 2
        assert db.scalar(select(func.count(Payment.id)).join(FinanceEntry).where(FinanceEntry.service_order_id == order["id"])) == 4
        assert db.get(ServiceOrder, order["id"]).cancel_reason == "Cliente cancelou a operação"

