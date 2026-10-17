from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (CheckConstraint("role IN ('admin', 'operator')"),)


class Session(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    failures: Mapped[int] = mapped_column(default=0)
    reset_at: Mapped[datetime] = mapped_column(DateTime)


class CompanySetting(Base):
    __tablename__ = "company_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    brand_name: Mapped[str] = mapped_column(String(50), default="Gestão")
    company_name: Mapped[str] = mapped_column(String(150), default="")
    company_document: Mapped[str] = mapped_column(String(20), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    email: Mapped[str] = mapped_column(String(180), default="")
    address: Mapped[str] = mapped_column(String(300), default="")


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    document: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(180), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    address: Mapped[str] = mapped_column(String(300), default="")
    postal_code: Mapped[str] = mapped_column(String(9), default="")
    street: Mapped[str] = mapped_column(String(180), default="")
    address_number: Mapped[str] = mapped_column(String(30), default="")
    complement: Mapped[str] = mapped_column(String(100), default="")
    neighborhood: Mapped[str] = mapped_column(String(100), default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    state: Mapped[str] = mapped_column(String(2), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class CustomerServiceDetails(Base):
    """Account-specific metadata; never part of generic customer serialization."""
    __tablename__ = "customer_service_details"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    start_address: Mapped[str] = mapped_column(String(2000), default="")
    end_address: Mapped[str] = mapped_column(String(2000), default="")
    service_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    __table_args__ = (
        UniqueConstraint("customer_id", "user_id"),
        CheckConstraint("service_type IS NULL OR service_type IN ('local', 'interstate')"),
    )


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    description: Mapped[str] = mapped_column(String(180))
    kind: Mapped[str] = mapped_column(String(20))
    group_name: Mapped[str] = mapped_column(String(100), default="")
    unit: Mapped[str] = mapped_column(String(12), default="UN")
    barcode: Mapped[str | None] = mapped_column(String(60), unique=True, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer)
    stock_milli: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (CheckConstraint("kind IN ('product', 'service')"), CheckConstraint("price_cents >= 0 AND stock_milli >= 0"))


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity_milli: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str] = mapped_column(String(300))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class CashSession(Base):
    __tablename__ = "cash_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="open")
    opening_cents: Mapped[int] = mapped_column(Integer)
    counted_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difference_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    __table_args__ = (Index("one_open_cash_per_user", "user_id", unique=True, sqlite_where=text("status = 'open'")), CheckConstraint("opening_cents >= 0"))


class Sale(Base):
    __tablename__ = "sales"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    cash_session_id: Mapped[int | None] = mapped_column(ForeignKey("cash_sessions.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    discount_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer)
    payment_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)


class SaleItem(Base):
    __tablename__ = "sale_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    description: Mapped[str] = mapped_column(String(180))
    unit: Mapped[str] = mapped_column(String(12))
    quantity_milli: Mapped[int] = mapped_column(Integer)
    unit_price_cents: Mapped[int] = mapped_column(Integer)
    total_cents: Mapped[int] = mapped_column(Integer)


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    opening_cents: Mapped[int] = mapped_column(Integer, default=0)
    opening_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(ZoneInfo('America/Manaus')).date())
    bank: Mapped[str] = mapped_column(String(100), default='')
    branch: Mapped[str] = mapped_column(String(40), default='')
    number: Mapped[str] = mapped_column(String(60), default='')
    notes: Mapped[str] = mapped_column(String(500), default='')
    interest_bps: Mapped[int] = mapped_column(Integer, default=0)
    fine_bps: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (CheckConstraint("kind IN ('cash', 'bank')"),)


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    direction: Mapped[str] = mapped_column(String(20), default='both')
    classification: Mapped[str] = mapped_column(String(20), default='operating')
    result_group: Mapped[str] = mapped_column(String(100), default='')
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Subcategory(Base):
    __tablename__ = 'subcategories'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'))
    affects_result: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('category_id', 'name'),)


class Supplier(Base):
    __tablename__ = 'suppliers'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    document: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(180), default='')
    phone: Mapped[str] = mapped_column(String(40), default='')
    contact_name: Mapped[str] = mapped_column(String(120), default='')
    address: Mapped[str] = mapped_column(String(300), default='')
    postal_code: Mapped[str] = mapped_column(String(9), default='')
    street: Mapped[str] = mapped_column(String(180), default='')
    address_number: Mapped[str] = mapped_column(String(30), default='')
    complement: Mapped[str] = mapped_column(String(100), default='')
    neighborhood: Mapped[str] = mapped_column(String(100), default='')
    city: Mapped[str] = mapped_column(String(100), default='')
    state: Mapped[str] = mapped_column(String(2), default='')
    kind: Mapped[str] = mapped_column(String(30), default='supplier')
    pix_key_type: Mapped[str] = mapped_column(String(10), default='')
    pix_key: Mapped[str] = mapped_column(String(77), default='')
    pix_holder: Mapped[str] = mapped_column(String(150), default='')
    notes: Mapped[str] = mapped_column(String(500), default='')
    default_rate_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (Index('ix_supplier_kind_active', 'kind', 'active'),)


class FinanceEntry(Base):
    __tablename__ = "finance_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    description: Mapped[str] = mapped_column(String(180))
    direction: Mapped[str] = mapped_column(String(20))
    amount_cents: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="open")
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id"), unique=True, nullable=True)
    # Os vínculos são opcionais para preservar o histórico financeiro existente;
    # a API valida as chaves e não oferece exclusão de pedidos/custos.
    service_order_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    service_order_cost_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[datetime] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    subcategory_id: Mapped[int | None] = mapped_column(ForeignKey('subcategories.id'), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey('suppliers.id'), nullable=True)
    competence_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(ZoneInfo('America/Manaus')).date())
    document: Mapped[str] = mapped_column(String(100), default='')
    origin: Mapped[str] = mapped_column(String(20), default='title')
    request_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    request_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    recurrence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    recurrence_index: Mapped[int] = mapped_column(Integer, default=1)
    recurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    __table_args__ = (CheckConstraint("amount_cents > 0"), CheckConstraint("direction IN ('income', 'expense')"), Index("uq_finance_request_key", "request_key", unique=True), Index("ix_finance_service_order", "service_order_id"), Index("uq_finance_service_order_cost", "service_order_cost_id", unique=True))


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("finance_entries.id"))
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    cash_session_id: Mapped[int | None] = mapped_column(ForeignKey("cash_sessions.id"), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(20))
    reversal_of: Mapped[int | None] = mapped_column(ForeignKey("payments.id"), unique=True, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    posting_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(ZoneInfo('America/Manaus')).date())
    competence_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(ZoneInfo('America/Manaus')).date())
    principal_cents: Mapped[int] = mapped_column(Integer, default=0)
    interest_cents: Mapped[int] = mapped_column(Integer, default=0)
    fine_cents: Mapped[int] = mapped_column(Integer, default=0)
    discount_cents: Mapped[int] = mapped_column(Integer, default=0)
    reversal_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    request_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    request_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    __table_args__ = (Index('uq_payment_request_key','request_key',unique=True), Index('ix_payment_posting' , 'posting_date'), Index('ix_payment_competence', 'competence_date'))


