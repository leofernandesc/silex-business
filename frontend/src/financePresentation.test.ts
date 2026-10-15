import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FinancePage } from "./finance";

describe.each([
  ["expense", "Contas a Pagar", "Nova despesa"],
  ["income", "Contas a Receber", "Nova receita"],
])(
  "%s presentation preserves the existing financial screen",
  (direction, title, action) => {
    const html = () =>
      renderToStaticMarkup(
        createElement(FinancePage, { initialDirection: direction }),
      );
    it("keeps the title, fixed direction and appropriate creation hierarchy", () => {
      const rendered = html();
      expect(rendered).toContain(title);
      expect(rendered).toContain(action);
      expect(rendered).toContain(
        direction === "expense"
          ? 'class="accounts-new-expense"'
          : 'class="primary"',
      );
      expect(rendered).toMatch(/<select disabled="">/);
      expect(rendered).not.toContain("Editar título");
    });
    it("preserves seven columns, pagination and all status filters", () => {
      const rendered = html();
      expect((rendered.match(/<th>/g) || []).length).toBe(7);
      for (const label of [
        "Histórico",
        "Vencimento",
        "Valor",
        "Ações",
        "Parciais",
        "Baixados",
        "Vencidos",
        "Cancelados",
        "Itens por página",
      ])
        expect(rendered).toContain(label);
      expect(rendered).toContain('value="100"');
    });
    it("uses Brazilian date segments and preserves ISO in the library autofill proxies", () => {
      const rendered = html();
      expect((rendered.match(/type="date"/g) || []).length).toBe(2);
      for (const part of ["day", "month", "year"]) expect((rendered.match(new RegExp(`data-type="${part}"`, "g")) || []).length).toBe(2);
      expect(rendered).toContain('data-testid="hidden-dateinput-container"');
      expect(rendered).not.toContain('class="ledger-date-caption"');
      expect(rendered).toMatch(/value="\d{4}-\d{2}-\d{2}"/);
    });
  },
);
