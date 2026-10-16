import { dateField, enterDate, expectDate } from "./dateHelpers";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function start(page: Page) {
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
}
async function overflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("operator has no ledger UI and cannot read or create protected movements", async ({
  page,
}) => {
  await page.goto("/app#finance");
  await page.getByLabel("Usuário", { exact: true }).fill("demo.operador");
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  await expect(page.locator(".ledger-page")).toHaveCount(0);
  expect((await page.request.get("/api/finance/movements")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/finance/movements", {
        data: {
          description: "Não deve ser criado",
          direction: "expense",
          amount_cents: 100,
          account_id: 1,
          subcategory_id: 1,
          posting_date: "2026-10-01",
          competence_date: "2026-10-01",
          method: "pix",
          request_key: "sb05-denied-test-key",
        },
      })
    ).status(),
  ).toBe(403);
  await overflow(page);
});

test("scroll instruction follows actual overflow when resizing", async ({
  page,
}) => {
  await start(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".ledger-scroll-hint")).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".ledger-scroll-hint")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".ledger-scroll-hint")).toHaveCount(0);
  await overflow(page);
});

test("P06 neutral expense, primary income, keyboard focus and six-column scroll", async ({
  page,
}) => {
  await start(page);
  for (const name of [
    "Hoje",
    "Semana",
    "Mês",
    "Mês anterior",
    "Ano",
    "Tudo",
    "Personalizado",
  ]) {
    const preset = page
      .locator(".period-tabs")
      .getByRole("button", { name, exact: true });
    await expect(preset).toBeInViewport();
    const bounds = await preset.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
  }
  const expense = page.getByRole("button", {
    name: "Nova despesa",
    exact: true,
  });
  await expect(expense).not.toHaveClass(/primary|danger/);
  await expect(
    page.getByRole("button", { name: "Nova receita", exact: true }),
  ).toHaveClass(/primary/);
  await page.keyboard.press("Tab");
  const search = page.getByLabel("Pesquisar histórico ou documento", {
    exact: true,
  });
  await search.focus();
  const focus = await search.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      style: s.outlineStyle,
      color: s.outlineColor,
      width: parseFloat(s.outlineWidth),
    };
  });
  expect(focus.style).toBe("solid");
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.color).toBe("rgb(23, 105, 232)");
  await search.fill("Lançamento ilustrativo SB05 02");
  await search.press("Enter");
  await expect(page.locator(".ledger-list tbody tr")).toHaveCount(1);
  const table = page.locator(".ledger-list .table-wrap");
  await expect(table.locator("thead th")).toHaveCount(6);
  await table.focus();
  const dims = await table.evaluate((el) => ({
    client: el.clientWidth,
    scroll: el.scrollWidth,
  }));
  if (dims.scroll > dims.client + 1) {
    await expect(page.locator(".ledger-scroll-hint")).toBeVisible();
    await expect(table).toHaveAttribute("aria-describedby", /.+/);
    for (let n = 0; n < 10; n++) await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => table.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    await table.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await table.locator("th").last().scrollIntoViewIfNeeded();
    await expect(table.locator("th").last()).toBeInViewport();
    await table
      .getByRole("button", { name: "Estornar", exact: true })
      .first()
      .scrollIntoViewIfNeeded();
    await expect(
      table.getByRole("button", { name: "Estornar", exact: true }).first(),
    ).toBeInViewport();
  } else await expect(page.locator(".ledger-scroll-hint")).toHaveCount(0);
  await overflow(page);
});

test("draft/applied filters, ISO dates, competence, documents, empty and pagination preserved", async ({
  page,
}) => {
  await start(page);
  const original = await page.locator(".ledger-list tbody tr").count();
  expect(original).toBe(20);
  await page
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  await expect(page.locator(".pagination")).toContainText("2 de");
  await page
    .getByRole("button", { name: "Página anterior", exact: true })
    .click();
  await page.locator(".ledger-list .panel-heading select").selectOption("100");
  await expect
    .poll(() => page.locator(".ledger-list tbody tr").count())
    .toBeGreaterThan(20);
  const search = page.getByLabel("Pesquisar histórico ou documento", {
    exact: true,
  });
  await search.fill("DOC-SB05-02");
  await expect
    .poll(() => page.locator(".ledger-list tbody tr").count())
    .toBeGreaterThan(20);
  await page.getByLabel("Busca", { exact: true }).selectOption("document");
  await page.getByLabel("Tipo", { exact: true }).selectOption("income");
  await page.getByLabel("Origem", { exact: true }).selectOption("manual");
  const from = dateField(page, "De").locator('input[type="date"]');
  const iso = await from.inputValue();
  await enterDate(page, "De", iso);
  // Use the last day from the original preset instead of assuming every month has 31 days.
  await enterDate(page, "Até",
    await page.evaluate(
      (month: string) => {
        const [y, m] = month.split("-").map(Number);
        return `${month}-${new Date(y, m, 0).getDate()}`;
      },
      iso.slice(0, 7),
    ),
  );
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/finance/movements?") &&
      r.url().includes("search_field=document"),
  );
  await search.press("Enter");
  const data = await response;
  const params = new URL(data.url()).searchParams;
  expect(params.get("q")).toBe("DOC-SB05-02");
  expect(params.get("start")).toBe(iso);
  expect(params.get("direction")).toBe("income");
  expect(params.get("origin")).toBe("manual");
  await expect(page.locator(".ledger-list tbody tr")).toHaveCount(1);
  await expect(page.locator(".ledger-list")).toContainText(
    "Lançamento ilustrativo SB05 02",
  );
  await search.fill("texto sem resultados");
  await search.press("Enter");
  await expect(page.locator(".ledger-empty")).toBeVisible();
  await expect(page.locator(".ledger-scroll-hint")).toHaveCount(0);
  await page.getByRole("button", { name: "Mês", exact: true }).click();
  // Preset deliberately keeps other applied criteria (including the search) as before.
  await expect(page.locator(".ledger-empty")).toBeVisible();
  await search.fill("DOC-SB05-02");
  await page.getByLabel("Competência", { exact: true }).check();
  await search.press("Enter");
  await expect(page.locator(".ledger-list tbody tr")).toHaveCount(1);
  await overflow(page);
});

