import { describe, it, expect } from "vitest";
import { parseMoney } from "./moneyInput";
import { parseDecimal } from "./format";
describe("deterministic monetary input in integer cents", () => {
  it.each([
    "5000,01",
    "5000.01",
    "R$ 5000,01",
    "R$ 5000.01",
    "R$ 5.000,01",
    "R$ 5,000.01",
    "R$\u00a05.000,01",
    "  R$ 5 000,01  ",
    "R$\u202f5\u202f000.01",
  ])("preserves exactly 500001 cents: %s", (value) =>
    expect(parseMoney(value)).toBe(500001),
  );
  it.each([
    ["5000", 500000],
    ["R$ 5000", 500000],
    ["0", 0],
    ["0,01", 1],
    ["0001,2", 120],
    ["1.000.000", 100000000],
    ["1,000,000", 100000000],
    ["1 000", 100000],
    ["1000000000,00", 100_000_000_000],
    ["R$ 1,000,000,000.00", 100_000_000_000],
  ] as const)("accepts %s without rounding", (value, cents) =>
    expect(parseMoney(value)).toBe(cents),
  );
  it.each([
    "",
    "R$",
    "1.000",
    "1,000",
    "1.234",
    "1,234",
    "12.34,56",
    "12,34.56",
    "1.00.000",
    "1,,00",
    "1.000,001",
    "1,000.001",
    "0,001",
    "1e3",
    "NaN",
    "Infinity",
    "+10",
    "5000 R$",
    "R$ R$ 5",
    "1 2",
    "1 00,00",
    "1 000.000,00",
    "5,0 1",
    "5\n000",
    "5\t000",
    "--5",
    "R$ - -5",
    "-R$ -5",
    "1,",
    "1.",
    ".01",
    ",01",
  ])("rejects invalid or ambiguous input %s", (value) =>
    expect(() => parseMoney(value)).toThrow(),
  );
  it.each(["-1", "-R$ 5.000,01", "R$ -5,000.01"])(
    "rejects negative money unless the field permits it: %s",
    (value) => expect(() => parseMoney(value)).toThrow("não negativo"),
  );
  it.each(["-5000,01", "-R$ 5.000,01", "R$ -5,000.01"])(
    "permits exactly -500001 cents only for signed balances: %s",
    (value) => expect(parseMoney(value, { allowNegative: true })).toBe(-500001),
  );
  it.each([
    "1000000000,01",
    "R$ 1,000,000,000.01",
    "9999999999999999999999",
    "9".repeat(129),
  ])("preserves the monetary ceiling: %s", (value) =>
    expect(() => parseMoney(value)).toThrow("limite"),
  );
  it("keeps quantity and percentage parsing separate", () => {
    expect(parseDecimal("0,125", 3)).toBe(125);
    expect(parseDecimal("2,50", 2)).toBe(250);
    expect(() => parseDecimal("R$ 2,50", 2)).toThrow();
    expect(() => parseDecimal("1.000,00", 3)).toThrow();
  });
});
