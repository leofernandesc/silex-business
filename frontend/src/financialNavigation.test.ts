import { describe, it, expect, vi, afterEach } from "vitest";
import {
  financialHref,
  readFinancialSearch,
  preserveFinancialSearch,
  syncFinancialSearch,
  temporalSummary,
} from "./financialNavigation";
afterEach(() => vi.unstubAllGlobals());
describe("financial links preserve explicit civil criteria, never authority", () => {
  it("preserves unbounded open + partially settled titles", () => {
    const href = financialHref("finance-payable", {
      direction: "expense",
      status: "pending",
      date_field: "due",
      start: "",
      end: "",
    });
    expect(
      readFinancialSearch("titles", href.split("?")[1].split("#")[0]),
    ).toEqual({
      direction: "expense",
      status: "pending",
      date_field: "due",
      start: "",
      end: "",
    });
    expect(href).toMatch(/#finance-payable$/);
  });
  it("keeps leap dates and distinguishes settlement registration from payment posting", () => {
    const filters = {
      date_field: "settled",
      start: "2024-02-29",
      end: "2026-12-31",
      status: "partial",
      direction: "income",
    };
    const href = financialHref("finance-receivable", filters);
    expect(
      readFinancialSearch("titles", href.split("?")[1].split("#")[0]),
    ).toEqual(filters);
    expect(temporalSummary(filters)).toContain("Quitação integral (registro)");
    expect(
      temporalSummary({
        date_field: "posting",
        start: "2026-03-04",
        end: "2026-04-03",
      }),
    ).toContain("04/03/2026 até 03/04/2026");
  });
  it.each([
    "f_context=titles&f_start=2025-02-29",
    "f_context=titles&f_start=2026-01-01&f_start=2026-02-01",
    "f_context=titles&f_status=approved",
    "f_context=titles&f_date_field=posting",
    "f_context=titles&f_direction=admin",
    "f_context=movements&f_start=2026-01-01",
    "f_context=titles&f_context=titles",
  ])("rejects malformed/cross-context criteria %s", (s) =>
    expect(readFinancialSearch("titles", s)).toEqual({}),
  );
  it("never transfers unknown query strings or external routes", () => {
    expect(
      readFinancialSearch(
        "titles",
        "f_context=titles&f_status=pending&role=admin&redirect=https://example.com",
      ),
    ).toEqual({ status: "pending" });
    expect(() => financialHref("https://example.com", {})).toThrow();
    vi.stubGlobal("location", {
      search: "?f_context=titles&f_status=pending",
      hash: "#finance-payable",
    });
    expect(preserveFinancialSearch("/app#home")).toBe("/app#home");
    expect(preserveFinancialSearch("/app#finance-payable")).toBe(
      "/app?f_context=titles&f_status=pending#finance-payable",
    );
    const replaceState = vi.fn();
    vi.stubGlobal("history", { state: { key: 1 }, replaceState });
    syncFinancialSearch("titles", { start: "", end: "", status: "pending" });
    expect(replaceState).toHaveBeenCalledWith(
      { key: 1 },
      "",
      expect.stringContaining("f_start=&f_end="),
    );
  });
});

it("dashboard rejects blank bounds instead of labeling a server-default period as unbounded", () => {
  expect(
    readFinancialSearch("dashboard", "f_context=dashboard&f_start=&f_end="),
  ).toEqual({});
  expect(
    readFinancialSearch("dashboard", "f_context=dashboard&f_direction=expense"),
  ).toEqual({});
  expect(
    readFinancialSearch(
      "dashboard",
      "f_context=dashboard&f_start=2026-01-01&f_end=2026-01-31",
    ),
  ).toEqual({ start: "2026-01-01", end: "2026-01-31" });
});

it.each(['#finance-reports','#finance-dre'])('preserves the economic period when resolving DRE address %s',hash=>{vi.stubGlobal('location',{hash,search:'?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31'});expect(preserveFinancialSearch('/app#finance-dre')).toBe('/app?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31#finance-dre');expect(preserveFinancialSearch('/app#finance-dashboard')).toBe('/app#finance-dashboard');vi.unstubAllGlobals()});
