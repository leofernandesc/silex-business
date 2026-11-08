import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dateOnly, money } from "../src/format";
import { enterDate, expectDate } from "./dateHelpers";
const fixture = JSON.parse(
  readFileSync(process.env.SILEX_FINANCIAL_FIXTURE!, "utf8"),
);
const base = "/app#finance-dashboard";
const evidenceDir =
  process.env.SILEX_FINANCIAL_EVIDENCE_DIR ||
  "../specs/financial-stage1/evidence";
async function login(page: Page, role = "admin") {
  const r = await page.request.post("/api/auth/login", {
    data: fixture.accounts[role],
  });
  expect(r.status()).toBe(200);
  await page.goto(base);
}
async function ready(page: Page) {
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.locator(".dashboard-monthly .monthly-bars > div"),
  ).toHaveCount(12);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual((page.viewportSize()?.width || 0) + 1);
}
async function unavailable(page: Page) {
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(8).fill("—"),
  );
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível consultar os dados",
  );
  await expect(page.locator(".dashboard-monthly-values")).toHaveCount(0);
  await expect(page.locator(".dashboard-classification")).toContainText(
    "indisponíveis",
  );
  await expect(page.locator(".dashboard-accounts")).toContainText(
    "indisponíveis",
  );
}

test("integer-cent values reconcile; open, overdue, due-window and realized shortcuts retain their criteria", async ({
  page,
}, info) => {
  await login(page);
  await ready(page);
  const expected = fixture.expected.dashboard;
  const values = [
    expected.income_cents,
    expected.expense_cents,
    expected.net_cents,
    expected.receivable_open_cents,
    expected.payable_open_cents,
    expected.accounts.reduce((s: number, a: any) => s + a.balance_cents, 0),
    fixture.expected.income.summary.due_7_days_cents,
    fixture.expected.expense.summary.due_7_days_cents,
  ];
  await expect(page.locator(".summary-card strong")).toHaveText(
    values.map(money),
  );
  await expect(page.getByLabel("Período aplicado")).toContainText(
    "Período aplicado",
  );
  await noOverflow(page);
  await page.screenshot({
    path: `${evidenceDir}/dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Consultar a receber em aberto", exact: true })
    .click();
  await expect(
    page.locator(".silex-accounts .summary-card strong").first(),
  ).toHaveText(money(expected.receivable_open_cents));
  await expect(page.getByLabel("Filtros aplicados")).toContainText(
    "Sem início até Sem fim",
  );
  await expect(page.getByLabel("Filtros aplicados")).toContainText(
    "abertos e parciais",
  );
  await expect(page.locator(".silex-accounts tbody tr")).toHaveCount(4);
  await page.reload();
  await expect(
    page.locator(".silex-accounts .summary-card strong").first(),
  ).toHaveText(money(expected.receivable_open_cents));
  await page.goto(base);
  await ready(page);
  await page
    .getByRole("link", { name: "Consultar pagamentos vencidos", exact: true })
    .click();
  await expect(page.locator(".silex-accounts tbody tr")).toHaveCount(1);
  await expect(
    page.locator(".silex-accounts .summary-card strong").first(),
  ).toHaveText(money(expected.payable_overdue_cents));
  await page.goto(base);
  await ready(page);
  await page
    .getByRole("link", {
      name: "Consultar próximos vencimentos a receber",
      exact: true,
    })
    .click();
  await expect(page.locator(".silex-accounts tbody tr")).toHaveCount(2);
  await expect(
    page.locator(".silex-accounts .summary-card strong").first(),
  ).toHaveText(money(fixture.expected.income.summary.due_7_days_cents));
  await expectDate(page, "De", fixture.reference);
  await page.goto(base);
  await ready(page);
  await page
    .getByRole("link", { name: "Consultar entradas realizadas", exact: true })
    .click();
  await expect(
    page.locator(".silex-ledger .summary-card strong").first(),
  ).toHaveText(money(expected.income_cents));
  await expect(page.getByLabel("Filtros aplicados")).toContainText(
    "Lançamento da baixa",
  );
  await expect(page.getByLabel("Filtros aplicados")).toContainText(
    "Entradas / receitas",
  );
  await page.reload();
  await expect(
    page.locator(".silex-ledger .summary-card strong").first(),
  ).toHaveText(money(expected.income_cents));
});

test("applied versus draft period; pending/failure hides old values, retry recovers, empty input does not silently change query", async ({
  page,
}, info) => {
  let mode = "real",
    release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/finance/dashboard?**", async (route) => {
    if (mode === "real") return route.continue();
    await held;
    await route.fulfill({ status: 503, json: { detail: "Synthetic failure" } });
  });
  await login(page);
  await ready(page);
  await enterDate(page, "De", "2026-01-01");
  await enterDate(page, "Até", "2026-01-31");
  await expect(
    page.getByText("Há alterações de período ainda não aplicadas."),
  ).toBeVisible();
  await expect(page.getByLabel("Período aplicado")).not.toContainText(
    "01/01/2026",
  );
  mode = "failure";
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(8).fill("—"),
  );
  release();
  await unavailable(page);
  await expect(page.getByLabel("Período aplicado")).toContainText(
    "01/01/2026 até 31/01/2026",
  );
  await page.screenshot({
    path: `${evidenceDir}/error-${info.project.name}.png`,
    fullPage: true,
  });
  mode = "real";
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await ready(page);
  // No movements in January is a genuine zero. Current titles are not constrained to January.
  await expect(page.locator(".summary-card strong").first()).toHaveText(
    money(0),
  );
  await expect(
    page
      .locator(".summary-card")
      .filter({ has: page.getByText("A receber", { exact: true }) })
      .locator("strong"),
  ).toHaveText(money(fixture.expected.dashboard.receivable_open_cents));
  await page.reload();
  await ready(page);
  await expectDate(page, "Até", "2026-01-31");
  await enterDate(page, "De", "");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Informe as duas datas");
  await expect(page.getByLabel("Período aplicado")).toContainText(
    "01/01/2026 até 31/01/2026",
  );
  await noOverflow(page);
});

for (const failure of ["500", "503", "network", "invalid-json", "malformed"])
  test(`unavailable ${failure} never becomes zero or an empty successful table`, async ({
    page,
  }) => {
    await page.route("**/api/finance/dashboard?**", async (route) => {
      if (failure === "network") return route.abort("failed");
      if (failure === "invalid-json")
        return route.fulfill({
          status: 200,
          body: "<html>not JSON</html>",
          contentType: "text/html",
        });
      if (failure === "malformed")
        return route.fulfill({ status: 200, json: {} });
      await route.fulfill({
        status: Number(failure),
        json: { detail: "Synthetic unavailable" },
      });
    });
    await login(page);
    await unavailable(page);
    await noOverflow(page);
    await expect(page.locator(".dashboard-current a")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Abrir livro caixa" }),
    ).toBeVisible();
  });

test("genuine zero with a registered account differs from no account; auxiliary due failure is independent", async ({
  page,
}) => {
  const zero = {
    ...fixture.expected.dashboard,
    income_cents: 0,
    expense_cents: 0,
    net_cents: 0,
    movement_count: 0,
    receivable_open_cents: 0,
    payable_open_cents: 0,
    receivable_overdue_cents: 0,
    payable_overdue_cents: 0,
    accounts: [
      {
        id: 1,
        name: "Conta fictícia zerada",
        kind: "bank",
        opening_cents: 0,
        balance_cents: 0,
      },
    ],
    result_groups: [],
    monthly: fixture.expected.dashboard.monthly.map((m: any) => ({
      ...m,
      income_cents: 0,
      expense_cents: 0,
      net_cents: 0,
    })),
  };
  await page.route("**/api/finance/dashboard?**", (r) =>
    r.fulfill({ json: zero }),
  );
  await page.route("**/api/finance?**", (r) =>
    r.fulfill({ status: 503, json: { detail: "Synthetic due unavailable" } }),
  );
  await login(page);
  await ready(page);
  await expect(page.locator(".summary-card strong")).toHaveText([
    ...Array(6).fill(money(0)),
    "—",
    "—",
  ]);
  await expect(
    page.locator(".dashboard-monthly .monthly-bars>div"),
  ).toHaveCount(12);
  await expect(page.locator(".dashboard-classification")).toContainText(
    "Nenhum registro encontrado",
  );
  await expect(
    page.locator(".dashboard-due-grid").getByRole("alert"),
  ).toHaveCount(2);
  zero.accounts = [];
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await ready(page);
  await expect(page.locator(".summary-card strong").nth(5)).toHaveText("—");
  await expect(page.locator(".dashboard-accounts")).toContainText(
    "Nenhuma conta disponível",
  );
});

test("a late response from a prior query cannot replace newer applied results", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    (window as any).__lateRelease = null;
    window.fetch = async (input, init) => {
      const u = new URL(String(input), location.origin);
      if (
        u.pathname === "/api/finance/dashboard" &&
        u.searchParams.get("end") === "2026-01-31"
      ) {
        await new Promise<void>((r) => ((window as any).__lateRelease = r));
        // Deliberately ignore AbortSignal to exercise the hook's alive/query-key guard too.
        return new Response(JSON.stringify((window as any).__lateData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return original(input, init);
    };
  });
  await login(page);
  await ready(page);
  await page.evaluate(
    (v) => ((window as any).__lateData = v),
    fixture.expected.dashboard,
  );
  await enterDate(page, "De", "2026-01-01");
  await enterDate(page, "Até", "2026-01-31");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await enterDate(page, "Até", "2026-02-28");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await ready(page);
  await expect(page.locator(".summary-card strong").first()).toHaveText(
    money(0),
  );
  await page.evaluate(() => {
    (window as any).__lateRelease();
    return new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
  await expect(page.locator(".summary-card strong").first()).toHaveText(
    money(0),
  );
  await expect(page.getByLabel("Período aplicado")).toContainText("28/02/2026");
});

test("title and movement errors hide counts and balances; operator still cannot enter financial modules", async ({
  page,
}) => {
  await page.route("**/api/finance?**", (r) =>
    r.fulfill({
      status: 500,
      json: { detail: "Consulta fictícia indisponível" },
    }),
  );
  await page.route("**/api/finance/movements?**", (r) =>
    r.fulfill({
      status: 503,
      json: { detail: "Consulta fictícia indisponível" },
    }),
  );
  await login(page);
  await page.goto(
    "/app?f_context=titles&f_status=pending&f_start=&f_end=#finance-payable",
  );
  await expect(page.locator(".silex-accounts .summary-card strong")).toHaveText(
    Array(4).fill("—"),
  );
  await expect(page.locator(".silex-accounts")).not.toContainText(
    "Nenhum registro encontrado",
  );
  await page.goto("/app?f_context=movements&f_start=&f_end=#finance");
  await expect(page.locator(".silex-ledger .summary-card strong")).toHaveText(
    Array(4).fill("—"),
  );
  await page.request.post("/api/auth/logout");
  await login(page, "operator");
  await expect(page.locator(".silex-financial-dashboard")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  expect((await page.request.get("/api/finance/dashboard")).status()).toBe(403);
});

test("keyboard shortcut focus, monthly alternative table and tablet/text enlargement remain usable", async ({
  page,
}) => {
  await login(page);
  await ready(page);
  const link = page.getByRole("link", {
    name: "Consultar entradas realizadas",
    exact: true,
  });
  await link.focus();
  await expect(link).toBeFocused();
  expect(
    await link.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  await page
    .getByText("Consultar valores mensais em tabela", { exact: true })
    .click();
  await expect(page.locator(".dashboard-monthly-values tbody tr")).toHaveCount(
    12,
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await noOverflow(page);
  const sizes = await page
    .locator(".silex-financial-dashboard *")
    .evaluateAll((elements) =>
      elements.map((el) => parseFloat(getComputedStyle(el).fontSize)),
    );
  await page
    .locator(".silex-financial-dashboard *")
    .evaluateAll(
      (elements, sizes) =>
        elements.forEach(
          (el, i) => ((el as HTMLElement).style.fontSize = `${sizes[i] * 2}px`),
        ),
      sizes,
    );
  await page.setViewportSize({ width: 375, height: 812 });
  await noOverflow(page);
  await expect(page.locator(".summary-card strong").first()).toHaveText(
    money(fixture.expected.dashboard.income_cents),
  );
  await expect(
    page.getByRole("link", {
      name: "Consultar próximos vencimentos a receber",
      exact: true,
    }),
  ).toBeVisible();
});

for (const scenario of [
  {
    zone: "Asia/Tokyo",
    instant: "2026-11-01T02:30:00Z",
    day: "2026-10-31",
    week: "2026-10-26",
    month: "2026-10-01",
    previous: ["2026-09-01", "2026-09-30"],
    year: "2026-01-01",
  },
  {
    zone: "America/Los_Angeles",
    instant: "2027-01-01T04:00:00Z",
    day: "2027-01-01",
    week: "2026-12-28",
    month: "2027-01-01",
    previous: ["2026-12-01", "2026-12-31"],
    year: "2027-01-01",
  },
])
  test.describe(`civil presets in ${scenario.zone}`, () => {
    test.use({ timezoneId: scenario.zone });
    test("all five title presets send Manaus dates and preserve filtered navigation", async ({
      page,
    }) => {
      await page.clock.setFixedTime(new Date(scenario.instant));
      await login(page);
      await ready(page);
      await expect(
        page.getByRole("heading", {
          name: "Vencimentos: hoje e 7 dias seguintes",
          exact: true,
        }),
      ).toBeVisible();
      // Due-window links still use server as_of_date, not the deliberately different browser clock.
      await page
        .getByRole("link", {
          name: "Consultar próximos vencimentos a receber",
          exact: true,
        })
        .click();
      await expectDate(page, "De", fixture.reference);
      await expect(
        page.getByText(
          "Data atual do servidor até o 7º dia seguinte, inclusive (8 datas possíveis).",
          { exact: true },
        ),
      ).toBeVisible();
      let last: URL | null = null;
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (
          url.pathname === "/api/finance" &&
          url.searchParams.has("date_field")
        )
          last = url;
      });
      for (const route of ["finance-payable", "finance-receivable"]) {
        await page.goto("/app#" + route);
        const buttons = page.getByLabel("Período rápido");
        for (const [label, start, end] of [
          ["Hoje", scenario.day, scenario.day],
          ["Semana", scenario.week, scenario.day],
          ["Mês", scenario.month, scenario.day],
          ["Mês anterior", ...scenario.previous],
          ["Ano", scenario.year, scenario.day],
        ]) {
          await buttons
            .getByRole("button", { name: label, exact: true })
            .click();
          await expect.poll(() => last?.searchParams.get("start")).toBe(start);
          await expect.poll(() => last?.searchParams.get("end")).toBe(end);
          expect(last!.searchParams.get("date_field")).toBe("due");
          expect(last!.searchParams.get("direction")).toBe(
            route === "finance-payable" ? "expense" : "income",
          );
          await expectDate(page, "De", start);
          await expectDate(page, "Até", end);
          await expect(page.getByLabel("Filtros aplicados")).toContainText(
            `${dateOnly(start)} até ${dateOnly(end)}`,
          );
          const address = new URL(page.url());
          expect(address.searchParams.get("f_start")).toBe(start);
          expect(address.searchParams.get("f_end")).toBe(end);
        }
        await page.reload();
        await expectDate(page, "Até", scenario.day);
        await noOverflow(page);
      }
    });
  });
