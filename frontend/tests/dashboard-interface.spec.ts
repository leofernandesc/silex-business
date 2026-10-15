import { test, expect, type Page } from "@playwright/test";
import { money } from "../src/format";

// Test credentials belong exclusively to the disposable demonstration fixture.
async function signIn(page: Page, username = "demo.admin") {
  await page.goto("/app#finance-dashboard");
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}
function amounts(data: any) {
  return [
    data.income_cents,
    data.expense_cents,
    data.net_cents,
    data.receivable_open_cents,
    data.payable_open_cents,
    data.accounts.reduce((n: number, a: any) => n + a.balance_cents, 0),
  ].map(money);
}
async function assertData(page: Page, data: any) {
  await expect(page.locator(".summary-card")).toHaveCount(6);
  await expect(page.locator(".summary-card strong")).toHaveText(amounts(data));
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".settings-list li")).toHaveCount(
    data.accounts.length,
  );
}
async function open(page: Page) {
  await signIn(page);
  const data = await (await page.request.get("/api/finance/dashboard")).json();
  await assertData(page, data);
  return data;
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("six indicators, financial semantics, classifications and account values match the API", async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "fetch" && r.url().includes("/api/finance/"))
      requests.push(new URL(r.url()).pathname);
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const data = await open(page);
  await expect(
    page.locator(".summary-card > div:last-child > span"),
  ).toHaveText([
    "Entradas no período",
    "Saídas no período",
    "Saldo do período",
    "A receber",
    "A pagar",
    "Saldo atual total",
  ]);
  await expect(
    page.getByText(
      "Situação atual, independente do período selecionado. Vencido considera datas anteriores a hoje.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".summary-card small").nth(3)).toHaveText(
    `Vencido ${money(data.receivable_overdue_cents)}`,
  );
  await expect(page.locator(".summary-card small").nth(4)).toHaveText(
    `Vencido ${money(data.payable_overdue_cents)}`,
  );
  const rows = page.locator(".dashboard-classification tbody tr");
  await expect(rows).toHaveCount(data.result_groups.length);
  for (let i = 0; i < data.result_groups.length; i++) {
    const row = data.result_groups[i];
    await expect(rows.nth(i).locator("td.numeric")).toHaveText([
      money(row.income_cents),
      money(row.expense_cents),
      money(row.income_cents - row.expense_cents),
    ]);
    await expect(rows.nth(i)).toContainText(row.group);
  }
  for (let i = 0; i < data.accounts.length; i++) {
    await expect(page.locator(".settings-list li").nth(i)).toContainText(
      data.accounts[i].name,
    );
    await expect(page.locator(".settings-list li > strong").nth(i)).toHaveText(
      money(data.accounts[i].balance_cents),
    );
  }
  expect(requests.every((p) => p === "/api/finance/dashboard")).toBe(true);
  expect(errors).toEqual([]);
  await noOverflow(page);
});

test("draft and applied periods, Brazilian descriptions and existing interval errors", async ({
  page,
}) => {
  const data = await open(page),
    requests: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/finance/dashboard")
      requests.push(r.url());
  });
  await page.getByLabel("De", { exact: true }).fill("2001-01-01");
  await page.getByLabel("Até", { exact: true }).fill("2001-01-31");
  await expect(page.locator(".ledger-date-caption")).toHaveText([
    "Data: 01/01/2001",
    "Data: 31/01/2001",
  ]);
  expect(requests).toHaveLength(0);
  await expect(page.locator(".summary-card strong")).toHaveText(amounts(data));
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/finance/dashboard",
  );
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  const next = await response;
  expect(next.status()).toBe(200);
  const empty = await next.json();
  await assertData(page, empty);
  const url = new URL(next.url());
  expect(url.searchParams.get("start")).toBe("2001-01-01");
  expect(url.searchParams.get("end")).toBe("2001-01-31");
  expect(empty.income_cents).toBe(0);
  expect(empty.expense_cents).toBe(0);
  expect(empty.receivable_open_cents).toBe(data.receivable_open_cents);
  expect(empty.payable_open_cents).toBe(data.payable_open_cents);
  expect(empty.accounts).toEqual(data.accounts);
  expect(empty.monthly).toHaveLength(12);
  expect(empty.monthly.at(-1).month).toBe("2001-01");
  await expect(
    page
      .locator(".dashboard-classification")
      .getByText("Nenhum registro encontrado", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("De", { exact: true }).fill("2001-02-01");
  const rejected = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/finance/dashboard",
  );
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  expect((await rejected).status()).toBe(422);
  await expect(page.getByRole("alert")).toContainText(
    "Data inicial deve ser anterior à final",
  );
});

