import { test, expect, type Page } from "@playwright/test";
import { enterDate } from "./dateHelpers";
import { money } from "../src/format";

const password = process.env.SILEX_TEST_PASSWORD || "DemoLocal#2026";
type Reply = {
  status?: number;
  value?: unknown;
  hold?: boolean;
  network?: boolean;
  invalidJson?: boolean;
};

function responseFor(end: string, zero = false) {
  const [year, month] = end.slice(0, 7).split("-").map(Number);
  const monthly = Array.from({ length: 12 }, (_, offset) => {
    const d = new Date(Date.UTC(year, month - 1 - (11 - offset), 1));
    return {
      month: [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, "0"),
      ].join("-"),
      income_cents: zero ? 0 : 123456,
      expense_cents: zero ? 0 : 43210,
    };
  });
  return {
    start: end.slice(0, 7) + "-01",
    end,
    income_cents: zero ? 0 : 123456,
    expense_cents: zero ? 0 : 43210,
    net_cents: zero ? 0 : 80246,
    movement_count: zero ? 0 : 3,
    accounts: zero
      ? []
      : [
          {
            id: 9,
            name: "Conta fictícia F02",
            kind: "bank",
            opening_cents: 1000,
            balance_cents: 9000,
          },
        ],
    receivable_open_cents: zero ? 0 : 20000,
    payable_open_cents: zero ? 0 : 5000,
    receivable_overdue_cents: zero ? 0 : 1000,
    payable_overdue_cents: zero ? 0 : 500,
    monthly,
    result_groups: zero
      ? []
      : [
          {
            classification: "operating",
            group: "Grupo fictício F02",
            income_cents: 123456,
            expense_cents: 43210,
          },
        ],
    budget_month: end.slice(0, 7),
  };
}

async function stubDashboard(page: Page, replies: Reply[]) {
  await page.addInitScript((queue: Reply[]) => {
    const original = window.fetch.bind(window);
    const state = window as any;
    state.__f02 = { queue, count: 0 };
    state.__f02Release = (index: number) => {
      const item = state.__f02.queue[index];
      item.hold = false;
      item.release?.();
    };
    window.fetch = async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        location.origin,
      );
      if (url.pathname !== "/api/finance/dashboard")
        return original(input, init);
      const current = state.__f02.count++;
      const item =
        state.__f02.queue[Math.min(current, state.__f02.queue.length - 1)];
      if (item.hold)
        await new Promise<void>((resolve) => {
          item.release = resolve;
        });
      if (item.network) throw new TypeError("Synthetic connection failure");
      if (item.invalidJson)
        return new Response("<html>synthetic invalid response</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      return new Response(JSON.stringify(item.value), {
        status: item.status || 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  }, replies);
}

async function signIn(page: Page) {
  await page.goto("/app#finance-dashboard");
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".silex-financial-dashboard")).toBeVisible();
}

async function expectUnavailable(page: Page, width?: number) {
  if (width) await page.setViewportSize({ width, height: 900 });
  await expect(page.locator(".summary-card")).toHaveCount(6);
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(6).fill("—"),
  );
  await expect(page.locator(".summary-card small")).toHaveText(
    Array(6).fill("Dados indisponíveis"),
  );
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível consultar os dados do Dashboard Financeiro",
  );
  await expect(page.locator(".dashboard-monthly")).toContainText(
    "Gráfico mensal indisponível.",
  );
  await expect(
    page.locator(".dashboard-monthly .monthly-bars > div"),
  ).toHaveCount(0);
  await expect(page.locator(".dashboard-monthly-values")).toHaveCount(0);
  await expect(page.locator(".dashboard-classification")).toContainText(
    "Resultados por classificação indisponíveis.",
  );
  await expect(page.locator(".dashboard-classification")).not.toContainText(
    "Nenhum registro encontrado",
  );
  await expect(page.locator(".dashboard-accounts")).toContainText(
    "Saldos por conta indisponíveis.",
  );
  await expect(page.locator(".dashboard-accounts")).not.toContainText(
    "Nenhuma conta disponível.",
  );
  await expect(page.locator(".settings-list li")).toHaveCount(0);
  if (width)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
}

