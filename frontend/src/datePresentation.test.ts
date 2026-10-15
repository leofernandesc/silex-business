import { describe, expect, it } from "vitest";
import { dateOnly, dateTime } from "./format";
import { periodRange } from "./financeDates";
import { reportGroupDate } from "./reportDates";

describe("SB-06D.1: civil dates and display boundaries", () => {
  it.each([
    ["2026-10-15", "15/10/2026"], ["2026-01-01", "01/01/2026"],
    ["2026-12-31", "31/12/2026"], ["2024-02-29", "29/02/2024"],
    ["2000-02-29", "29/02/2000"], ["2026-04-30", "30/04/2026"],
  ])("displays %s without timezone conversion", (iso, shown) => {
    expect(dateOnly(iso)).toBe(shown);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it.each([null, "", "invalid", "2026-02-29", "1900-02-29", "2026-04-31",
    "2026-00-01", "2026-13-01", "0000-01-01", "2026-01-00",
    "2026-1-1", "15/10/2026", "2026-10-15T00:00:00Z"])(
    "does not invent a civil date for %s", (value) => expect(dateOnly(value)).toBe("—"),
  );
  it("formats instants using the existing Manaus timezone, separately from civil dates", () => {
    expect(dateTime("2026-01-01T02:30:00Z")).toBe("31/12/2025, 22:30");
    expect(dateTime("2026-01-01T04:00:00Z")).toBe("01/01/2026, 00:00");
    expect(dateTime("2025-12-31T22:30:00-04:00")).toBe(dateTime("2026-01-01T02:30:00Z"));
    expect(dateTime("invalid")).toBe("—");
    expect(dateTime(null)).toBe("—");
  });
  it("does not change ISO ordering or interval boundaries", () => {
    const values = ["2026-01-01", "2024-02-29", "2025-12-31"];
    const before = JSON.stringify(values);
    values.forEach(dateOnly);
    expect(JSON.stringify(values)).toBe(before);
    expect([...values].sort()).toEqual(["2024-02-29", "2025-12-31", "2026-01-01"]);
    expect(periodRange("Mês", "2024-02-29")).toEqual({start:"2024-02-01",end:"2024-02-29"});
    expect(periodRange("Mês anterior", "2026-01-01")).toEqual({start:"2025-12-01",end:"2025-12-31"});
  });
  it.each(["cash-monthly", "charges-monthly", "discounts-monthly"])(
    "reuses the month display for %s", report => expect(reportGroupDate(report, "2026-10")).toBe("10/2026"),
  );
  it("preserves category names and result group text", () => {
    expect(reportGroupDate("income-category", "2026-10")).toBe("2026-10");
    expect(reportGroupDate("result-monthly", "Operacional: Grupo · exemplo · 2026-10"))
      .toBe("Operacional: Grupo · exemplo · 10/2026");
    expect(reportGroupDate("cash-monthly", "not a month")).toBe("not a month");
  });
});