class Attachment(Base):
    __tablename__ = 'attachments'
    id: Mapped[int] = mapped_column(primary_key=True)
    finance_entry_id: Mapped[int | None] = mapped_column(ForeignKey('finance_entries.id'), nullable=True)
    payment_id: Mapped[int | None] = mapped_column(ForeignKey('payments.id'), nullable=True)
    original_name: Mapped[str] = mapped_column(String(180))
    media_type: Mapped[str] = mapped_column(String(80))
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    __table_args__ = (CheckConstraint('(finance_entry_id IS NOT NULL) != (payment_id IS NOT NULL)'), Index('ix_attachment_entry','finance_entry_id'), Index('ix_attachment_payment','payment_id'))


class BankStatementImport(Base):
    __tablename__ = 'bank_statement_imports'
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey('accounts.id'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    original_name: Mapped[str] = mapped_column(String(180))
    sha256: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default='preview')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class BankStatementItem(Base):
    __tablename__ = 'bank_statement_items'
    id: Mapped[int] = mapped_column(primary_key=True)
    import_id: Mapped[int] = mapped_column(ForeignKey('bank_statement_imports.id'))
    fitid: Mapped[str] = mapped_column(String(180))
    posted_date: Mapped[date] = mapped_column(Date)
    amount_cents: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(180), default='')
    memo: Mapped[str] = mapped_column(String(500), default='')
    status: Mapped[str] = mapped_column(String(20), default='pending')
    matched_entry_id: Mapped[int | None] = mapped_column(ForeignKey('finance_entries.id'), nullable=True)
    payment_id: Mapped[int | None] = mapped_column(ForeignKey('payments.id'), nullable=True)
    duplicate_of_id: Mapped[int | None] = mapped_column(ForeignKey('bank_statement_items.id'), nullable=True)
    resolution_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    __table_args__ = (UniqueConstraint('import_id','fitid'), Index('ix_statement_match','import_id','status'))


class MonthlyBudget(Base):
    __tablename__ = 'monthly_budgets'
    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'))
    subcategory_id: Mapped[int | None] = mapped_column(ForeignKey('subcategories.id'), nullable=True)
    target_cents: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(String(300), default='')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    __table_args__ = (CheckConstraint('month BETWEEN 1 AND 12'), CheckConstraint('target_cents > 0'), Index('ix_budget_month','year','month','active'))


class ServiceOrder(Base):
    __tablename__ = "service_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    description: Mapped[str] = mapped_column(String(300))
    service_date: Mapped[date] = mapped_column(Date)
    negotiated_cents: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    notes: Mapped[str] = mapped_column(String(500), default="")
    cancel_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    __table_args__ = (
        CheckConstraint("negotiated_cents > 0"),
        CheckConstraint("status IN ('draft', 'scheduled', 'in_progress', 'completed', 'canceled')"),
        Index("ix_service_order_status_date", "status", "service_date"),
    )


class ServiceOrderCost(Base):
    __tablename__ = "service_order_costs"
    id: Mapped[int] = mapped_column(primary_key=True)
    service_order_id: Mapped[int] = mapped_column(ForeignKey("service_orders.id"))
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    kind: Mapped[str] = mapped_column(String(30))
    quantity_milli: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_amount_cents: Mapped[int] = mapped_column(Integer)
    details: Mapped[str] = mapped_column(String(300), default="")
    __table_args__ = (
        CheckConstraint("kind IN ('day_worker', 'subcontracted_freight')"),
        CheckConstraint("agreed_amount_cents > 0"),
        CheckConstraint("(kind = 'day_worker' AND quantity_milli > 0) OR (kind = 'subcontracted_freight' AND quantity_milli IS NULL)"),
        Index("ix_service_order_cost_order", "service_order_id"),
    )


class ServiceOrderTitleRun(Base):
    __tablename__ = "service_order_title_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    service_order_id: Mapped[int] = mapped_column(ForeignKey("service_orders.id"), unique=True)
    due_date: Mapped[date] = mapped_column(Date)
    competence_date: Mapped[date] = mapped_column(Date)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    entity: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
