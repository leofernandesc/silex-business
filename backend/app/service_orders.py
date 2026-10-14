"""Serviços/pedidos, custos contratados e títulos financeiros associados."""
from uuid import uuid4

from fastapi import Depends, Query
from sqlalchemy import func, or_, select

from . import financial as F, schemas as S, services as V
from .models import (
    Account, Category, Customer, FinanceEntry, Payment, ServiceOrder,
    ServiceOrderCost, ServiceOrderTitleRun, Subcategory, Supplier,
)


def order_data(db, order):
    customer = V.get(db, Customer, order.customer_id)
    costs = []
    for cost in db.scalars(select(ServiceOrderCost).where(ServiceOrderCost.service_order_id == order.id).order_by(ServiceOrderCost.id)):
        supplier = V.get(db, Supplier, cost.supplier_id)
        entry = db.scalar(select(FinanceEntry).where(FinanceEntry.service_order_cost_id == cost.id))
        costs.append({
            **V.data(cost), "supplier_name": supplier.name,
            "finance_entry_id": entry.id if entry else None,
            "finance_status": entry.status if entry else None,
        })
    expected_cost = sum(cost["agreed_amount_cents"] for cost in costs)
    actual_by_direction = db.execute(
        select(FinanceEntry.direction, func.coalesce(func.sum(Payment.amount_cents), 0))
        .join(Payment, Payment.entry_id == FinanceEntry.id)
        .where(FinanceEntry.service_order_id == order.id)
        .group_by(FinanceEntry.direction)
    ).all()
    amounts = {direction: int(total or 0) for direction, total in actual_by_direction}
    actual_income = amounts.get("income", 0)
    actual_cost = -amounts.get("expense", 0)
    titles = []
    for entry in db.scalars(select(FinanceEntry).where(FinanceEntry.service_order_id == order.id).order_by(FinanceEntry.id)):
        paid = V.principal_paid(db, entry)
        titles.append({
            "id": entry.id, "description": entry.description, "direction": entry.direction,
            "amount_cents": entry.amount_cents, "status": entry.status,
            "remaining_cents": max(0, entry.amount_cents - paid),
        })
    run = db.scalar(select(ServiceOrderTitleRun).where(ServiceOrderTitleRun.service_order_id == order.id))
    return {
        **V.data(order), "customer_name": customer.name,
        "expected_cost_cents": expected_cost,
        "expected_result_cents": order.negotiated_cents - expected_cost,
        "actual_income_cents": actual_income,
        "actual_cost_cents": actual_cost,
        "actual_result_cents": actual_income - actual_cost,
        "title_run_id": run.id if run else None,
        "title_due_date": run.due_date.isoformat() if run else None,
        "title_competence_date": run.competence_date.isoformat() if run else None,
        "costs": costs, "titles": titles,
    }


