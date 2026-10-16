import csv
import hashlib
import json
from uuid import uuid4
import hashlib
import io
import os
import secrets
from html import escape
from datetime import date, timedelta
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import case, func, or_, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from . import financial as F
from . import reporting as R
from . import schemas as S
from . import services as V
from .db import ROOT, build_engine, session_factory
from .models import Account, Audit, CashSession, Category, CompanySetting, Customer, FinanceEntry, LoginAttempt, Payment, Product, Sale, SaleItem, Session, StockMovement, Subcategory, Supplier, User, now

passwords = PasswordHasher()
COOKIE = "gestao_session"
PAGE = Query(1, ge=1, le=1_000_000)
SIZE = Query(20, ge=1, le=100)


def get_db(request: Request):
    with request.app.state.sessions() as db:
        try:
            # Serializa gravações SQLite antes de ler estado: evita venda dupla e
            # upgrade de snapshot read -> write com SQLITE_BUSY em concorrência.
            if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                db.execute(text("BEGIN IMMEDIATE"))
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise


def current_user(request: Request, db=Depends(get_db, scope="function")):
    token = request.cookies.get(COOKIE, "")
    session = db.get(Session, hashlib.sha256(token.encode()).hexdigest()) if token else None
    if not session or session.expires_at <= now():
        raise HTTPException(401, "Entre novamente para continuar")
    user = db.get(User, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, "Usuário inativo")
    return user


