from datetime import date, datetime, time, timedelta, timezone
from calendar import monthrange
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select

from .models import Account, Audit, CashSession, Category, Customer, FinanceEntry, Payment, Product, Sale, SaleItem, ServiceOrder, StockMovement, Subcategory, Supplier, User, now

TZ = ZoneInfo("America/Manaus")


def today():
    return datetime.now(TZ).date()


def fail(message, status=409):
    raise HTTPException(status, message)


def get(db, model, identifier):
    if not isinstance(identifier, int) or identifier < 1 or identifier > 2**31 - 1:
        fail("Registro não encontrado", 404)
    obj = db.get(model, identifier)
    if obj is None:
        fail("Registro não encontrado", 404)
    return obj


def data(obj):
    result = {}
    for column in obj.__table__.columns:
        if column.name in ("password_hash", "token_hash"):
            continue
        value = getattr(obj, column.name)
        if isinstance(value, datetime):
            value = value.replace(tzinfo=timezone.utc).isoformat()
        elif isinstance(value, date):
            value = value.isoformat()
        result[column.name] = value
    return result


def audit(db, user, action, entity, identifier):
    db.add(Audit(user_id=user.id if user else None, action=action, entity=entity, entity_id=identifier))


def owner(obj, user):
    if user.role != "admin" and obj.user_id != user.id:
        fail("Você não tem acesso a este registro", 403)


def active_customer(db, identifier):
    if identifier is None:
        return None
    customer = get(db, Customer, identifier)
    if not customer.active:
        fail("Cliente inativo")
    return customer


def active_cash(db, user):
    cash = db.scalar(select(CashSession).where(CashSession.user_id == user.id, CashSession.status == "open"))
    if not cash:
        fail("Abra o seu caixa antes de continuar")
    return cash


def expected_cash(db, cash):
    return cash.opening_cents + (db.scalar(select(func.coalesce(func.sum(Payment.amount_cents), 0)).where(Payment.cash_session_id == cash.id)) or 0)


def cash_data(db, cash):
    result = data(cash)
    if cash.status == "open":
        result["expected_cents"] = expected_cash(db, cash)
    result["operator_name"] = db.get(User, cash.user_id).name
    return result


def move_stock(db, product, delta, kind, reason, user, sale_id=None):
    if product.kind != "product":
        fail("Serviços não movimentam estoque")
    if product.stock_milli + delta < 0:
        fail(f"Estoque insuficiente: {product.description}")
    product.stock_milli += delta
    db.add(StockMovement(product_id=product.id, quantity_milli=delta, kind=kind, reason=reason, user_id=user.id, sale_id=sale_id))


def line_total(price_cents, quantity_milli):
    # Arredondamento comercial por item (meio centavo para cima), sem floats.
    result = (price_cents * quantity_milli + 500) // 1000
    if result > 100_000_000_000:
        fail("Total do item acima do limite permitido", 422)
    return result


def create_sale(db, payload, user):
    active_customer(db, payload.customer_id)
    seen = set()
    items = []
    for row in payload.items:
        if row.product_id in seen:
            fail("Agrupe as quantidades de cada item em uma única linha", 422)
        seen.add(row.product_id)
        product = get(db, Product, row.product_id)
        if not product.active:
            fail("Item inativo")
        items.append(SaleItem(product_id=product.id, description=product.description, unit=product.unit, quantity_milli=row.quantity_milli, unit_price_cents=row.unit_price_cents, total_cents=line_total(row.unit_price_cents, row.quantity_milli)))
    subtotal = sum(item.total_cents for item in items)
    if subtotal > 100_000_000_000:
        fail("Total da venda acima do limite permitido", 422)
    if payload.discount_cents >= subtotal:
        fail("O desconto deve ser menor que o subtotal", 422)
    sale = Sale(user_id=user.id, customer_id=payload.customer_id, discount_cents=payload.discount_cents, total_cents=subtotal - payload.discount_cents)
    db.add(sale)
    db.flush()
    for item in items:
        item.sale_id = sale.id
        db.add(item)
    db.flush()
    audit(db, user, "create", "sale", sale.id)
    return sale


