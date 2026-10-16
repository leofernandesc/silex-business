"""Human print presentation must not change ISO data, money or permissions."""
from html import escape

import pytest


def create_title(admin, due, *, direction="expense", amount=123456789):
    account = next(row for row in admin.get("/api/accounts").json() if row["kind"] == "bank")
    category_name = "Outras receitas" if direction == "income" else "Despesas operacionais"
    category = next(row for row in admin.get("/api/categories").json() if row["name"] == category_name)
    return admin.post("/api/finance", json={
        "description": "Documento fictício <teste> & conferência",
        "direction": direction, "amount_cents": amount,
        "account_id": account["id"], "category_id": category["id"],
        "due_date": due,
    })


@pytest.mark.parametrize("iso,shown", [
    ("2026-03-04", "04/03/2026"), ("2026-04-03", "03/04/2026"),
    ("2026-01-31", "31/01/2026"), ("2026-02-01", "01/02/2026"),
    ("2024-02-29", "29/02/2024"), ("2026-12-31", "31/12/2026"),
    ("2027-01-01", "01/01/2027"), ("0001-01-01", "01/01/0001"),
])
def test_print_civil_date_preserves_iso_and_csv(env, iso, shown):
    _, admin, _, _ = env
    created = create_title(admin, iso)
    assert created.status_code == 201, created.text
    entry = created.json()
    query = {"q": "Documento fictício", "direction": "expense", "search_field": "description"}
    before = admin.get("/api/finance", params=query).json()
    csv_before = admin.get("/api/reports/finance.csv", params=query).content
    result = admin.get("/api/finance/print", params=query)
    assert result.status_code == 200
    assert "<h1>Silex Business · Lançamentos financeiros</h1>" in result.text
    assert f"<td>{shown}</td>" in result.text
    assert f"<td>{entry['id']}</td>" in result.text
    assert escape(entry["description"]) in result.text
    assert "<td>Despesa</td>" in result.text and "<td>open</td>" in result.text
    assert "<td>R$ 1.234.567,89</td>" in result.text
    assert "Gestão" not in result.text
    assert admin.get("/api/finance", params=query).json() == before
    assert before["items"][0]["due_date"] == iso
    assert admin.get("/api/reports/finance.csv", params=query).content == csv_before
    assert iso.encode() in csv_before


@pytest.mark.parametrize("due", ["", None, "invalid", "2025-02-29", "2026-04-31"])
def test_print_does_not_relax_date_validation(env, due):
    _, admin, _, _ = env
    before = admin.get("/api/finance").json()
    assert create_title(admin, due).status_code == 422
    assert admin.get("/api/finance").json() == before


def test_print_direction_money_empty_and_authorization(env):
    _, admin, operator, anonymous = env
    expense = create_title(admin, "2026-03-04", amount=1).json()
    income = create_title(admin, "2026-12-31", direction="income", amount=12345).json()
    for direction, entry, label, amount in [
        ("expense", expense, "Despesa", "R$ 0,01"),
        ("income", income, "Receita", "R$ 123,45"),
    ]:
        printed = admin.get("/api/finance/print", params={"direction": direction}).text
        assert f"<td>{entry['id']}</td>" in printed
        assert f"<td>{label}</td>" in printed and f"<td>{amount}</td>" in printed
        other = income if direction == "expense" else expense
        assert f"<td>{other['id']}</td>" not in printed
    assert 'colspan="6">Nenhum título encontrado' in admin.get("/api/finance/print", params={"q": "ausente-fictício"}).text
    assert operator.get("/api/finance/print").status_code == 403
    assert anonymous.get("/api/finance/print").status_code == 401
