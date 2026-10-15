import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SilexDatePicker } from "./SilexDatePicker";

describe("Brazilian date editor replaces the temporary native-date legend", () => {
  it.each(["2026-01-10", "2026-10-01", "2024-02-29", "2026-12-31", ""])("keeps ISO %s and renders day/month/year segments", iso => {
    const html = renderToStaticMarkup(createElement(SilexDatePicker, { label: "De", value: iso, onChange: () => {}, required: true, min: "2024-01-01", max: "2026-12-31" }));
    expect(html).toContain('data-required="true"');
    expect(html).toContain(`value="${iso}"`);
    const parts = [...html.matchAll(/data-type="(day|month|year)"/g)].map(match => match[1]);
    expect(parts).toEqual(["day", "month", "year"]);
    expect(html).toContain('class="silex-date-trigger"');
    expect(html).not.toContain('class="ledger-date-caption"');
  });
});
