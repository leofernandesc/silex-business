import { describe, it, expect } from "vitest";
import { periodRange } from "./financeDates";
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
