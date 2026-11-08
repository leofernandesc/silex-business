import { civilDate } from "./civilDates";
import type { Account, Entry, Ledger, Page } from "./types";
export type FinanceDash = {
  start: string;
  end: string;
  income_cents: number;
  expense_cents: number;
  net_cents: number;
  movement_count: number;
  accounts: Account[];
  receivable_open_cents: number;
  payable_open_cents: number;
  receivable_overdue_cents: number;
  payable_overdue_cents: number;
  monthly: {
    month: string;
    income_cents: number;
    expense_cents: number;
    net_cents: number;
  }[];
  result_groups: {
    classification: string;
    group: string;
    direction: string;
    income_cents: number;
    expense_cents: number;
  }[];
  budget_month: string;
};
export type DuePage = Page<Entry> & {
  summary: { due_7_days_cents: number; as_of_date: string };
};
function object(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function ints(v: Record<string, unknown>, keys: string[]) {
  return keys.every((k) => Number.isSafeInteger(v[k]));
}
export function validDashboard(v: unknown): v is FinanceDash {
  return (
    object(v) &&
    ints(v, [
      "income_cents",
      "expense_cents",
      "net_cents",
      "movement_count",
      "receivable_open_cents",
      "payable_open_cents",
      "receivable_overdue_cents",
      "payable_overdue_cents",
    ]) &&
    Array.isArray(v.accounts) &&
    v.accounts.every(
      (a) =>
        object(a) &&
        ints(a, ["id", "balance_cents", "opening_cents"]) &&
        typeof a.name === "string",
    ) &&
    Array.isArray(v.monthly) &&
    v.monthly.every(
      (m) =>
        object(m) &&
        typeof m.month === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(m.month) &&
        ints(m, ["income_cents", "expense_cents"]),
    ) &&
    Array.isArray(v.result_groups) &&
    v.result_groups.every(
      (g) =>
        object(g) &&
        ints(g, ["income_cents", "expense_cents"]) &&
        typeof g.group === "string" &&
        typeof g.classification === "string",
    )
  );
}
export function validDuePage(v: unknown): v is DuePage {
  return (
    object(v) &&
    object(v.summary) &&
    ints(v.summary, ["due_7_days_cents"]) &&
    typeof v.summary.as_of_date === "string" &&
    !!civilDate(v.summary.as_of_date)
  );
}
function validCivilField(value: unknown): boolean {
  return typeof value === "string" && !!civilDate(value);
}
function validTitleRow(value: unknown): boolean {
  return (
    object(value) &&
    ints(value, [
      "id",
      "amount_cents",
      "paid_principal_cents",
      "remaining_cents",
    ]) &&
    validCivilField(value.due_date) &&
    typeof value.description === "string" &&
    ["income", "expense"].includes(String(value.direction))
  );
}
function validMovementRow(value: unknown): boolean {
  return (
    object(value) &&
    ints(value, ["id", "entry_id", "amount_cents"]) &&
    validCivilField(value.posting_date) &&
    typeof value.description === "string" &&
    ["income", "expense"].includes(String(value.direction))
  );
}
export function validTitlePage(v: unknown): v is Page<Entry> & {
  summary: {
    pending_cents: number;
    overdue_cents: number;
    due_7_days_cents: number;
    count: number;
  };
} {
  return (
    object(v) &&
    Array.isArray(v.items) &&
    v.items.every(validTitleRow) &&
    object(v.summary) &&
    ints(v.summary, [
      "pending_cents",
      "overdue_cents",
      "due_7_days_cents",
      "count",
    ]) &&
    ints(v, ["total", "page", "page_size"])
  );
}
export function validMovementPage(v: unknown): v is Ledger {
  return (
    object(v) &&
    Array.isArray(v.items) &&
    v.items.every(validMovementRow) &&
    object(v.summary) &&
    ints(v.summary, ["income_cents", "expense_cents", "net_cents", "count"]) &&
    ints(v, ["total", "page", "page_size"])
  );
}