test("chart keeps twelve months and original heights; textual alternative and keyboard scroll", async ({
  page,
}) => {
  const data = await open(page),
    months = page.locator(".monthly-bars > div");
  await expect(months).toHaveCount(12);
  const peak = Math.max(
    1,
    ...data.monthly.flatMap((r: any) => [r.income_cents, r.expense_cents]),
  );
  expect(
    await page
      .locator(".monthly-bars small:not(.sr-only)")
      .first()
      .evaluate((e) => getComputedStyle(e).color),
  ).toBe("rgb(82, 98, 122)");
  expect(
    await page
      .locator(".dashboard-classification th")
      .first()
      .evaluate((e) => getComputedStyle(e).color),
  ).toBe("rgb(82, 98, 122)");
  for (let i = 0; i < 12; i++) {
    const row = data.monthly[i];
    await expect(months.nth(i)).toHaveAttribute(
      "title",
      `${row.month}: entradas ${money(row.income_cents)}, saídas ${money(row.expense_cents)}`,
    );
    await expect(months.nth(i)).toHaveAttribute(
      "aria-label",
      `${row.month.slice(5)}/${row.month.slice(0, 4)}: entradas ${money(row.income_cents)}, saídas ${money(row.expense_cents)}`,
    );
    const heights = await months
      .nth(i)
      .locator(".bar-pair span")
      .evaluateAll((ns) => ns.map((e) => (e as HTMLElement).style.height));
    heights.forEach((value, n) =>
      expect(parseFloat(value)).toBeCloseTo(
        Math.max(
          2,
          ((n === 0 ? row.income_cents : row.expense_cents) / peak) * 140,
        ),
        4,
      ),
    );
  }
  const scroll = page.getByRole("region", {
    name: "Gráfico mensal de entradas e saídas",
    exact: true,
  });
  await page.keyboard.press("Tab");
  await scroll.focus();
  await expect(scroll).toBeFocused();
  expect(await scroll.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe(
    "solid",
  );
  if (await scroll.evaluate((e) => e.scrollWidth > e.clientWidth + 1)) {
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => scroll.evaluate((e) => e.scrollLeft))
      .toBeGreaterThan(0);
  }
  const summary = page.locator(".dashboard-monthly-values summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".dashboard-monthly-values")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator(".dashboard-monthly-values tbody tr")).toHaveCount(
    12,
  );
  for (let i = 0; i < 12; i++)
    await expect(
      page
        .locator(".dashboard-monthly-values tbody tr")
        .nth(i)
        .locator("td.numeric"),
    ).toHaveText([
      money(data.monthly[i].income_cents),
      money(data.monthly[i].expense_cents),
    ]);
  const table = page.locator(".dashboard-classification .table-wrap");
  await table.focus();
  await table.locator("th").last().scrollIntoViewIfNeeded();
  const last = await table.locator("th").last().boundingBox(),
    box = await table.boundingBox();
  expect(last!.x + last!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
  await noOverflow(page);
});

test("complete small, negative and large amounts survive text 200 percent and zoom", async ({
  page,
}) => {
  await open(page);
  const viewport = page.viewportSize()!;
  const check = async (documentFits = true) => {
    const result = await page
      .locator(".silex-financial-dashboard")
      .evaluate((root) => ({
        width: root.clientWidth,
        scroll: root.scrollWidth,
        document: document.documentElement.scrollWidth,
        viewport: innerWidth,
        amounts: [
          ...root.querySelectorAll(
            ".summary-card strong,.settings-list strong,td.numeric",
          ),
        ]
          .filter((e) => e.getClientRects().length)
          .map((e) => {
            const range = document.createRange();
            range.selectNodeContents(e);
            return {
              text: e.textContent,
              lines: range.getClientRects().length,
              client: e.clientWidth,
              scroll: e.scrollWidth,
              ellipsis: getComputedStyle(e).textOverflow,
            };
          }),
      }));
    expect(result.scroll).toBeLessThanOrEqual(result.width + 1);
    if (documentFits)
      expect(result.document).toBeLessThanOrEqual(result.viewport + 1);
    expect(result.amounts.some((a) => a.text?.includes("1.234.567,89"))).toBe(
      true,
    );
    expect(result.amounts.some((a) => a.text?.includes("-R$"))).toBe(true);
    for (const a of result.amounts) {
      expect(a.lines, a.text || "").toBe(1);
      expect(a.scroll, a.text || "").toBeLessThanOrEqual(a.client + 1);
      expect(a.ellipsis).not.toBe("ellipsis");
    }
  };
  await check();
  await page.evaluate(() => {
    const root = document.querySelector(".silex-financial-dashboard")!;
    const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")].filter(
      (e) => e.getClientRects().length,
    );
    const sizes = nodes.map((e) => parseFloat(getComputedStyle(e).fontSize));
    nodes.forEach((e, i) => {
      (e as HTMLElement).style.fontSize = sizes[i] * 2 + "px";
    });
  });
  await check();
  await page.reload();
  await expect(page.locator(".settings-list li").last()).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await check(viewport.width !== 375);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  });
  await page.setViewportSize({
    width: Math.floor(viewport.width / 2),
    height: viewport.height,
  });
  await check(viewport.width !== 375);
});

