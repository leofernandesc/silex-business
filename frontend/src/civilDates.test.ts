import { describe, expect, it } from "vitest";
import { civilDate, civilISO, monthISO } from "./civilDates";

describe("civil date adapters preserve ISO without timestamps", () => {
  it.each(["2026-03-04", "2026-04-03", "2024-02-29", "2026-12-31", "2027-01-01", "2026-02-01", "2026-02-28"])("roundtrips %s", iso => {
    const date = civilDate(iso)!;
    expect(date.toString()).toBe(iso);
    expect(date.calendar.identifier).toBe("gregory");
    expect(civilISO(date.year, date.month, date.day)).toBe(iso);
  });
  it.each(["", "2025-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-01-00", "04/03/2026", "2026-3-4", "2026-03-04T00:00:00Z"])("rejects %s instead of normalizing an invalid civil date", value => expect(civilDate(value)).toBeNull());
  it("validates raw calendar segments without clamping", () => {
    expect(civilISO(2025, 2, 29)).toBeNull();
    expect(civilISO(2024, 2, 29)).toBe("2024-02-29");
  });
});
describe("monthly competence remains YYYY-MM", () => {
  it.each([["2026", "3", "2026-03"], ["1", "12", "0001-12"], ["2300", "01", "2300-01"]])("accepts %s/%s without inventing a persisted day", (year, month, iso) => expect(monthISO(year, month)).toBe(iso));
  it.each([["", "03"], ["2026", ""], ["2026", "13"], ["0", "01"], ["2026.5", "03"]])("rejects incomplete/invalid %s-%s", (year, month) => expect(monthISO(year, month)).toBeNull());
});
