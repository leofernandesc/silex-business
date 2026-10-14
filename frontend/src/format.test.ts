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
});