test("loading, error and empty accounts are presentation states without new queries", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    const state = window as any;
    state.dashboardMode = "loading";
    window.fetch = async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        location.origin,
      );
      if (url.pathname !== "/api/finance/dashboard")
        return original(input, init);
      if (state.dashboardMode === "loading")
        await new Promise((resolve) => {
          state.releaseDashboard = resolve;
        });
      if (state.dashboardMode === "error")
        return new Response(
          JSON.stringify({ detail: "Erro ilustrativo de consulta" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      return new Response(
        JSON.stringify({
          start: "2026-01-01",
          end: "2026-01-31",
          income_cents: 0,
          expense_cents: 0,
          net_cents: 0,
          movement_count: 0,
          accounts: [],
          receivable_open_cents: 0,
          payable_open_cents: 0,
          receivable_overdue_cents: 0,
          payable_overdue_cents: 0,
          monthly: [],
          result_groups: [],
          budget_month: "2026-01",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    };
  });
  await signIn(page);
  await expect(page.getByRole("status")).toContainText(
    "Carregando informações financeiras",
  );
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await page.evaluate(() => {
    const state = window as any;
    state.dashboardMode = "empty";
    state.releaseDashboard();
  });
  await expect(
    page.getByText("Nenhuma conta disponível.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(6).fill(money(0)),
  );
  await page.evaluate(() => {
    (window as any).dashboardMode = "error";
  });
  await page.getByLabel("De", { exact: true }).fill("2025-01-01");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Erro ilustrativo de consulta",
  );
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "false",
  );
});

test("backend authorization and operator direct URL remain protected", async ({
  page,
}) => {
  expect((await page.request.get("/api/finance/dashboard")).status()).toBe(401);
  await signIn(page, "demo.operador");
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.locator(".silex-financial-dashboard")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  expect((await page.request.get("/api/finance/dashboard")).status()).toBe(403);
});

test("bookkeeping shortcut, browser history and refresh preserve route behavior", async ({
  page,
}) => {
  const data = await open(page);
  await page
    .getByRole("button", { name: "Abrir livro caixa", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app#finance$/);
  await expect(
    page.getByRole("heading", {
      name: "Lançamentos (Despesa/Receita)",
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app#finance-dashboard$/);
  await assertData(page, data);
  await page.goForward();
  await expect(page).toHaveURL(/\/app#finance$/);
  await page.goBack();
  await page.reload();
  await assertData(page, data);
  await noOverflow(page);
});