def sale_data(db, sale):
    result = data(sale)
    result["items"] = [data(item) for item in db.scalars(select(SaleItem).where(SaleItem.sale_id == sale.id).order_by(SaleItem.id))]
    result["customer_name"] = db.get(Customer, sale.customer_id).name if sale.customer_id else "Consumidor final"
    entry = db.scalar(select(FinanceEntry).where(FinanceEntry.sale_id == sale.id))
    result["finance_status"] = entry.status if entry else None
    return result


def default_records(db):
    for name, kind in (("Caixa", "cash"), ("Conta digital", "bank")):
        if not db.scalar(select(Account).where(Account.name == name)):
            db.add(Account(name=name, kind=kind))
    for name in ("Vendas", "Despesas operacionais", "Outras receitas"):
        if not db.scalar(select(Category).where(Category.name == name)):
            db.add(Category(name=name))
    db.flush()
    for category in db.scalars(select(Category)):
        if not db.scalar(select(Subcategory.id).where(Subcategory.category_id == category.id)):
            db.add(Subcategory(name='Geral', category_id=category.id))
    db.flush()


def category_subcategory(db, category, direction):
    if not category.active:
        fail('Categoria inativa')
    if category.direction not in ('both', direction):
        fail('Categoria incompatível com o tipo do lançamento', 422)
    subcategory = db.scalar(select(Subcategory).where(Subcategory.category_id == category.id, Subcategory.active).order_by(Subcategory.id))
    if not subcategory:
        fail('Cadastre uma subcategoria ativa para esta categoria')
    return subcategory


def repeat_date(value, frequency, index):
    if frequency == 'daily':
        return value + timedelta(days=index)
    if frequency == 'weekly':
        return value + timedelta(days=7*index)
    months = index if frequency == 'monthly' else index*12
    serial = value.year*12 + value.month-1 + months
    year, month0 = divmod(serial, 12)
    month = month0+1
    return date(year, month, min(value.day, monthrange(year,month)[1]))


def choose_account(db, method):
    kind = "cash" if method == "cash" else "bank"
    account = db.scalar(select(Account).where(Account.kind == kind, Account.active).order_by(Account.id))
    if not account:
        fail('Cadastre uma conta ativa para este pagamento')
    return account


def principal_paid(db, entry):
    sign = 1 if entry.direction == 'income' else -1
    signed = db.scalar(select(func.coalesce(func.sum(Payment.principal_cents), 0)).where(Payment.entry_id == entry.id)) or 0
    return max(0, min(entry.amount_cents, signed * sign))


def settle_entry(db, entry, method, account, user, posting_date=None, *, principal_cents=None, interest_cents=0, fine_cents=0, discount_cents=0, request_key=None, request_hash=None):
    if entry.status == 'paid':
        return entry
    if entry.status not in ('open', 'partial'):
        fail('Conta cancelada não pode ser quitada')
    if not account.active:
        fail('Conta inativa')
    posting_date = posting_date or today()
    if posting_date > today() or (account.kind == 'cash' and posting_date != today()):
        fail('Use data de hoje no caixa e data até hoje na conta bancária', 422)
    if posting_date < account.opening_date:
        fail('Data anterior à referência do saldo inicial', 422)
    if (method == 'cash') != (account.kind == 'cash'):
        fail('Dinheiro exige conta de caixa; Pix, cartão e OFX exigem conta bancária', 422)
    already = principal_paid(db, entry)
    remaining = entry.amount_cents - already
    principal = remaining if principal_cents is None else principal_cents
    if principal <= 0 or principal > remaining:
        fail('Principal deve ser maior que zero e não pode exceder o saldo pendente', 422)
    net = principal + interest_cents + fine_cents - discount_cents
    if net <= 0 or net > 100_000_000_000:
        fail('Pagamento líquido deve ser positivo e respeitar o limite', 422)
    if discount_cents > principal + interest_cents + fine_cents:
        fail('Desconto não pode superar o valor da quitação', 422)
    sign = 1 if entry.direction == 'income' else -1
    signed = sign * net
    cash = active_cash(db, user) if method == 'cash' else None
    if cash and expected_cash(db, cash) + signed < 0:
        fail('Saldo de dinheiro insuficiente no caixa')
    db.add(Payment(entry_id=entry.id, account_id=account.id, cash_session_id=cash.id if cash else None, amount_cents=signed, method=method, user_id=user.id, posting_date=posting_date, competence_date=entry.competence_date, principal_cents=sign*principal, interest_cents=sign*interest_cents, fine_cents=sign*fine_cents, discount_cents=sign*discount_cents, request_key=request_key, request_hash=request_hash))
    entry.account_id = account.id
    entry.status = 'paid' if principal == remaining else 'partial'
    entry.settled_at = now() if entry.status == 'paid' else None
    db.flush()
    audit(db, user, 'settle' if entry.status == 'paid' else 'partial_settle', 'finance', entry.id)
    return entry


