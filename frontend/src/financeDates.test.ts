import { afterEach, describe, it, expect, vi } from "vitest";
import { periodRange, titlePeriodRange } from "./financeDates";
describe("períodos do livro caixa", () => {
  it("hoje e semana começam no calendário informado de Manaus", () => {
    expect(periodRange("Hoje", "2026-10-13")).toEqual({
      start: "2026-10-13",
      end: "2026-10-13",
    });
    expect(periodRange("Semana", "2026-10-11")).toEqual({
      start: "2026-10-05",
      end: "2026-10-11",
    });
  });
  it("mês anterior atravessa o ano e mês cobre ano bissexto", () => {
    expect(periodRange("Mês anterior", "2026-01-13")).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
    expect(periodRange("Mês", "2024-02-13")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
  });
  it("ano e todo o histórico", () => {
    expect(periodRange("Ano", "2026-10-13")).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
    expect(periodRange("Tudo")).toEqual({ start: "", end: "" });
  });
});

// UTC instants are test clocks only; the preset implementation handles civil CalendarDate values.
describe("title presets use the ERP calendar, independently of the host timezone", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  const boundaries = [
    {
      instant: "2026-11-01T02:30:00Z",
      day: "2026-10-31",
      monday: "2026-10-26",
      sunday: "2026-11-01",
      monthStart: "2026-10-01",
      monthEnd: "2026-10-31",
      previousStart: "2026-09-01",
      previousEnd: "2026-09-30",
    },
    {
      instant: "2027-01-01T03:59:59Z",
      day: "2026-12-31",
      monday: "2026-12-28",
      sunday: "2027-01-03",
      monthStart: "2026-12-01",
      monthEnd: "2026-12-31",
      previousStart: "2026-11-01",
      previousEnd: "2026-11-30",
    },
    {
      instant: "2027-01-01T04:00:00Z",
      day: "2027-01-01",
      monday: "2026-12-28",
      sunday: "2027-01-03",
      monthStart: "2027-01-01",
      monthEnd: "2027-01-31",
      previousStart: "2026-12-01",
      previousEnd: "2026-12-31",
    },
    {
      instant: "2024-03-01T03:59:59Z",
      day: "2024-02-29",
      monday: "2024-02-26",
      sunday: "2024-03-03",
      monthStart: "2024-02-01",
      monthEnd: "2024-02-29",
      previousStart: "2024-01-01",
      previousEnd: "2024-01-31",
    },
    {
      instant: "2024-03-01T04:00:00Z",
      day: "2024-03-01",
      monday: "2024-02-26",
      sunday: "2024-03-03",
      monthStart: "2024-03-01",
      monthEnd: "2024-03-31",
      previousStart: "2024-02-01",
      previousEnd: "2024-02-29",
    },
  ];
  for (const zone of [
    "UTC",
    "America/Sao_Paulo",
    "Asia/Tokyo",
    "America/Los_Angeles",
  ]) {
    it.each(boundaries)(`${zone}: $instant uses Manaus civil day $day`, (b) => {
      vi.stubEnv("TZ", zone);
      vi.useFakeTimers();
      vi.setSystemTime(new Date(b.instant));
      expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
      expect(titlePeriodRange("today")).toEqual({ start: b.day, end: b.day });
      expect(titlePeriodRange("week")).toEqual({ start: b.monday, end: b.day });
      expect(titlePeriodRange("month")).toEqual({
        start: b.monthStart,
        end: b.day,
      });
      expect(titlePeriodRange("previous")).toEqual({
        start: b.previousStart,
        end: b.previousEnd,
      });
      expect(titlePeriodRange("year")).toEqual({
        start: b.day.slice(0, 4) + "-01-01",
        end: b.day,
      });
      // Ledger presets were already correct. Retain full calendar weeks/months/years there.
      expect(periodRange("Hoje")).toEqual({ start: b.day, end: b.day });
      expect(periodRange("Semana")).toEqual({ start: b.monday, end: b.sunday });
      expect(periodRange("Mês")).toEqual({
        start: b.monthStart,
        end: b.monthEnd,
      });
      expect(periodRange("Mês anterior")).toEqual({
        start: b.previousStart,
        end: b.previousEnd,
      });
      expect(periodRange("Ano")).toEqual({
        start: b.day.slice(0, 4) + "-01-01",
        end: b.day.slice(0, 4) + "-12-31",
      });
    });
  }
  it("preserves Monday/Sunday boundaries and validates civil references", () => {
    expect(titlePeriodRange("week", "2026-11-02")).toEqual({
      start: "2026-11-02",
      end: "2026-11-02",
    });
    expect(titlePeriodRange("week", "2026-11-01")).toEqual({
      start: "2026-10-26",
      end: "2026-11-01",
    });
    expect(() => titlePeriodRange("today", "2025-02-29")).toThrow(
      "Data de referência inválida",
    );
  });
});
