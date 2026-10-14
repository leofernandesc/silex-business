from datetime import date
from typing import Annotated, Literal
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Money = Annotated[int, Field(strict=True, ge=0, le=100_000_000_000)]
Amount = Annotated[int, Field(strict=True, gt=0, le=100_000_000_000)]
Quantity = Annotated[int, Field(strict=True, gt=0, le=1_000_000_000)]
Name = Annotated[str, Field(min_length=1, max_length=180)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    username: Annotated[str, Field(min_length=1, max_length=80)]
    password: Annotated[str, Field(min_length=1, max_length=200)]
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class UserInput(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    name: Annotated[str, Field(min_length=1, max_length=120)]
    username: Annotated[str, Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")]
    password: Annotated[str, Field(min_length=10, max_length=200)]
    role: Literal["admin", "operator"] = "operator"

    @field_validator("name", "username", mode="before")
    @classmethod
    def trim_names(cls, value):
        return value.strip() if isinstance(value, str) else value


class CompanySettingsInput(Input):
    brand_name: Annotated[str, Field(min_length=1, max_length=50)] = "Gestão"
    company_name: Annotated[str, Field(max_length=150)] = ""
    company_document: Annotated[str, Field(max_length=20)] = ""
    phone: Annotated[str, Field(max_length=40)] = ""
    email: Annotated[str, Field(max_length=180)] = ""
    address: Annotated[str, Field(max_length=300)] = ""

    @field_validator("company_document")
    @classmethod
    def normalize_company_document(cls, value):
        if not value:
            return ""
        normalized = "".join(c for c in value if c.isdigit())
        if len(normalized) not in (11, 14):
            raise ValueError("Documento da empresa deve conter 11 ou 14 dígitos")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_company_email(cls, value):
        return value.lower()


class CustomerInput(Input):
    name: Annotated[str, Field(min_length=1, max_length=150)]
    document: Annotated[str | None, Field(max_length=20)] = None
    email: Annotated[str, Field(max_length=180)] = ""
    phone: Annotated[str, Field(max_length=40)] = ""
    contact_name: Annotated[str, Field(max_length=120)] = ""
    address: Annotated[str, Field(max_length=300)] = ""
    postal_code: Annotated[str, Field(max_length=9)] = ""
    street: Annotated[str, Field(max_length=180)] = ""
    address_number: Annotated[str, Field(max_length=30)] = ""
    complement: Annotated[str, Field(max_length=100)] = ""
    neighborhood: Annotated[str, Field(max_length=100)] = ""
    city: Annotated[str, Field(max_length=100)] = ""
    state: Annotated[str, Field(max_length=2)] = ""
    active: bool = True

    @field_validator("document")
    @classmethod
    def normalize_document(cls, value):
        if not value:
            return None
        value = "".join(c for c in value if c.isdigit())
        if len(value) not in (11, 14):
            raise ValueError("Documento deve ter 11 ou 14 dígitos")
        return value


class ProductInput(Input):
    code: Annotated[str, Field(min_length=1, max_length=40)]
    description: Name
    kind: Literal["product", "service"] = "product"
    group_name: Annotated[str, Field(max_length=100)] = ""
    unit: Annotated[str, Field(min_length=1, max_length=12)] = "UN"
    barcode: Annotated[str | None, Field(max_length=60)] = None
    price_cents: Money
    active: bool = True

    @field_validator("barcode")
    @classmethod
    def empty_barcode(cls, value):
        return value or None


class StockInput(Input):
    product_id: int
    kind: Literal["opening", "in", "out", "inventory"]
    quantity_milli: Money
    reason: Annotated[str, Field(min_length=3, max_length=300)]


class CashOpen(Input):
    opening_cents: Money


class CashClose(Input):
    counted_cents: Money


class ItemInput(Input):
    product_id: int
    quantity_milli: Quantity
    unit_price_cents: Money


class SaleInput(Input):
    customer_id: int | None = None
    discount_cents: Money = 0
    items: Annotated[list[ItemInput], Field(min_length=1, max_length=200)]


class Finalize(Input):
    method: Literal["cash", "pix", "card", "credit"]
    due_date: date | None = None


class Reason(Input):
    reason: Annotated[str, Field(min_length=3, max_length=300)]


class FinanceInput(Input):
    description: Name
    direction: Literal["income", "expense"]
    amount_cents: Amount
    account_id: int
    category_id: int
    customer_id: int | None = None
    supplier_id: int | None = None
    subcategory_id: int | None = None
    due_date: date
    competence_date: date | None = None
    document: Annotated[str, Field(max_length=100)] = ''
    recurrence_count: Annotated[int, Field(strict=True, ge=1, le=60)] = 1
    recurrence_frequency: Literal['daily','weekly','monthly','yearly'] = 'monthly'

    @model_validator(mode='after')
    def party_matches_direction(self):
        if self.direction == 'income' and self.supplier_id is not None:
            raise ValueError('Receita recebe cliente, não fornecedor')
        if self.direction == 'expense' and self.customer_id is not None:
            raise ValueError('Despesa recebe fornecedor, não cliente')
        return self


class Settle(Input):
    method: Literal["cash", "pix", "card", "ofx"]
    account_id: int
    principal_cents: Amount | None = None
    interest_cents: Money = 0
    fine_cents: Money = 0
    discount_cents: Money = 0
    posting_date: date | None = None
    request_key: Annotated[str | None, Field(min_length=16, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')] = None

    @model_validator(mode='after')
    def idempotency_key_for_installments(self):
        if (self.principal_cents is not None or self.interest_cents or self.fine_cents or self.discount_cents) and not self.request_key:
            raise ValueError('Quitação parcial exige chave para evitar duplicação')
        return self


class PaymentReversal(Input):
    reason: Annotated[str, Field(min_length=3, max_length=300)]


class AttachmentInput(Input):
    filename: Annotated[str, Field(min_length=1, max_length=180)]
    content_type: Annotated[str, Field(min_length=1, max_length=100)]
    content_base64: Annotated[str, Field(min_length=4, max_length=7_000_000)]


class OfxConfirm(Input):
    entry_id: int | None = None
    create_title: bool = False
    category_id: int | None = None
    subcategory_id: int | None = None
    supplier_id: int | None = None
    customer_id: int | None = None
    principal_cents: Amount | None = None
    interest_cents: Money = 0
    fine_cents: Money = 0
    discount_cents: Money = 0
    ignore: bool = False
    reason: Annotated[str, Field(max_length=300)] = ''

    @model_validator(mode='after')
    def choose_one_action(self):
        actions = int(self.ignore) + int(self.create_title) + int(self.entry_id is not None)
        if actions != 1:
            raise ValueError('Escolha uma única ação para a linha OFX')
        if self.ignore and len(self.reason.strip()) < 3:
            raise ValueError('Informe um motivo para ignorar a linha OFX')
        if self.create_title and (self.category_id is None or self.subcategory_id is None):
            raise ValueError('Novo lançamento exige categoria e subcategoria')
        return self


class MonthlyBudgetInput(Input):
    year: Annotated[int, Field(strict=True, ge=2000, le=2200)]
    month: Annotated[int, Field(strict=True, ge=1, le=12)]
    category_id: int
    subcategory_id: int | None = None
    target_cents: Amount
    notes: Annotated[str, Field(max_length=300)] = ''
    active: bool = True



class AccountInput(Input):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    kind: Literal["cash", "bank"]
    opening_cents: Annotated[int, Field(strict=True, ge=-100_000_000_000, le=100_000_000_000)] = 0
    opening_date: date | None = None
    bank: Annotated[str, Field(max_length=100)] = ''
    branch: Annotated[str, Field(max_length=40)] = ''
    number: Annotated[str, Field(max_length=60)] = ''
    notes: Annotated[str, Field(max_length=500)] = ''
    interest_bps: Annotated[int, Field(strict=True, ge=0, le=10000)] = 0
    fine_bps: Annotated[int, Field(strict=True, ge=0, le=10000)] = 0
    active: bool = True


class CategoryInput(Input):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    direction: Literal['income', 'expense', 'both'] = 'both'
    classification: Literal['operating', 'investment', 'financing'] = 'operating'
    result_group: Annotated[str, Field(max_length=100)] = ''
    active: bool = True


class SubcategoryInput(Input):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    category_id: int
    affects_result: bool = True
    active: bool = True


class SupplierInput(CustomerInput):
    kind: Literal['supplier', 'day_worker', 'subcontracted_freight'] = 'supplier'
    pix_key_type: Literal['', 'cpf', 'cnpj', 'email', 'phone', 'random'] = ''
    pix_key: Annotated[str, Field(max_length=77)] = ''
    pix_holder: Annotated[str, Field(max_length=150)] = ''
    notes: Annotated[str, Field(max_length=500)] = ''
    default_rate_cents: Money | None = None

    @field_validator('document')
    @classmethod
    def normalize_document(cls, value):
        if not value:
            return None
        value = re.sub(r'[.\s/\-]', '', value).upper()
        if not re.fullmatch(r'(?:[0-9]{11}|[A-Z0-9]{12}[0-9]{2})', value):
            raise ValueError('Informe um CPF com 11 dígitos ou um CNPJ com 14 caracteres')
        return value

    @model_validator(mode='after')
    def normalize_pix(self):
        if not self.pix_key_type:
            if self.pix_key or self.pix_holder:
                raise ValueError('Selecione o tipo da chave PIX')
            return self
        if not self.pix_key:
            raise ValueError('Informe a chave PIX ou selecione Sem PIX cadastrado')
        key = self.pix_key
        if self.pix_key_type in ('cpf', 'cnpj'):
            key = re.sub(r'[.\s/\-]', '', key)
            if self.pix_key_type == 'cnpj':
                key = key.upper()
            pattern = r'[0-9]{11}' if self.pix_key_type == 'cpf' else r'[A-Z0-9]{14}'
        elif self.pix_key_type == 'email':
            key = key.lower()
            pattern = r"[a-z0-9.!#$'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*"
        elif self.pix_key_type == 'phone':
            key = re.sub(r'[\s().\-]', '', key)
            if not key.startswith('+'):
                # Número brasileiro sem DDI: acrescente +55; com DDI, mantenha.
                key = '+' + ('55' if len(key) in (10, 11) else '') + key
            pattern = r'\+[1-9][0-9]{1,14}'
        else:
            key = key.lower()
            pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        if not re.fullmatch(pattern, key):
            raise ValueError('Chave PIX em formato incompatível com o tipo selecionado')
        self.pix_key = key
        self.pix_holder = self.pix_holder or self.name
        return self


class ServiceOrderCostInput(Input):
    supplier_id: int
    kind: Literal['day_worker', 'subcontracted_freight']
    quantity_milli: Annotated[int | None, Field(strict=True, ge=1, le=1_000_000_000)] = None
    agreed_amount_cents: Amount
    details: Annotated[str, Field(max_length=300)] = ''

    @model_validator(mode='after')
    def quantity_matches_cost_kind(self):
        if self.kind == 'day_worker' and self.quantity_milli is None:
            raise ValueError('Informe a quantidade de diárias')
        if self.kind == 'subcontracted_freight' and self.quantity_milli is not None:
            raise ValueError('Frete é informado por valor contratado')
        return self


class ServiceOrderInput(Input):
    customer_id: int
    description: Annotated[str, Field(min_length=1, max_length=300)]
    service_date: date
    negotiated_cents: Amount
    status: Literal['draft', 'scheduled', 'in_progress', 'completed'] = 'draft'
    notes: Annotated[str, Field(max_length=500)] = ''
    costs: Annotated[list[ServiceOrderCostInput], Field(max_length=100)] = []


class ServiceOrderTitleGenerationInput(Input):
    account_id: int
    due_date: date
    competence_date: date


class ServiceOrderCancellationInput(Input):
    reason: Annotated[str, Field(min_length=3, max_length=300)]


class MovementInput(Input):
    description: Name
    direction: Literal['income', 'expense']
    amount_cents: Amount
    account_id: int
    subcategory_id: int
    supplier_id: int | None = None
    posting_date: date
    competence_date: date
    document: Annotated[str, Field(max_length=100)] = ''
    method: Literal['cash', 'pix', 'card'] = 'pix'
    request_key: Annotated[str, Field(min_length=16, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')]