for (const locale of ["pt-BR", "en-US"])
  test(`P05 ISO and Brazilian segments in ${locale}`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      viewport: info.project.use.viewport,
      locale,
    });
    const page = await context.newPage();
    try {
      await start(page);
      for (const [iso, display] of [
        ["2024-02-29", "29/02/2024"],
        ["2026-01-10", "10/01/2026"],
        ["2026-10-01", "01/10/2026"],
      ]) {
        await enterDate(page, "De", iso);
        await expectDate(page, "De", iso);
        expect((await dateField(page, "De").locator(".silex-date-input").innerText()).replace(/\s/g, "")).toBe(display);
      }
      await enterDate(page, "De", "");
      await expectDate(page, "De", "");
      await page
        .getByRole("button", { name: "Nova despesa", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      const posting = dateField(dialog, "Data de lançamento *");
      const max = await posting.locator('input[type="date"]').inputValue();
      await expect(posting.locator('input[hidden]')).toHaveAttribute("required", "");
      await enterDate(dialog, "Data de lançamento *", "2099-12-31");
      expect(await posting.locator('input[hidden]').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
      await enterDate(dialog, "Data de lançamento *", max);
      await enterDate(dialog, "Data de lançamento *", "");
      expect(await posting.locator('input[hidden]').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await overflow(page);
    } finally {
      await context.close();
    }
  });

test("creation and reversal keep payload, amounts, constraints and accessible errors", async ({
  page,
}, info) => {
  await start(page);
  const suffix = info.project.name + "-" + Date.now();
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Histórico *", { exact: true })
    .fill("Despesa visual SB05 " + suffix);
  await dialog.getByLabel("Valor (R$) *", { exact: true }).fill("inválido");
  await dialog
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Informe um valor positivo",
  );
  await dialog.getByLabel("Valor (R$) *", { exact: true }).fill("21,35");
  const posting = await dateField(dialog, "Data de lançamento *").locator('input[type="date"]').inputValue(),
    competence = await dateField(dialog, "Data de competência *").locator('input[type="date"]').inputValue();
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/finance/movements") && r.method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  expect((await request).postDataJSON()).toMatchObject({
    direction: "expense",
    amount_cents: 2135,
    posting_date: posting,
    competence_date: competence,
  });
  await expect(dialog).toHaveCount(0);
  const search = page.getByLabel("Pesquisar histórico ou documento", {
    exact: true,
  });
  await search.fill("Despesa visual SB05 " + suffix);
  await search.press("Enter");
  const row = page
    .getByRole("row")
    .filter({ hasText: "Despesa visual SB05 " + suffix });
  await expect(row).toContainText("21,35");
  await expect(row).toContainText("Saída");
  await row.getByRole("button", { name: "Estornar", exact: true }).click();
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Estorno ilustrativo de teste SB05");
  await page
    .getByRole("button", { name: "Confirmar estorno", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Despesa visual SB05 " + suffix }),
  ).toHaveCount(2);
  await expect(page.locator(".ledger-list")).toContainText("Estornado");
  await overflow(page);
});

test("export and print retain applied criteria and original print template", async ({
  page,
}) => {
  await start(page);
  const input = page.getByLabel("Pesquisar histórico ou documento", {
    exact: true,
  });
  await input.fill("Lançamento ilustrativo SB05 02");
  await input.press("Enter");
  await expect(page.locator(".ledger-list tbody tr")).toHaveCount(1);
  await input.fill("draft não aplicado");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const file = await download;
  const body = await readFile((await file.path())!, "utf8");
  expect(body).toContain("Lançamento ilustrativo SB05 02");
  expect(body).not.toContain("Lançamento ilustrativo SB05 03");
  await page.evaluate(() => {
    (window as any).sb05Printed = 0;
    window.print = () => {
      (window as any).sb05Printed++;
    };
  });
  await page.getByRole("button", { name: "Imprimir", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).sb05Printed))
    .toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".ledger-print")).toBeVisible();
  await expect(page.locator(".ledger-print h1")).toHaveText(
    "Livro caixa · Silex Business",
  );
  await expect(page.locator(".ledger-print tbody tr")).toHaveCount(1);
  await expect(page.locator(".ledger-date-caption").first()).not.toBeVisible();
  await page.emulateMedia({ media: "screen" });
});