def reverse_payment(db, payment, user, reason=None):
    if payment.reversal_of is not None or db.scalar(select(Payment.id).where(Payment.reversal_of == payment.id)):
        return False
    cash = get(db, CashSession, payment.cash_session_id) if payment.cash_session_id else None
    if cash:
        if cash.status != 'open':
            fail('O pagamento pertence a um caixa fechado; estorno indisponível')
        if expected_cash(db, cash) - payment.amount_cents < 0:
            fail('O estorno deixaria o caixa sem saldo suficiente')
    reversal = Payment(entry_id=payment.entry_id, account_id=payment.account_id, cash_session_id=payment.cash_session_id, amount_cents=-payment.amount_cents, method=payment.method, reversal_of=payment.id, reversal_reason=reason, user_id=user.id, posting_date=today(), competence_date=payment.competence_date, principal_cents=-payment.principal_cents, interest_cents=-payment.interest_cents, fine_cents=-payment.fine_cents, discount_cents=-payment.discount_cents)
    db.add(reversal)
    entry = get(db, FinanceEntry, payment.entry_id)
    if entry.status != 'canceled':
        remaining = entry.amount_cents - principal_paid(db, entry)
        entry.status = 'paid' if remaining == 0 else ('partial' if remaining < entry.amount_cents else 'open')
        entry.settled_at = now() if entry.status == 'paid' else None
    audit(db, user, 'reverse_payment', 'finance', payment.entry_id)
    db.flush()
    return True


def finalize_sale(db, sale, payload, user):
    owner(sale, user)
    if sale.status == "finalized":
        return sale
    if sale.status != "draft":
        fail("Venda cancelada não pode ser finalizada")
    # O caixa pertence ao autor. Administrador não finaliza rascunho de outro usuário.
    if sale.user_id != user.id:
        fail("Somente o autor pode finalizar a venda", 403)
    cash = active_cash(db, user)
    active_customer(db, sale.customer_id)
    if payload.method == "credit":
        if not sale.customer_id or not payload.due_date:
            fail("Venda a prazo exige cliente e vencimento", 422)
        if payload.due_date < today():
            fail("Vencimento não pode estar no passado", 422)
    for item in db.scalars(select(SaleItem).where(SaleItem.sale_id == sale.id)):
        product = get(db, Product, item.product_id)
        if not product.active:
            fail("A venda contém um item inativo")
        if product.kind == "product":
            move_stock(db, product, -item.quantity_milli, "sale", f"Venda #{sale.id}", user, sale.id)
    default_records(db)
    account = choose_account(db, payload.method)
    category = db.scalar(select(Category).where(Category.name == "Vendas"))
    subcategory = category_subcategory(db, category, "income")
    entry = FinanceEntry(description=f"Venda #{sale.id}", direction="income", amount_cents=sale.total_cents, account_id=account.id, category_id=category.id, subcategory_id=subcategory.id, origin='sale', customer_id=sale.customer_id, sale_id=sale.id, user_id=user.id, due_date=payload.due_date if payload.method == "credit" else today())
    db.add(entry)
    db.flush()
    if payload.method != "credit":
        settle_entry(db, entry, payload.method, account, user)
    sale.status = "finalized"
    sale.payment_method = payload.method
    sale.cash_session_id = cash.id
    sale.due_date = payload.due_date if payload.method == "credit" else None
    sale.finalized_at = now()
    db.flush()
    audit(db, user, "finalize", "sale", sale.id)
    return sale