def register(app, get_db, admin):
    DB = Depends(get_db, scope="function")
    ADMIN = Depends(admin)

    def validate_costs(db, costs):
        for cost in costs:
            supplier = V.get(db, Supplier, cost.supplier_id)
            if not supplier.active:
                V.fail("Prestador inativo não pode ser associado a novo serviço")
            if supplier.kind != cost.kind:
                V.fail("O tipo do prestador não corresponde ao custo informado", 422)

    def replace_costs(db, order, costs):
        for row in list(db.scalars(select(ServiceOrderCost).where(ServiceOrderCost.service_order_id == order.id))):
            db.delete(row)
        for cost in costs:
            db.add(ServiceOrderCost(service_order_id=order.id, **cost.model_dump()))
        db.flush()

    @app.get("/api/service-orders")
    def list_service_orders(q: str = "", status: str | None = None, page: int = Query(1, ge=1, le=1_000_000), page_size: int = Query(20, ge=1, le=100), db=DB, user=ADMIN):
        query = select(ServiceOrder).order_by(ServiceOrder.service_date.desc(), ServiceOrder.id.desc())
        if q:
            query = query.where(or_(ServiceOrder.code.contains(q, autoescape=True), ServiceOrder.description.contains(q, autoescape=True), ServiceOrder.customer_id.in_(select(Customer.id).where(Customer.name.contains(q, autoescape=True)))))
        if status:
            if status not in ("draft", "scheduled", "in_progress", "completed", "canceled"):
                V.fail("Situação de serviço inválida", 422)
            query = query.where(ServiceOrder.status == status)
        return V.page(db, query, page, page_size, lambda row: order_data(db, row))

    @app.post("/api/service-orders", status_code=201)
    def create_service_order(payload: S.ServiceOrderInput, db=DB, user=ADMIN):
        customer = F.require_active(db, Customer, payload.customer_id)
        validate_costs(db, payload.costs)
        order = ServiceOrder(
            code="PENDING-" + uuid4().hex,
            customer_id=customer.id,
            description=payload.description,
            service_date=payload.service_date,
            negotiated_cents=payload.negotiated_cents,
            status=payload.status,
            notes=payload.notes,
            user_id=user.id,
        )
        db.add(order)
        db.flush()
        order.code = f"OS-{order.id:06d}"
        replace_costs(db, order, payload.costs)
        V.audit(db, user, "create", "service_order", order.id)
        db.flush()
        return order_data(db, order)

    @app.get("/api/service-orders/{identifier}")
    def get_service_order(identifier: int, db=DB, user=ADMIN):
        return order_data(db, V.get(db, ServiceOrder, identifier))

    @app.put("/api/service-orders/{identifier}")
    def update_service_order(identifier: int, payload: S.ServiceOrderInput, db=DB, user=ADMIN):
        order = V.get(db, ServiceOrder, identifier)
        if order.status == "canceled":
            V.fail("Serviço cancelado não pode ser editado")
        customer = F.require_active(db, Customer, payload.customer_id)
        validate_costs(db, payload.costs)
        existing_costs = list(db.scalars(select(ServiceOrderCost).where(ServiceOrderCost.service_order_id == order.id).order_by(ServiceOrderCost.id)))
        contract_changed = (
            customer.id != order.customer_id
            or payload.negotiated_cents != order.negotiated_cents
            or [(x.kind, x.supplier_id, x.quantity_milli, x.agreed_amount_cents, x.details) for x in existing_costs]
            != [(x.kind, x.supplier_id, x.quantity_milli, x.agreed_amount_cents, x.details) for x in payload.costs]
        )
        has_run = db.scalar(select(ServiceOrderTitleRun.id).where(ServiceOrderTitleRun.service_order_id == order.id))
        if has_run and contract_changed:
            V.fail("Os títulos já foram gerados; valor, cliente e custos contratados ficam preservados", 409)
        order.customer_id = customer.id
        order.description = payload.description
        order.service_date = payload.service_date
        order.negotiated_cents = payload.negotiated_cents
        order.status = payload.status
        order.notes = payload.notes
        order.updated_at = V.now()
        if not has_run:
            replace_costs(db, order, payload.costs)
        V.audit(db, user, "update", "service_order", order.id)
        db.flush()
        return order_data(db, order)

    @app.post("/api/service-orders/{identifier}/generate-titles")
    def generate_service_order_titles(identifier: int, payload: S.ServiceOrderTitleGenerationInput, db=DB, user=ADMIN):
        order = V.get(db, ServiceOrder, identifier)
        if order.status == "canceled":
            V.fail("Serviço cancelado não pode gerar títulos")
        existing_run = db.scalar(select(ServiceOrderTitleRun).where(ServiceOrderTitleRun.service_order_id == order.id))
        if existing_run:
            return {"created": False, "service_order": order_data(db, order)}
        account = F.require_active(db, Account, payload.account_id)
        preferred_income = db.scalar(select(Category).where(Category.name == "Vendas", Category.active, Category.direction.in_(["income", "both"])))
        preferred_expense = db.scalar(select(Category).where(Category.name == "Despesas operacionais", Category.active, Category.direction.in_(["expense", "both"])))
        if preferred_income is None:
            preferred_income = db.scalar(select(Category).where(Category.active, Category.direction.in_(["income", "both"])).order_by(Category.id))
        if preferred_expense is None:
            preferred_expense = db.scalar(select(Category).where(Category.active, Category.direction.in_(["expense", "both"])).order_by(Category.id))
        if preferred_income is None or preferred_expense is None:
            V.fail("Cadastre categorias ativas para receitas e despesas")
        income_subcategory = V.category_subcategory(db, preferred_income, "income")
        expense_subcategory = V.category_subcategory(db, preferred_expense, "expense")
        customer = V.get(db, Customer, order.customer_id)
        if not customer.active:
            V.fail("Cliente inativo não pode receber novo título")
        costs = list(db.scalars(select(ServiceOrderCost).where(ServiceOrderCost.service_order_id == order.id).order_by(ServiceOrderCost.id)))
        suppliers = {}
        for cost in costs:
            supplier = V.get(db, Supplier, cost.supplier_id)
            if not supplier.active or supplier.kind != cost.kind:
                V.fail("Revise os prestadores associados antes de gerar os títulos")
            suppliers[cost.supplier_id] = supplier
        run = ServiceOrderTitleRun(service_order_id=order.id, due_date=payload.due_date, competence_date=payload.competence_date, user_id=user.id)
        db.add(run)
        db.flush()
        income = FinanceEntry(
            description=f"{order.code} · {order.description}"[:180], direction="income",
            amount_cents=order.negotiated_cents, account_id=account.id,
            category_id=preferred_income.id, subcategory_id=income_subcategory.id,
            customer_id=customer.id, service_order_id=order.id, user_id=user.id,
            due_date=payload.due_date, competence_date=payload.competence_date,
            document=order.code, origin="service_order",
        )
        db.add(income)
        db.flush()
        V.audit(db, user, "create", "finance", income.id)
        for cost in costs:
            supplier = suppliers[cost.supplier_id]
            line = cost.details or ("Diárias" if cost.kind == "day_worker" else "Frete subcontratado")
            expense = FinanceEntry(
                description=f"{order.code} · {line} · {supplier.name}"[:180], direction="expense",
                amount_cents=cost.agreed_amount_cents, account_id=account.id,
                category_id=preferred_expense.id, subcategory_id=expense_subcategory.id,
                supplier_id=supplier.id, service_order_id=order.id, service_order_cost_id=cost.id,
                user_id=user.id, due_date=payload.due_date,
                competence_date=payload.competence_date, document=order.code,
                origin="service_order",
            )
            db.add(expense)
            db.flush()
            V.audit(db, user, "create", "finance", expense.id)
        V.audit(db, user, "generate_titles", "service_order", order.id)
        db.flush()
        return {"created": True, "service_order": order_data(db, order)}

    @app.post("/api/service-orders/{identifier}/cancel")
    def cancel_service_order(identifier: int, payload: S.ServiceOrderCancellationInput, db=DB, user=ADMIN):
        order = V.get(db, ServiceOrder, identifier)
        if order.status == "canceled":
            return order_data(db, order)
        entries = list(db.scalars(select(FinanceEntry).where(FinanceEntry.service_order_id == order.id).order_by(FinanceEntry.id)))
        for entry in entries:
            if entry.status != "canceled":
                V.cancel_entry(db, entry, user, payload.reason)
        order.status = "canceled"
        order.cancel_reason = payload.reason
        order.updated_at = V.now()
        V.audit(db, user, "cancel", "service_order", order.id)
        db.flush()
        return order_data(db, order)