def admin(user=Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Acesso reservado ao administrador")
    return user


def create_app(engine=None, serve_frontend=True):
    app = FastAPI(title="Gestão", version="0.1.0", docs_url=None, redoc_url=None, openapi_url="/api/openapi.json")
    app.state.engine = engine if engine is not None else build_engine()
    app.state.sessions = session_factory(app.state.engine)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])

    @app.middleware("http")
    async def browser_boundary(request, call_next):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = request.headers.get("origin")
            allowed = {str(request.base_url).rstrip("/"), "http://127.0.0.1:5173", "http://localhost:5173"}
            if (origin and origin not in allowed) or request.headers.get("sec-fetch-site") == "cross-site":
                return JSONResponse({"detail": "Origem da solicitação não permitida"}, status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store"
        else:
            response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
        return response

    @app.exception_handler(IntegrityError)
    async def integrity_error(request, exc):
        return JSONResponse({"detail": "Registro duplicado ou referência inválida. Confira os dados."}, status_code=409)

    @app.exception_handler(OperationalError)
    async def busy_error(request, exc):
        return JSONResponse({"detail": "Banco temporariamente indisponível. Tente novamente."}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Nunca inclui o corpo recebido (pode conter senha).
        fields = [".".join(str(x) for x in e["loc"][1:]) for e in exc.errors()]
        return JSONResponse({"detail": "Confira os campos: " + ", ".join(fields)}, status_code=422)

    F.register(app, get_db, admin)
    R.register(app, get_db, admin)
    from . import service_orders as SO
    SO.register(app, get_db, admin)

    @app.get("/api/health")
    def health(db=Depends(get_db, scope="function")):
        db.execute(text("SELECT 1"))
        return {"status": "ok", "version": "0.1.0"}

    def company_settings_data(db):
        row = db.get(CompanySetting, 1)
        return V.data(row) if row else {"id": 1, "brand_name": "Gestão", "company_name": "", "company_document": "", "phone": "", "email": "", "address": ""}

    @app.get("/api/company-settings")
    def get_company_settings(db=Depends(get_db, scope="function"), user=Depends(current_user)):
        return company_settings_data(db)

    @app.put("/api/company-settings")
    def put_company_settings(payload: S.CompanySettingsInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        row = db.get(CompanySetting, 1)
        if row is None:
            row = CompanySetting(id=1)
            db.add(row)
        for key, value in payload.model_dump().items():
            setattr(row, key, value)
        db.flush()
        V.audit(db, user, "update", "company_settings", 1)
        return company_settings_data(db)

    @app.post("/api/auth/login")
    def login(payload: S.Login, request: Request, response: Response, db=Depends(get_db, scope="function")):
        username = payload.username.lower().strip()
        client_ip = request.client.host if request.client else "local"
        key = hashlib.sha256(f"{client_ip}:{username}".encode()).hexdigest()
        attempt = db.get(LoginAttempt, key)
        if attempt and attempt.reset_at > now() and attempt.failures >= 8:
            raise HTTPException(429, "Muitas tentativas. Aguarde 10 minutos.")
        user = db.scalar(select(User).where(User.username == username))
        valid = False
        if user and user.active:
            try:
                valid = passwords.verify(user.password_hash, payload.password)
            except (VerificationError, InvalidHashError):
                pass
        if not valid:
            if not attempt:
                attempt = LoginAttempt(key=key, failures=0, reset_at=now() + timedelta(minutes=10))
                db.add(attempt)
            if attempt.reset_at <= now():
                attempt.failures = 0
                attempt.reset_at = now() + timedelta(minutes=10)
            attempt.failures += 1
            db.commit()  # Falhas precisam persistir apesar da resposta 401.
            raise HTTPException(401, "Usuário ou senha inválidos")
        if attempt:
            db.delete(attempt)
        db.query(Session).filter(Session.expires_at <= now()).delete()
        previous = request.cookies.get(COOKIE)
        if previous:
            previous_session = db.get(Session, hashlib.sha256(previous.encode()).hexdigest())
            if previous_session:
                db.delete(previous_session)
        token = secrets.token_urlsafe(40)
        db.add(Session(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=now() + timedelta(hours=12)))
        response.set_cookie(COOKIE, token, httponly=True, samesite="strict", max_age=43200, secure=False, path="/")
        V.audit(db, user, "login", "user", user.id)
        return V.data(user)

    @app.get("/api/auth/me")
    def me(user=Depends(current_user)):
        return V.data(user)

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        session = db.get(Session, hashlib.sha256(request.cookies[COOKIE].encode()).hexdigest())
        db.delete(session)
        response.delete_cookie(COOKIE, path="/")
        return {"ok": True}

    @app.get("/api/users")
    def users(db=Depends(get_db, scope="function"), user=Depends(admin)):
        return [V.data(u) for u in db.scalars(select(User).order_by(User.id))]

    @app.post("/api/users", status_code=201)
    def create_user(payload: S.UserInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        new = User(name=payload.name, username=payload.username.lower(), role=payload.role, password_hash=passwords.hash(payload.password))
        db.add(new)
        db.flush()
        V.audit(db, user, "create", "user", new.id)
        return V.data(new)

    @app.post("/api/users/{identifier}/toggle")
    def toggle_user(identifier: int, db=Depends(get_db, scope="function"), user=Depends(admin)):
        target = V.get(db, User, identifier)
        if target.id == user.id:
            V.fail("Não é possível desativar a própria conta")
        if target.active and db.scalar(select(CashSession).where(CashSession.user_id == target.id, CashSession.status == "open")):
            V.fail("Feche o caixa deste usuário antes de desativá-lo")
        target.active = not target.active
        if not target.active:
            db.query(Session).filter(Session.user_id == target.id).delete()
        V.audit(db, user, "toggle", "user", target.id)
        return V.data(target)

    def customer_query(q, active, search_field="all"):
        query = select(Customer).order_by(Customer.id.desc())
        if q:
            fields = {
                "name": Customer.name, "document": Customer.document, "phone": Customer.phone,
                "email": Customer.email, "contact": Customer.contact_name, "address": Customer.city,
            }
            if search_field == "all":
                query = query.where(or_(*(field.contains(q, autoescape=True) for field in fields.values())))
            elif search_field in fields:
                query = query.where(fields[search_field].contains(q, autoescape=True))
            else:
                V.fail("Campo de busca inválido", 422)
        if active is not None:
            query = query.where(Customer.active == active)
        return query

    def product_query(q, active, kind=None, group_name=""):
        query = select(Product).order_by(Product.id.desc())
        if q:
            query = query.where(or_(Product.description.contains(q, autoescape=True), Product.code.contains(q, autoescape=True), Product.barcode.contains(q, autoescape=True)))
        if active is not None:
            query = query.where(Product.active == active)
        if kind:
            query = query.where(Product.kind == kind)
        if group_name:
            query = query.where(Product.group_name == group_name)
        return query

    @app.get("/api/customers")
    def customers(q: str = "", active: bool | None = None, search_field: str = "all", page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        return V.page(db, customer_query(q, active, search_field), page, page_size)

    @app.post("/api/customers", status_code=201)
    def create_customer(payload: S.CustomerInput, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        row = Customer(**payload.model_dump())
        db.add(row)
        db.flush()
        V.audit(db, user, "create", "customer", row.id)
        return V.data(row)

    @app.put("/api/customers/{identifier}")
    def edit_customer(identifier: int, payload: S.CustomerInput, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        row = V.get(db, Customer, identifier)
        for field, value in payload.model_dump().items():
            setattr(row, field, value)
        db.flush()
        V.audit(db, user, "update", "customer", row.id)
        return V.data(row)

    @app.get("/api/products")
    def products(q: str = "", active: bool | None = None, kind: str | None = None, group_name: str = "", page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        if kind not in (None, "product", "service"):
            V.fail("Tipo de catálogo inválido", 422)
        return V.page(db, product_query(q, active, kind, group_name), page, page_size)

    @app.post("/api/products", status_code=201)
    def create_product(payload: S.ProductInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        row = Product(**payload.model_dump())
        db.add(row)
        db.flush()
        V.audit(db, user, "create", "product", row.id)
        return V.data(row)

    @app.put("/api/products/{identifier}")
    def edit_product(identifier: int, payload: S.ProductInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        row = V.get(db, Product, identifier)
        if row.kind != payload.kind and (row.stock_milli or db.scalar(select(StockMovement.id).where(StockMovement.product_id == identifier).limit(1)) or db.scalar(select(SaleItem.id).where(SaleItem.product_id == identifier).limit(1))):
            V.fail("O tipo de um item com histórico não pode ser alterado")
        for field, value in payload.model_dump().items():
            setattr(row, field, value)
        db.flush()
        V.audit(db, user, "update", "product", row.id)
        return V.data(row)

    def stock_query(q, kind, product_id, start, end):
        query = select(StockMovement).join(Product).order_by(StockMovement.id.desc())
        if q:
            query = query.where(or_(Product.description.contains(q, autoescape=True), StockMovement.reason.contains(q, autoescape=True)))
        if kind:
            query = query.where(StockMovement.kind == kind)
        if product_id:
            query = query.where(StockMovement.product_id == product_id)
        return V.date_window(query, StockMovement.created_at, start, end)

    def stock_data(db, row):
        return {**V.data(row), "product_description": V.get(db, Product, row.product_id).description, "operator_name": V.get(db, User, row.user_id).name}

    @app.get("/api/stock-movements")
    def stock(q: str = "", kind: str | None = None, product_id: int | None = None, start: date | None = None, end: date | None = None, page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(admin)):
        return V.page(db, stock_query(q, kind, product_id, start, end), page, page_size, lambda row: stock_data(db, row))

    @app.post("/api/stock-movements", status_code=201)
    def create_stock(payload: S.StockInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        product = V.get(db, Product, payload.product_id)
        if not product.active:
            V.fail("Item inativo")
        if payload.kind == "opening" and db.scalar(select(StockMovement.id).where(StockMovement.product_id == product.id).limit(1)):
            V.fail("O saldo inicial já possui histórico; use entrada ou inventário")
        if payload.kind != "inventory" and payload.quantity_milli == 0:
            V.fail("Quantidade deve ser maior que zero", 422)
        delta = payload.quantity_milli - product.stock_milli if payload.kind == "inventory" else payload.quantity_milli * (-1 if payload.kind == "out" else 1)
        V.move_stock(db, product, delta, payload.kind, payload.reason, user)
        db.flush()
        V.audit(db, user, "move", "product", product.id)
        return V.data(product)

    @app.get("/api/cash-sessions")
    def cash_sessions(page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        query = select(CashSession).order_by(CashSession.id.desc())
        if user.role != "admin":
            query = query.where(CashSession.user_id == user.id)
        return V.page(db, query, page, page_size, lambda row: V.cash_data(db, row))

    @app.get("/api/cash-sessions/current")
    def current_cash(db=Depends(get_db, scope="function"), user=Depends(current_user)):
        row = db.scalar(select(CashSession).where(CashSession.user_id == user.id, CashSession.status == "open"))
        return V.cash_data(db, row) if row else None

    @app.post("/api/cash-sessions", status_code=201)
    def open_cash(payload: S.CashOpen, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        if db.scalar(select(CashSession).where(CashSession.user_id == user.id, CashSession.status == "open")):
            V.fail("Seu caixa já está aberto")
        cash = CashSession(user_id=user.id, opening_cents=payload.opening_cents)
        db.add(cash)
        db.flush()
        V.audit(db, user, "open", "cash", cash.id)
        return V.cash_data(db, cash)

    @app.post("/api/cash-sessions/{identifier}/close")
    def close_cash(identifier: int, payload: S.CashClose, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        cash = V.get(db, CashSession, identifier)
        V.owner(cash, user)
        if cash.status == "closed":
            return V.cash_data(db, cash)
        cash.expected_cents = V.expected_cash(db, cash)
        cash.counted_cents = payload.counted_cents
        cash.difference_cents = payload.counted_cents - cash.expected_cents
        cash.status = "closed"
        cash.closed_at = now()
        V.audit(db, user, "close", "cash", cash.id)
        return V.cash_data(db, cash)

    def sale_query(user, q, status, start, end):
        query = select(Sale).order_by(Sale.id.desc())
        if user.role != "admin":
            query = query.where(Sale.user_id == user.id)
        if q:
            query = query.outerjoin(Customer).where(or_(Customer.name.contains(q, autoescape=True), Sale.id == (int(q) if q.isascii() and q.isdigit() and len(q) <= 10 else -1)))
        if status:
            query = query.where(Sale.status == status)
        return V.date_window(query, Sale.created_at, start, end)

    @app.get("/api/sales")
    def sales(q: str = "", status: str | None = None, start: date | None = None, end: date | None = None, page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        return V.page(db, sale_query(user, q, status, start, end), page, page_size, lambda row: V.sale_data(db, row))

    @app.post("/api/sales", status_code=201)
    def create_sale(payload: S.SaleInput, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        return V.sale_data(db, V.create_sale(db, payload, user))

    @app.get("/api/sales/{identifier}")
    def sale(identifier: int, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        row = V.get(db, Sale, identifier)
        V.owner(row, user)
        return V.sale_data(db, row)

    @app.post("/api/sales/{identifier}/finalize")
    def finalize(identifier: int, payload: S.Finalize, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        return V.sale_data(db, V.finalize_sale(db, V.get(db, Sale, identifier), payload, user))

    @app.post("/api/sales/{identifier}/cancel")
    def cancel(identifier: int, payload: S.Reason, db=Depends(get_db, scope="function"), user=Depends(current_user)):
        return V.sale_data(db, V.cancel_sale(db, V.get(db, Sale, identifier), payload.reason, user))

    @app.get("/api/accounts")
    def accounts(db=Depends(get_db, scope="function"), user=Depends(admin)):
        return [F.account_data(db,row) for row in db.scalars(select(Account).order_by(Account.id))]

    @app.post("/api/accounts", status_code=201)
    def create_account(payload: S.AccountInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        values = payload.model_dump()
        values["opening_date"] = payload.opening_date or V.today()
        F.validate_account(values)
        row = Account(**values)
        db.add(row)
        db.flush()
        V.audit(db, user, "create", "account", row.id)
        return V.data(row)

    @app.get("/api/categories")
    def categories(db=Depends(get_db, scope="function"), user=Depends(admin)):
        return [V.data(row) for row in db.scalars(select(Category).order_by(Category.id))]

    @app.post("/api/categories", status_code=201)
    def create_category(payload: S.CategoryInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        row = Category(**payload.model_dump())
        db.add(row)
        db.flush()
        db.add(Subcategory(name="Geral", category_id=row.id))
        db.flush()
        V.audit(db, user, "create", "category", row.id)
        return V.data(row)

    def finance_query(q, status, direction, account_id, category_id, supplier_id, supplier_kind, document, search_field, start, end, date_field):
        query = select(FinanceEntry).order_by(FinanceEntry.id.desc())
        if q:
            if search_field == "description":
                query = query.where(FinanceEntry.description.contains(q, autoescape=True))
            elif search_field == "document":
                query = query.where(FinanceEntry.document.contains(q, autoescape=True))
            elif search_field == "beneficiary":
                query = query.where(FinanceEntry.supplier_id.in_(select(Supplier.id).where(or_(Supplier.name.contains(q, autoescape=True), Supplier.document.contains(q, autoescape=True), Supplier.phone.contains(q, autoescape=True), Supplier.email.contains(q, autoescape=True)))))
            elif search_field == "history":
                query = query.where(or_(FinanceEntry.description.contains(q, autoescape=True), FinanceEntry.document.contains(q, autoescape=True), FinanceEntry.supplier_id.in_(select(Supplier.id).where(Supplier.name.contains(q, autoescape=True)))))
            else:
                V.fail("Campo de busca inválido", 422)
        if direction:
            query = query.where(FinanceEntry.direction == direction)
        if account_id:
            query = query.where(FinanceEntry.account_id == account_id)
        if category_id:
            query = query.where(FinanceEntry.category_id == category_id)
        if supplier_id:
            query = query.where(FinanceEntry.supplier_id == supplier_id)
        if supplier_kind:
            query = query.where(FinanceEntry.supplier_id.in_(select(Supplier.id).where(Supplier.kind == supplier_kind)))
        if document:
            query = query.where(FinanceEntry.document.contains(document, autoescape=True))
        if status == "overdue":
            query = query.where(FinanceEntry.status.in_(["open", "partial"]), FinanceEntry.due_date < V.today())
        elif status == 'open':
            query = query.where(FinanceEntry.status == 'open')
        elif status == 'partial':
            query = query.where(FinanceEntry.status == 'partial')
        elif status:
            query = query.where(FinanceEntry.status == status)
        if date_field == "due":
            if start:
                query = query.where(FinanceEntry.due_date >= start)
            if end:
                query = query.where(FinanceEntry.due_date <= end)
            if start and end and start > end:
                V.fail("Data inicial deve ser anterior à final", 422)
        elif date_field in ("created", "settled"):
            query = V.date_window(query, FinanceEntry.created_at if date_field == "created" else FinanceEntry.settled_at, start, end)
        elif date_field == 'competence':
            if start: query = query.where(FinanceEntry.competence_date >= start)
            if end: query = query.where(FinanceEntry.competence_date <= end)
            if start and end and start > end: V.fail('Data inicial deve ser anterior à final',422)
        else:
            V.fail("Filtro de data inválido", 422)
        return query

    def finance_summary(db, filtered_query):
        filtered = filtered_query.order_by(None).subquery()
        signed_principal = case(
            (FinanceEntry.direction == "income", Payment.principal_cents),
            else_=-Payment.principal_cents,
        )
        paid = select(Payment.entry_id.label("entry_id"), func.coalesce(func.sum(signed_principal), 0).label("principal_cents")).join(FinanceEntry, FinanceEntry.id == Payment.entry_id).group_by(Payment.entry_id).subquery()
        remaining = filtered.c.amount_cents - func.coalesce(paid.c.principal_cents, 0)
        is_pending = filtered.c.status.in_(["open", "partial"])
        remaining_positive = case((remaining > 0, remaining), else_=0)
        due = V.today()
        row = db.execute(select(
            func.coalesce(func.sum(case((is_pending, remaining_positive), else_=0)), 0).label("pending_cents"),
            func.coalesce(func.sum(case((is_pending & (filtered.c.due_date < due), remaining_positive), else_=0)), 0).label("overdue_cents"),
            func.coalesce(func.sum(case((is_pending & filtered.c.due_date.between(due, due + timedelta(days=7)), remaining_positive), else_=0)), 0).label("due_7_days_cents"),
            func.count(filtered.c.id).label("count"),
        ).select_from(filtered.outerjoin(paid, paid.c.entry_id == filtered.c.id))).one()
        return {key: int(row._mapping[key] or 0) for key in ("pending_cents", "overdue_cents", "due_7_days_cents", "count")}

    @app.get("/api/finance")
    def finance(q: str = "", status: str | None = None, direction: str | None = None, account_id: int | None = None, category_id: int | None = None, supplier_id: int | None = None, supplier_kind: str | None = None, document: str = "", search_field: str = "history", start: date | None = None, end: date | None = None, date_field: str = "due", page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(admin)):
        query = finance_query(q, status, direction, account_id, category_id, supplier_id, supplier_kind, document, search_field, start, end, date_field)
        result = V.page(db, query, page, page_size, lambda row: V.finance_data(db, row))
        result["summary"] = finance_summary(db, query)
        return result

    @app.get("/api/finance/print", response_class=HTMLResponse)
    def finance_print(q: str = "", status: str | None = None, direction: str | None = None, account_id: int | None = None, category_id: int | None = None, supplier_id: int | None = None, supplier_kind: str | None = None, document: str = "", search_field: str = "history", start: date | None = None, end: date | None = None, date_field: str = "due", db=Depends(get_db, scope="function"), user=Depends(admin)):
        query = finance_query(q, status, direction, account_id, category_id, supplier_id, supplier_kind, document, search_field, start, end, date_field)
        rows = list(db.scalars(query))
        summary = finance_summary(db, query)
        def safe(value): return escape(str(value if value is not None else ""))
        def brl(cents): return f"R$ {cents // 100:,}".replace(",", ".") + f",{cents % 100:02d}"
        # Civil date presentation only; no timezone or serialization conversion.
        def date_label(value): return f"{value.day:02d}/{value.month:02d}/{value.year:04d}"
        body = "".join(f"<tr><td>{safe(row.id)}</td><td>{safe(row.description)}</td><td>{'Receita' if row.direction == 'income' else 'Despesa'}</td><td>{safe(date_label(row.due_date))}</td><td>{safe(row.status)}</td><td>{brl(row.amount_cents)}</td></tr>" for row in rows)
        summary_text = f"{summary['count']} títulos · pendente {brl(summary['pending_cents'])} · vencido {brl(summary['overdue_cents'])} · vence em 7 dias {brl(summary['due_7_days_cents'])}"
        return HTMLResponse(f"<!doctype html><html lang='pt-BR'><meta charset='utf-8'><title>Impressão financeira</title><style>body{{font:12px Arial,sans-serif;color:#172b4d;margin:24px}}h1{{font-size:18px}}p{{margin:8px 0 18px}}table{{border-collapse:collapse;width:100%}}th,td{{border-bottom:1px solid #d9e0ea;padding:7px;text-align:left}}th{{background:#eef2f8}}@media print{{body{{margin:10mm}}}}</style><h1>Silex Business · Lançamentos financeiros</h1><p>{safe(summary_text)}</p><table><thead><tr><th>Código</th><th>Histórico</th><th>Tipo</th><th>Vencimento</th><th>Situação</th><th>Valor</th></tr></thead><tbody>{body or '<tr><td colspan="6">Nenhum título encontrado</td></tr>'}</tbody></table><p>Use a opção Imprimir do navegador para salvar em PDF ou imprimir.</p></html>")

    @app.post("/api/finance", status_code=201)
    def create_finance(payload: S.FinanceInput, db=Depends(get_db, scope="function"), user=Depends(admin)):
        F.require_active(db, Account, payload.account_id)
        category = F.require_active(db, Category, payload.category_id)
        subcategory = V.category_subcategory(db, category, payload.direction)
        V.active_customer(db, payload.customer_id)
        if payload.supplier_id:
            F.require_active(db, Supplier, payload.supplier_id)
        if payload.subcategory_id:
            subcategory = F.require_active(db, Subcategory, payload.subcategory_id)
            if subcategory.category_id != category.id:
                V.fail('Subcategoria deve pertencer à categoria escolhida',422)
        competence = payload.competence_date or payload.due_date
        series = str(uuid4()) if payload.recurrence_count > 1 else None
        rows=[]
        values=payload.model_dump(exclude={'recurrence_count','recurrence_frequency','subcategory_id','competence_date'})
        for index in range(payload.recurrence_count):
            try:
                due=V.repeat_date(payload.due_date,payload.recurrence_frequency,index)
                period=V.repeat_date(competence,payload.recurrence_frequency,index)
            except (ValueError,OverflowError):
                V.fail('Frequência ultrapassa a faixa de datas suportada',422)
            row=FinanceEntry(**values,subcategory_id=subcategory.id,competence_date=period,recurrence_id=series,recurrence_index=index+1,recurrence_count=payload.recurrence_count,user_id=user.id)
            row.due_date=due
            db.add(row);db.flush();V.audit(db,user,'create','finance',row.id);rows.append(V.finance_data(db,row))
        return rows[0] if len(rows)==1 else {'recurrence_id':series,'items':rows,'total':len(rows)}

    @app.post("/api/finance/{identifier}/settle")
    def settle(identifier: int, payload: S.Settle, db=Depends(get_db, scope="function"), user=Depends(admin)):
        entry = V.get(db, FinanceEntry, identifier)
        fingerprint=hashlib.sha256(json.dumps(payload.model_dump(mode='json'),sort_keys=True).encode()).hexdigest()
        if payload.request_key:
            prior=db.scalar(select(Payment).where(Payment.request_key==payload.request_key))
            if prior:
                if prior.request_hash != fingerprint: V.fail('Chave de quitação já usada com outros dados')
                return V.finance_data(db,V.get(db,FinanceEntry,prior.entry_id))
        V.settle_entry(db, entry, payload.method, V.get(db, Account, payload.account_id), user, payload.posting_date, principal_cents=payload.principal_cents,interest_cents=payload.interest_cents,fine_cents=payload.fine_cents,discount_cents=payload.discount_cents,request_key=payload.request_key,request_hash=fingerprint if payload.request_key else None)
        return V.finance_data(db, entry)

    @app.post("/api/finance/{identifier}/cancel")
    def cancel_finance(identifier: int, payload: S.Reason, db=Depends(get_db, scope="function"), user=Depends(admin)):
        entry = V.get(db, FinanceEntry, identifier)
        if entry.sale_id:
            V.fail("Cancele a venda para estornar esta conta")
        V.cancel_entry(db, entry, user, payload.reason)
        db.flush()
        return V.finance_data(db, entry)

    @app.get("/api/dashboard")
    def dashboard(db=Depends(get_db, scope="function"), user=Depends(current_user)):
        sale_query_ = select(Sale).where(Sale.status == "finalized")
        if user.role != "admin":
            sale_query_ = sale_query_.where(Sale.user_id == user.id)
        today_sales = db.scalars(V.date_window(sale_query_, Sale.finalized_at, V.today(), V.today())).all()
        monthly_sales = db.scalars(V.date_window(sale_query_, Sale.finalized_at, V.today().replace(day=1), V.today())).all()
        result = {"date": V.today().isoformat(), "sales_today_cents": sum(s.total_cents for s in today_sales), "sales_today_count": len(today_sales), "sales_month_cents": sum(s.total_cents for s in monthly_sales), "active_products": db.scalar(select(func.count(Product.id)).where(Product.active)), "low_stock": [V.data(p) for p in db.scalars(select(Product).where(Product.active, Product.kind == "product", Product.stock_milli < 5000).limit(8))], "recent_sales": [V.sale_data(db, s) for s in db.scalars(sale_query_.order_by(Sale.finalized_at.desc()).limit(5))], "cash": None, "receivable_cents": None, "payable_cents": None, "overdue_cents": None}
        cash = db.scalar(select(CashSession).where(CashSession.user_id == user.id, CashSession.status == "open"))
        result["cash"] = V.cash_data(db, cash) if cash else None
        if user.role == "admin":
            result["receivable_cents"] = db.scalar(select(func.coalesce(func.sum(FinanceEntry.amount_cents), 0)).where(FinanceEntry.status == "open", FinanceEntry.direction == "income"))
            result["payable_cents"] = db.scalar(select(func.coalesce(func.sum(FinanceEntry.amount_cents), 0)).where(FinanceEntry.status == "open", FinanceEntry.direction == "expense"))
            result["overdue_cents"] = db.scalar(select(func.coalesce(func.sum(FinanceEntry.amount_cents), 0)).where(FinanceEntry.status == "open", FinanceEntry.direction == "income", FinanceEntry.due_date < V.today()))
        return result

    @app.get("/api/audit")
    def audit(page: int = PAGE, page_size: int = SIZE, db=Depends(get_db, scope="function"), user=Depends(admin)):
        return V.page(db, select(Audit).order_by(Audit.id.desc()), page, page_size, lambda row: {**V.data(row), "user_name": V.get(db, User, row.user_id).name if row.user_id else "Sistema"})

    @app.get("/api/reports/{report}.csv")
    def report(report: str, q: str = "", active: bool | None = None, status: str | None = None, kind: str | None = None, product_id: int | None = None, product_kind: str | None = None, group_name: str = "", direction: str | None = None, account_id: int | None = None, category_id: int | None = None, supplier_id: int | None = None, supplier_kind: str | None = None, document: str = "", search_field: str = "all", start: date | None = None, end: date | None = None, date_field: str = "due", db=Depends(get_db, scope="function"), user=Depends(current_user)):
        if report in ("stock", "finance") and user.role != "admin":
            V.fail("Acesso reservado ao administrador", 403)
        if report == "products":
            query, fields, transform = product_query(q, active, product_kind, group_name), [("code", "Código"), ("description", "Descrição"), ("kind", "Tipo"), ("group_name", "Grupo"), ("unit", "Unidade"), ("stock_milli", "Estoque"), ("price_cents", "Preço"), ("active", "Ativo")], V.data
        elif report == "customers":
            query, fields, transform = customer_query(q, active, search_field), [("id", "Código"), ("name", "Nome"), ("document", "Documento"), ("email", "E-mail"), ("phone", "Telefone"), ("contact_name", "Contato"), ("city", "Cidade"), ("state", "UF"), ("active", "Ativo")], V.data
        elif report == "stock":
            query, fields, transform = stock_query(q, kind, product_id, start, end), [("id", "Código"), ("product_description", "Item"), ("quantity_milli", "Quantidade"), ("kind", "Tipo"), ("reason", "Motivo"), ("created_at", "Data UTC")], lambda r: stock_data(db, r)
        elif report == "sales":
            query, fields, transform = sale_query(user, q, status, start, end), [("id", "Venda"), ("customer_name", "Cliente"), ("total_cents", "Total"), ("status", "Status"), ("payment_method", "Pagamento"), ("created_at", "Data UTC")], lambda r: V.sale_data(db, r)
        elif report == "finance":
            query, fields, transform = finance_query(q, status, direction, account_id, category_id, supplier_id, supplier_kind, document, "history" if search_field == "all" else search_field, start, end, date_field), [("description", "Descrição"), ("direction", "Tipo"), ("amount_cents", "Valor"), ("status", "Status"), ("due_date", "Vencimento"), ("account_name", "Conta"), ("category_name", "Categoria")], lambda r: V.finance_data(db, r)
        else:
            V.fail("Relatório não encontrado", 404)
        def csv_value(key, value):
            if value is None:
                return ""
            if key.endswith("_cents"):
                return f"{value // 100},{value % 100:02d}"
            if key.endswith("_milli"):
                sign = "-" if value < 0 else ""
                value = abs(value)
                return f"{sign}{value // 1000},{value % 1000:03d}"
            string = str(value)
            # Evita executar fórmulas ao abrir texto fornecido por usuário.
            return "'" + string if string.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else string
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        writer.writerow([label for _, label in fields])
        for row in db.scalars(query):
            record = transform(row)
            writer.writerow([csv_value(key, record.get(key)) for key, _ in fields])
        return Response("\ufeff" + output.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{report}.csv"'})

    if serve_frontend:
        dist = ROOT / "frontend" / "dist"
        if dist.exists():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

            @app.get("/{path:path}")
            def frontend(path: str):
                if path.startswith("api/"):
                    raise HTTPException(404, "Rota não encontrada")
                return FileResponse(dist / "index.html")
    return app
