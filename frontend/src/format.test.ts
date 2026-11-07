import { describe, it, expect } from "vitest";
import {
  parseDecimal,
  itemTotal,
  money,
  dateTime,
  dateOnly,
  quantity,
} from "./format";

describe("Precisão e apresentação", () => {
  it("converte reais sem aritmética de floats", () => {
    expect(parseDecimal("0,29", 2)).toBe(29);
    expect(parseDecimal("12.30", 2)).toBe(1230);
    expect(parseDecimal("001,2", 2)).toBe(120);
  });
  it("mantém quantidades em milésimos", () => {
    expect(parseDecimal("0,125", 3)).toBe(125);
    expect(parseDecimal("12", 3)).toBe(12000);
  });
  it.each(["1,234", "-1", "1e3", "1.000,00", "abc", "", "Infinity"])(
    "rejeita valor monetário inválido: %s",
    (v) => {
      expect(() => parseDecimal(v, 2)).toThrow();
    },
  );
  it("limita tamanho e não arredonda casas excedentes silenciosamente", () => {
    expect(() => parseDecimal("999999999999999", 2)).toThrow();
    expect(() => parseDecimal("0,1234", 3)).toThrow();
  });
  it("arredonda meio centavo para cima por linha", () => {
    expect(itemTotal(101, 500)).toBe(51);
    expect(itemTotal(10, 333)).toBe(3);
  });
  it("formata pt-BR com horário de Manaus", () => {
    expect(money(1234).replace(/\s/g, " ")).toBe("R$ 12,34");
    expect(quantity(1250)).toBe("1,25");
    expect(dateTime("2026-10-12T04:00:00+00:00")).toContain("00:00");
    expect(dateOnly("2026-10-12")).toBe("12/10/2026");
  });
  it("keeps the original Intl output for zero, cents, negative and large values", () => {
    for (const n of [0, 1, -1, 12345, -987654321, 100_000_000_000]) {
      expect(money(n)).toBe(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n / 100));
      expect(quantity(n)).toBe(new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(n / 1000));
    }
    for (const value of ["2024-02-29T03:59:59Z", "2027-01-01T04:00:00Z"]) {
      expect(dateTime(value)).toBe(new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short", timeStyle: "short", timeZone: "America/Manaus",
      }).format(new Date(value)));
    }
  });
});
