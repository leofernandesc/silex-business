import { it, expect } from "vitest";
import { dreReadableCsv } from "./drePresentation";
it("commercial CSV whitelists financial data and never serializes audit content", () => {
  const report = {
    start: "2026-11-01",
    end: "2026-11-30",
    mapping_version: 91,
    decision_version: 72,
    cancellation_version: 53,
    lines: [
      {
        code: "RB",
        coverage_status: "partial",
        known_amount_cents: 500001,
        final_amount_cents: null,
      },
      {
        code: "LL",
        coverage_status: "unavailable",
        known_amount_cents: null,
        final_amount_cents: null,
      },
    ],
    facts: [
      {
        key: "finance_entry:1:principal",
        dre_line_code: "RB",
        economic_date: "2026-11-09",
        amount_cents: 500001,
      },
    ],
    excluded: [
      { key: "audit-only-key", amount_cents: 10, reason: "PRIVATE_REASON" },
    ],
    issues: [
      { key: "service_order:3:revenue", codes: ["service_not_completed"] },
    ],
    margins: { LL: { value: null, reason: "PRIVATE_REASON" } },
  };
  const before = JSON.stringify(report),
    csv = dreReadableCsv(report);
  for (const forbidden of [
    "Versão",
    "Pendências",
    "Orientação",
    "Identificador",
    "finance_entry:",
    "service_order:",
    "audit-only-key",
    "PRIVATE_REASON",
  ])
    expect(csv).not.toContain(forbidden);
  expect(csv).toContain("5.000,01");
  expect(csv).toContain("Resultado parcial");
  expect(csv).toContain("Indisponível");
  expect(JSON.stringify(report)).toBe(before);
});

it('keeps real zero, negative amounts and complete margins without exporting source evidence',()=>{
 const report:Parameters<typeof dreReadableCsv>[0]={start:'2000-02-01',end:'2000-02-29',mapping_version:1,decision_version:1,cancellation_version:1,lines:[{code:'RB',coverage_status:'complete',known_amount_cents:0,final_amount_cents:0},{code:'LL',coverage_status:'complete',known_amount_cents:-10001,final_amount_cents:-10001}],facts:[],issues:[],excluded:[],margins:{LL:{value:'-10.25',reason:'SECRET_ADMIN_ONLY'}}};
 const csv=dreReadableCsv(report);expect(csv).toContain('R$ 0,00');expect(csv).toContain('-R$ 100,01');expect(csv).toContain('-10,25%');expect(csv).toContain('Demonstrativo completo');expect(csv).not.toContain('SECRET_ADMIN_ONLY');expect(csv).toContain('29/02/2000');
});
