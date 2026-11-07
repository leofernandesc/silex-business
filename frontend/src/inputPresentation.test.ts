import { describe, expect, it } from "vitest";
import {
  compactDocument,
  documentPattern,
  formatDocument,
  formatPostalCode,
} from "./inputPresentation";

describe("Brazilian registration presentation", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["0123", "012.3"],
    ["0123456", "012.345.6"],
    ["01234567890", "012.345.678-90"],
    ["012345678901", "01.234.567/8901"],
    ["01234567890123", "01.234.567/8901-23"],
    ["12abc34501de35", "12.ABC.345/01DE-35"],
  ])("formats %s progressively without losing characters", (raw, expected) => {
    expect(formatDocument(raw)).toBe(expected);
    expect(compactDocument(formatDocument(raw))).toBe(compactDocument(raw));
  });
  it.each(["12345678901!", "123456789012345", "CPF inválido"])(
    "does not silently truncate or accept %s",
    (raw) => {
      expect(formatDocument(raw)).toBe(raw);
      expect(new RegExp(`^${documentPattern}$`).test(formatDocument(raw))).toBe(
        false,
      );
    },
  );
  it("accepts completed shapes and keeps partial documents invalid", () => {
    const pattern = new RegExp(`^${documentPattern}$`);
    for (const raw of ["01234567890", "01234567890123", "12ABC34501DE35"])
      expect(pattern.test(formatDocument(raw))).toBe(true);
    for (const raw of ["0123456", "123456789012", "12ABC34501DEAA"])
      expect(pattern.test(formatDocument(raw))).toBe(false);
  });
  it("formats CEP without changing legacy nonnumeric content", () => {
    expect(formatPostalCode("69000123")).toBe("69000-123");
    expect(formatPostalCode("69000-123")).toBe("69000-123");
    expect(formatPostalCode("690001")).toBe("69000-1");
    expect(formatPostalCode("antigo")).toBe("antigo");
    expect(formatPostalCode("123456789")).toBe("123456789");
  });
});