test("loading, period failure and recovery hide stale values; legitimate zero stays visible", async ({
  page,
}) => {
  await stubDashboard(page, [
    { hold: true, value: responseFor("2026-10-31") },
    {
      hold: true,
      status: 503,
      value: { detail: "Diagnóstico interno sintético" },
    },
    { value: responseFor("2001-01-31", true) },
  ]);
  await signIn(page);
  await page.waitForFunction(() => (window as any).__f02.count === 1);
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.getByRole("status")).toContainText(
    "Carregando informações financeiras",
  );
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(6).fill("—"),
  );
  await expect(page.locator(".settings-list li")).toHaveCount(0);
  await expect(page.locator(".dashboard-monthly")).toContainText(
    "Carregando o gráfico mensal…",
  );
  await expect(
    page.locator(".dashboard-monthly .monthly-bars > div"),
  ).toHaveCount(0);
  await expect(page.locator(".dashboard-classification")).toContainText(
    "Carregando resultados por classificação…",
  );
  await expect(page.locator(".dashboard-classification")).not.toContainText(
    "Nenhum registro encontrado",
  );
  await expect(page.locator(".dashboard-accounts")).toContainText(
    "Carregando saldos por conta…",
  );
  await page.evaluate(() => (window as any).__f02Release(0));
  await expect(page.locator(".summary-card strong")).toHaveText([
    money(123456),
    money(43210),
    money(80246),
    money(20000),
    money(5000),
    money(9000),
  ]);
  await expect(page.locator(".summary-card").first()).toContainText(
    "3 movimentos",
  );
  await expect(page.locator(".settings-list li")).toHaveCount(1);
  await expect(page.locator(".dashboard-classification tbody tr")).toHaveCount(
    1,
  );

  await enterDate(page, "De", "2001-01-01");
  await enterDate(page, "Até", "2001-01-31");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await page.waitForFunction(() => (window as any).__f02.count === 2);
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(6).fill("—"),
  );
  await expect(page.locator(".settings-list li")).toHaveCount(0);
  await expect(
    page.locator(".dashboard-monthly .monthly-bars > div"),
  ).toHaveCount(0);
  await expect(page.locator(".dashboard-classification")).not.toContainText(
    "Grupo fictício F02",
  );
  await expect(page.locator(".dashboard-classification")).not.toContainText(
    "Nenhum registro encontrado",
  );
  await expect(page.locator(".dashboard-accounts")).toContainText(
    "Carregando saldos por conta…",
  );
  await expect(
    page.getByRole("button", { name: "Abrir livro caixa", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => (window as any).__f02Release(1));
  await expectUnavailable(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".summary-card strong")).toHaveText(
    Array(6).fill(money(0)),
  );
  await expect(page.locator(".summary-card").first()).toContainText(
    "0 movimentos",
  );
  await expect(page.locator(".summary-card").nth(3)).toContainText(
    "Vencido " + money(0),
  );
  await expect(page.locator(".settings-list li")).toHaveCount(0);
  await expect(
    page.getByText("Nenhuma conta disponível.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".dashboard-classification")).toContainText(
    "Nenhum registro encontrado",
  );
  await expect(page.locator(".monthly-bars > div")).toHaveCount(12);
  await page.locator(".dashboard-monthly-values summary").click();
  await expect(page.locator(".dashboard-monthly-values tbody tr")).toHaveCount(
    12,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const failure of [500, 503, "network", "invalid-json"] as const) {
  test(
    "HTTP/network " +
      failure +
      " never renders dashboard amounts or empty results as current",
    async ({ page }) => {
      const reply: Reply =
        typeof failure === "number"
          ? {
              status: failure,
              value: { detail: "Diagnóstico interno sintético" },
            }
          : failure === "network"
            ? { network: true }
            : { invalidJson: true };
      await stubDashboard(page, [reply]);
      await signIn(page);
      for (const width of [1440, 768, 375])
        await expectUnavailable(page, width);
      await expect(page.locator(".silex-financial-dashboard")).toHaveAttribute(
        "aria-busy",
        "false",
      );
      await expect(
        page.getByRole("button", { name: "Abrir livro caixa", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Abrir livro caixa", exact: true })
        .click();
      await expect(page).toHaveURL(/\/app#finance$/);
    },
  );
}
