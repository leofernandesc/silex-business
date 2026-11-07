"""Registration regressions with synthetic documents (no fiscal identity assertion)."""
import pytest
from pydantic import ValidationError

from app.schemas import CompanySettingsInput, CustomerInput, SupplierInput


@pytest.mark.parametrize("model,field", [(CustomerInput, "document"), (SupplierInput, "document"), (CompanySettingsInput, "company_document")])
@pytest.mark.parametrize("given,expected", [
    ("012.345.678-90", "01234567890"),
    ("01.234.567/8901-23", "01234567890123"),
    ("12.abc.345/01DE-35", "12ABC34501DE35"),
])
def test_tax_document_preserves_digits_and_cnpj_letters(model, field, given, expected):
    args = {field: given, **({"name": "Cadastro fictício"} if field == "document" else {})}
    assert getattr(model(**args), field) == expected


@pytest.mark.parametrize("model,field", [(CustomerInput, "document"), (SupplierInput, "document"), (CompanySettingsInput, "company_document")])
@pytest.mark.parametrize("bad", ["0123456789", "123456789012345", "12345678901!", "12ABC34501DEAA"])
def test_document_does_not_silently_discard_invalid_characters(model, field, bad):
    with pytest.raises(ValidationError):
        model(**{field: bad, **({"name": "Cadastro fictício"} if field == "document" else {})})


@pytest.mark.parametrize("kind", ["supplier", "day_worker", "subcontracted_freight"])
def test_partner_crud_rejects_customer_only_metadata(env, kind):
    _, admin, operator, _ = env
    payload = {"name": "Parceiro fictício", "kind": kind, "phone": "(92) 90000-0000", "document": "12.ABC.345/01DE-35"}
    created = admin.post("/api/suppliers", json=payload)
    assert created.status_code == 201, created.text
    row = created.json()
    assert "service_details" not in row
    assert row["document"] == "12ABC34501DE35"
    path = f"/api/suppliers/{row['id']}"
    changed = admin.put(path, json={**payload, "contact_name": "Contato fictício"})
    assert changed.status_code == 200, changed.text
    for value in (None, {}, {"collection_address": {"city": "Cidade fictícia"}}):
        assert admin.post("/api/suppliers", json={**payload, "service_details": value}).status_code == 422
        assert admin.put(path, json={**payload, "service_details": value}).status_code == 422
    assert operator.post("/api/suppliers", json=payload).status_code == 403
    items = admin.get("/api/suppliers", params={"kind": kind}).json()["items"]
    saved = next(item for item in items if item["id"] == row["id"])
    assert saved == changed.json()
    assert "service_details" not in saved


@pytest.mark.parametrize("endpoint", ["customers", "suppliers"])
def test_formatted_document_search_and_optional_clear(env, endpoint):
    _, admin, _, _ = env
    payload = {"name": "Documento fictício", "document": "01.234.567/8901-23"}
    response = admin.post(f"/api/{endpoint}", json=payload)
    assert response.status_code == 201, response.text
    row = response.json()
    for query in ("01.234.567/8901-23", "01.234", "01234567890123"):
        for field in ("document", "all"):
            found = admin.get(f"/api/{endpoint}", params={"q": query, "search_field": field}).json()
            assert any(item["id"] == row["id"] for item in found["items"])
    # Search by name still uses the original query; no field value is rewritten.
    assert admin.get(f"/api/{endpoint}", params={"q": payload["name"], "search_field": "name"}).json()["total"] == 1
    if endpoint == "customers":
        csv = admin.get("/api/reports/customers.csv", params={"q": payload["document"], "search_field": "document"})
        assert csv.status_code == 200 and "01234567890123" in csv.text
    cleared = admin.put(f"/api/{endpoint}/{row['id']}", json={**payload, "document": None})
    assert cleared.status_code == 200 and cleared.json()["document"] is None
