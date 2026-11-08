import { it, expect } from "vitest";
import {
  validDashboard,
  validDuePage,
  validTitlePage,
  validMovementPage,
} from "./financialData";
const dashboard = {
  income_cents: 0,
  expense_cents: 0,
  net_cents: 0,
  movement_count: 0,
  receivable_open_cents: 0,
  payable_open_cents: 0,
  receivable_overdue_cents: 0,
  payable_overdue_cents: 0,
  accounts: [],
  monthly: [],
  result_groups: [],
};
it("accepts real zero, negative account balances and integer cents", () => {
  expect(validDashboard(dashboard)).toBe(true);
  expect(
    validDashboard({
      ...dashboard,
      accounts: [
        {
          id: 1,
          name: "Conta fictícia",
          opening_cents: 0,
          balance_cents: -101,
        },
      ],
    }),
  ).toBe(true);
  expect(
    validDuePage({
      summary: { due_7_days_cents: 0, as_of_date: "2024-02-29" },
    }),
  ).toBe(true);
  expect(
    validTitlePage({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      summary: {
        pending_cents: 0,
        overdue_cents: 0,
        due_7_days_cents: 0,
        count: 0,
      },
    }),
  ).toBe(true);
  expect(
    validMovementPage({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      summary: { income_cents: 0, expense_cents: 0, net_cents: 0, count: 0 },
    }),
  ).toBe(true);
});
it.each([
  null,
  {},
  { ...dashboard, income_cents: "0" },
  { ...dashboard, income_cents: 1.1 },
  { ...dashboard, expense_cents: NaN },
  { ...dashboard, net_cents: Number.MAX_SAFE_INTEGER + 1 },
])("rejects unavailable/malformed response instead of inventing zero", (v) =>
  expect(validDashboard(v)).toBe(false),
);
it("does not build a due date window from invalid or absent server reference", () => {
  expect(
    validDuePage({
      summary: { due_7_days_cents: 100, as_of_date: "2025-02-29" },
    }),
  ).toBe(false);
  expect(validDuePage({ summary: { due_7_days_cents: 100 } })).toBe(false);
});

it("rejects malformed row amounts instead of formatting them as zero", () => {
  const envelope = {
    items: [
      {
        id: 1,
        description: "Registro fictício",
        direction: "income",
        due_date: "2026-11-07",
        posting_date: "2026-11-07",
        entry_id: 1,
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
  };
  expect(
    validTitlePage({
      ...envelope,
      summary: {
        pending_cents: 0,
        overdue_cents: 0,
        due_7_days_cents: 0,
        count: 1,
      },
    }),
  ).toBe(false);
  expect(
    validMovementPage({
      ...envelope,
      summary: { income_cents: 0, expense_cents: 0, net_cents: 0, count: 1 },
    }),
  ).toBe(false);
});
