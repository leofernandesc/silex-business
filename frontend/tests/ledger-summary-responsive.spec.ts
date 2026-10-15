import { test, expect, type Page } from "@playwright/test";

async function useSyntheticSummary(page: Page) {
  await page.addInitScript(() => {
    const request = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await request(input, init);
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.href,
      );
      if (url.pathname !== "/api/finance/movements" || !response.ok) {
        return response;
      }
      const payload = await response.clone().json();
      payload.summary = {
        income_cents: 123456789,
        expense_cents: 246913578,
        net_cents: -123456789,
        count: 987654,
      };
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(JSON.stringify(payload), {
        status: response.status,
        headers,
      });
    };
  });
}

async function openLedger(page: Page) {
  await page.goto("/app#finance");
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Lançamentos (Despesa/Receita)",
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator(".ledger-summary .summary-card strong"),
  ).toHaveCount(4);
  await expect(
    page.locator(".ledger-summary .summary-card strong").first(),
  ).toHaveText(/1\.234\.567,89/);
}

async function inspectSummary(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>(".ledger-summary")!;
    const values = [
      ...grid.querySelectorAll<HTMLElement>(".summary-card strong"),
    ];
    const details = values.map((value) => {
      const range = document.createRange();
      range.selectNodeContents(value);
      const text = range.getBoundingClientRect();
      const card = value.closest<HTMLElement>(".summary-card")!;
      const cardRect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      const borderLeft = parseFloat(style.borderLeftWidth);
      const borderRight = parseFloat(style.borderRightWidth);
      return {
        text: value.textContent,
        lines: range.getClientRects().length,
        textLeft: text.left,
        textRight: text.right,
        cardInnerLeft: cardRect.left + borderLeft + 1,
        cardInnerRight: cardRect.right - borderRight - 1,
        fontSize: getComputedStyle(value).fontSize,
      };
    });
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      summaryWidth: grid.clientWidth,
      summaryScrollWidth: grid.scrollWidth,
      gridColumns: getComputedStyle(grid)
        .gridTemplateColumns.trim()
        .split(/\s+/).length,
      details,
    };
  });
}

test("ledger summary values stay complete and responsive", async ({ page }) => {
  await useSyntheticSummary(page);
  await openLedger(page);

  for (const [width, columns] of [
    [1440, 4],
    [768, 2],
    [375, 1],
    [320, 1],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await inspectSummary(page);
    expect(result.gridColumns, `grid columns at ${width}px`).toBe(columns);
    expect(result.summaryScrollWidth).toBeLessThanOrEqual(
      result.summaryWidth + 1,
    );
    if (width !== 320) {
      expect(
        result.documentWidth,
        `document width at ${width}px`,
      ).toBeLessThanOrEqual(width + 1);
    }
    expect(result.details.map((value) => value.text)).toEqual([
      "R$\u00a01.234.567,89",
      "R$\u00a02.469.135,78",
      "-R$\u00a01.234.567,89",
      "987654",
    ]);
    for (const value of result.details) {
      expect(value.lines, `single line at ${width}px: ${value.text}`).toBe(1);
      expect(
        value.textRight,
        `value fits its card at ${width}px: ${value.text}`,
      ).toBeLessThanOrEqual(value.cardInnerRight);
      expect(value.textLeft).toBeGreaterThanOrEqual(value.cardInnerLeft);
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const enlargedText = await inspectSummary(page);
  expect(enlargedText.documentWidth).toBeLessThanOrEqual(376);
  expect(enlargedText.summaryScrollWidth).toBeLessThanOrEqual(
    enlargedText.summaryWidth + 1,
  );
  expect(enlargedText.details.map((value) => value.text)).toEqual([
    "R$\u00a01.234.567,89",
    "R$\u00a02.469.135,78",
    "-R$\u00a01.234.567,89",
    "987654",
  ]);
  for (const value of enlargedText.details) {
    expect(value.lines).toBe(1);
    expect(value.textRight).toBeLessThanOrEqual(value.cardInnerRight);
  }
  expect(parseFloat(enlargedText.details[0].fontSize)).toBeGreaterThan(18);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize({ width: 187, height: 812 });
  const zoomed = await inspectSummary(page);
  expect(zoomed.viewport).toBe(187);
  expect(zoomed.summaryScrollWidth).toBeLessThanOrEqual(
    zoomed.summaryWidth + 1,
  );
  expect(zoomed.details.map((value) => value.text)).toEqual([
    "R$\u00a01.234.567,89",
    "R$\u00a02.469.135,78",
    "-R$\u00a01.234.567,89",
    "987654",
  ]);
  for (const value of zoomed.details) {
    expect(value.lines).toBe(1);
    expect(value.textRight).toBeLessThanOrEqual(value.cardInnerRight);
  }
});