def cancel_entry(db, entry, user, reason=None):
    if entry.status == 'canceled':
        return
    payments = list(db.scalars(select(Payment).where(Payment.entry_id == entry.id, Payment.reversal_of.is_(None))))
    open_payments = [p for p in payments if not db.scalar(select(Payment.id).where(Payment.reversal_of == p.id))]
    by_cash = {}
    for payment in open_payments:
        if payment.cash_session_id:
            by_cash[payment.cash_session_id] = by_cash.get(payment.cash_session_id, 0) - payment.amount_cents
    for cash_id, delta in by_cash.items():
        cash = get(db, CashSession, cash_id)
        if cash.status != 'open':
            fail('O pagamento pertence a um caixa fechado; cancelamento indisponível')
        if expected_cash(db, cash) + delta < 0:
            fail('O estorno deixaria o caixa sem saldo suficiente')
    for payment in open_payments:
        db.add(Payment(entry_id=entry.id, account_id=payment.account_id, cash_session_id=payment.cash_session_id, amount_cents=-payment.amount_cents, method=payment.method, reversal_of=payment.id, reversal_reason=reason, user_id=user.id, posting_date=today(), competence_date=payment.competence_date, principal_cents=-payment.principal_cents, interest_cents=-payment.interest_cents, fine_cents=-payment.fine_cents, discount_cents=-payment.discount_cents))
    entry.status = 'canceled'
    entry.canceled_at = now()
    entry.cancel_reason = reason
    audit(db, user, 'cancel', 'finance', entry.id)


def cancel_sale(db, sale, reason, user):
    owner(sale, user)
    if sale.status == "canceled":
        return sale
    if sale.status == "finalized":
        if user.role != "admin":
            fail("Somente o administrador pode cancelar venda finalizada", 403)
        cash = get(db, CashSession, sale.cash_session_id)
        if cash.status != "open":
            fail("O caixa desta venda já foi fechado")
        entry = db.scalar(select(FinanceEntry).where(FinanceEntry.sale_id == sale.id))
        cancel_entry(db, entry, user, reason)
        for item in db.scalars(select(SaleItem).where(SaleItem.sale_id == sale.id)):
            product = get(db, Product, item.product_id)
            if product.kind == "product":
                move_stock(db, product, item.quantity_milli, "reversal", reason, user, sale.id)
    sale.status = "canceled"
    sale.canceled_at = now()
    sale.cancel_reason = reason
    db.flush()
    audit(db, user, "cancel", "sale", sale.id)
    return sale


def finance_data(db, entry):
    result = data(entry)
    result["overdue"] = entry.status in ("open","partial") and entry.due_date < today()
    result["account_name"] = get(db, Account, entry.account_id).name
    result["category_name"] = get(db, Category, entry.category_id).name
    result["customer_name"] = get(db, Customer, entry.customer_id).name if entry.customer_id else None
    from .models import Supplier, Attachment
    supplier = get(db, Supplier, entry.supplier_id) if entry.supplier_id else None
    result['supplier_name'] = supplier.name if supplier else None
    result['supplier_kind'] = supplier.kind if supplier else None
    result['supplier_pix'] = {'key_type': supplier.pix_key_type, 'key': supplier.pix_key, 'holder': supplier.pix_holder} if supplier and supplier.pix_key else None
    result['service_order_code'] = db.get(ServiceOrder, entry.service_order_id).code if entry.service_order_id else None
    result['paid_principal_cents'] = principal_paid(db, entry)
    result['remaining_cents'] = max(0, entry.amount_cents - result['paid_principal_cents'])
    result['attachments'] = [data(a) | {'content': None} for a in db.scalars(select(Attachment).where(Attachment.finance_entry_id == entry.id).order_by(Attachment.id))]
    result["payments"] = [{**data(p), "attachments": [data(a) | {"content": None} for a in db.scalars(select(Attachment).where(Attachment.payment_id == p.id).order_by(Attachment.id))]} for p in db.scalars(select(Payment).where(Payment.entry_id == entry.id).order_by(Payment.id))]
    return result


def date_window(query, column, start, end):
    if start:
        lower = datetime.combine(start, time.min, TZ).astimezone(timezone.utc).replace(tzinfo=None)
        query = query.where(column >= lower)
    if end:
        upper = datetime.combine(end + timedelta(days=1), time.min, TZ).astimezone(timezone.utc).replace(tzinfo=None)
        query = query.where(column < upper)
    if start and end and start > end:
        fail("Data inicial deve ser anterior à final", 422)
    return query


def page(db, query, page_number=1, page_size=20, transform=data):
    count = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    rows = db.scalars(query.offset((page_number - 1) * page_size).limit(page_size)).all()
    return {"items": [transform(row) for row in rows], "total": count, "page": page_number, "page_size": page_size}
