import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LedgerDateField } from "./ledgerPresentation";

describe("Ledger native dates with explicit Brazilian description", () => {
  it.each([
    ["2026-01-10", "10/01/2026"],
    ["2026-10-01", "01/10/2026"],
    ["2024-02-29", "29/02/2024"],
    ["2026-12-31", "31/12/2026"],
    ["", "Formato brasileiro: dd/mm/aaaa"],
  ])("describes %s without changing its ISO value", (iso, display) => {
    const html = renderToStaticMarkup(
      createElement(LedgerDateField, {
        label: "De",
        value: iso,
        children: createElement("input", {
          type: "date",
          value: iso,
          onChange: () => {},
          required: true,
          min: "2024-01-01",
          max: "2026-12-31",
        }),
      }),
    );
    expect(html).toContain(display);
    expect(html).toContain('type="date"');
    expect(html).toContain(`value="${iso}"`);
    expect(html).toContain('min="2024-01-01"');
    expect(html).toContain('max="2026-12-31"');
    expect(html).toContain('required=""');
    expect(html).toContain("aria-describedby=");
    expect(html).toContain('lang="pt-BR"');
    expect((html.match(/<input/g) || []).length).toBe(1);
    expect(html).not.toContain('type="text"');
  });
});
