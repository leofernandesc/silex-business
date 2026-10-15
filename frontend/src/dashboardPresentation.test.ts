import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  financialMonthLabel,
  MonthlyValuesTable,
} from "./dashboardPresentation";

describe("financial dashboard presentation", () => {
  it.each([
    ["2026-01", "01/2026"],
    ["2025-12", "12/2025"],
    ["2000-02", "02/2000"],
    ["", ""],
  ])("formats the month %s without Date parsing", (input, expected) => {
    expect(financialMonthLabel(input)).toBe(expected);
  });

  it("keeps both series, cents, signs and input ordering in the textual alternative", () => {
    const months = [
      { month: "2025-12", income_cents: 123456789, expense_cents: 1 },
      { month: "2026-01", income_cents: -123456789, expense_cents: 0 },
    ];
    const before = JSON.stringify(months);
    const html = renderToStaticMarkup(
      createElement(MonthlyValuesTable, { months }),
    );
    expect(html).toContain("Consultar valores mensais em tabela");
    expect(html).toContain("12/2025");
    expect(html.indexOf("12/2025")).toBeLessThan(html.indexOf("01/2026"));
    expect(html).toContain("1.234.567,89");
    expect(html).toContain("-R$");
    expect(html).toContain("0,01");
    expect(html.match(/<th>/g)).toHaveLength(3);
    expect(JSON.stringify(months)).toBe(before);
  });

  it("uses the existing empty state without manufacturing monthly data", () => {
    const html = renderToStaticMarkup(
      createElement(MonthlyValuesTable, { months: [] }),
    );
    expect(html).toContain("Nenhum registro encontrado");
    expect(html).not.toContain("01/2026");
  });
});
