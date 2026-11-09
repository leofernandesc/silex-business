import { test, expect, type Page } from "./integrationTest";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { enterDate } from "./dateHelpers";
import { routes } from "../src/navigation/routes";
async function req(
  page: Page,
  path: string,
  data?: unknown,
  status = data ? 201 : 200,
) {
  const response = data
    ? await page.request.post("/api" + path, { data })
    : await page.request.get("/api" + path);
  expect(response.status(), await response.text()).toBe(status);
  return response.json();
}
async function auth(page: Page, username = "demo.admin") {
  await req(
    page,
    "/auth/login",
    { username, password: process.env.SILEX_TEST_PASSWORD },
    200,
  );
}
async function evidence(page: Page, name: string) {
  name += "-" + page.viewportSize()!.width;
  const folder = process.env.SILEX_DRE_HOME_EVIDENCE;
  if (folder) {
    mkdirSync(folder, { recursive: true });
    await page.screenshot({
      path: join(folder, name + ".png"),
      fullPage: true,
    });
  }
}
async function sidebar(page: Page, name: string) {
  const nav = page.locator("#app-navigation");
  if (page.viewportSize()!.width <= 900) {
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await expect(nav).toHaveAttribute("aria-modal", "true");
  } else await expect(nav).toBeVisible();
  const button = nav.getByRole("button", { name, exact: true });
  if (!(await button.isVisible())) {
    const group = routes.find((route) => route.title === name)?.group;
    expect(group).toBeTruthy();
    await nav
      .locator(`.nav-group-toggle[aria-controls="nav-group-${group}"]`)
      .click();
  }
  await button.click();
  await expect(page.locator("#app-navigation[aria-modal=true]")).toHaveCount(0);
}

test("Home service summary uses three clear KPI blocks and preserves legitimate zeros", async ({
  page,
}) => {
  await auth(page);
  await page.goto("/app#home");
  const card = page.getByRole("region", {
    name: "Resumo de serviços e pedidos",
    exact: true,
  });
  await expect(card.getByText("Concluídos", { exact: true })).toBeVisible();
  await evidence(page, "home-services");
  expect(
    await card.locator("dl").evaluate((el) => getComputedStyle(el).display),
  ).toBe("grid");
  await expect(card.locator("dt")).toHaveText([
    "Agendados",
    "Em execução",
    "Concluídos",
  ]);
  await expect(card.locator("dd")).toHaveText(["0", "0", "0"]);
  const boxes = await card
    .locator("dl > div")
    .evaluateAll((els) =>
      els.map((el) => ({
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      })),
    );
  expect(boxes[0].x).toBeLessThan(boxes[1].x);
  expect(boxes[1].x).toBeLessThan(boxes[2].x);
  expect(
    boxes.every(
      (box) =>
        Math.abs(box.y - boxes[0].y) < 1 && box.width > 60 && box.height > 60,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("DRE has a dedicated sidebar destination, breadcrumb and preserves the other reports", async ({
  page,
}) => {
  await auth(page);
  await page.goto("/app#home");
  await sidebar(page, "DRE gerencial");
  await expect(page).toHaveURL(/#finance-dre$/);
  await expect(page.locator(".breadcrumb strong")).toHaveText("DRE gerencial");
  await expect(
    page.getByRole("heading", { level: 1, name: "DRE gerencial", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".breadcrumb strong")).toHaveText("DRE gerencial");
  await sidebar(page, "Relatórios Financeiros");
  await expect(page).toHaveURL(/#finance-reports$/);
  await expect(
    page.getByLabel("Relatório", { exact: true }).locator("option"),
  ).toHaveCount(27);
  await expect(page.locator(".breadcrumb strong")).toHaveText(
    "Relatórios Financeiros",
  );
  await sidebar(page, "Visão financeira");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Visão financeira",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Consultar DRE gerencial/ }),
  ).toHaveCount(0);
});

for (const [counts, expected] of [
  [{ scheduled: 2, in_progress: 3, completed: 5 }, ["2", "3", "5"]],
  [null, ["—", "—", "—"]],
] as const)
  test(
    "Home service KPIs preserve " +
      (counts ? "nonzero counts" : "unavailable states"),
    async ({ page }) => {
      await auth(page);
      await page.route("**/api/dashboard", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          json: { ...(await response.json()), service_counts: counts },
        });
      });
      await page.goto("/app#home");
      const card = page.getByRole("region", {
        name: "Resumo de serviços e pedidos",
        exact: true,
      });
      await expect(card.locator("dd")).toHaveText([...expected]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );

test("Home KPIs remain three legible columns at tablet widths", async ({
  page,
}) => {
  await auth(page);
  for (const width of [1024, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app#home");
    const card = page.getByRole("region", {
      name: "Resumo de serviços e pedidos",
      exact: true,
    });
    await expect(card.locator("dd")).toHaveText(["0", "0", "0"]);
    const boxes = await card
      .locator("dl > div")
      .evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().toJSON()),
      );
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);
    expect(
      boxes.every((box) => Math.abs(box.y - boxes[0].y) < 1 && box.width > 60),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("DRE direct URL and API preserve operator and visitor authorization", async ({
  page,
}) => {
  await page.goto("/app#finance-dre");
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await page.request.get("/api/finance/dre")).status()).toBe(401);
  await auth(page, "demo.operador");
  await page.goto("/app#finance-dre");
  await expect(page).toHaveURL(/#home$/);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  expect((await page.request.get("/api/finance/dre")).status()).toBe(403);
  await expect(
    page
      .locator("#app-navigation")
      .getByRole("button", { name: "DRE gerencial", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", {
      name: "Resumo de serviços e pedidos",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("DRE legacy deep link, active item, history and report selector preserve applied periods", async ({
  page,
}) => {
  await auth(page);
  await page.goto(
    "/app?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31#finance-reports",
  );
  await expect(page).toHaveURL(
    /dre_start=2000-01-01&dre_end=2000-01-31#finance-dre$/,
  );
  await expect(page.locator(".dre-report")).toContainText(
    "01/01/2000 a 31/01/2000",
  );
  const address = page.url();
  await sidebar(page, "DRE gerencial");
  expect(page.url()).toBe(address);
  await page
    .getByLabel("Relatório", { exact: true })
    .selectOption("cash-monthly");
  await expect(page).toHaveURL(/#finance-reports$/);
  await expect(page.getByLabel("Relatório", { exact: true })).toHaveValue(
    "cash-monthly",
  );
  await enterDate(page, "De", "2001-02-01");
  await enterDate(page, "Até", "2001-02-28");
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  await expect(
    page.locator(".finance-report-print .panel-heading"),
  ).toContainText("01/02/2001 a 28/02/2001");
  await page.goBack();
  await expect(page).toHaveURL(
    /dre_start=2000-01-01&dre_end=2000-01-31#finance-dre$/,
  );
  await expect(page.locator(".dre-report")).toContainText(
    "01/01/2000 a 31/01/2000",
  );
  await page.reload();
  await expect(page.locator(".dre-report")).toContainText(
    "01/01/2000 a 31/01/2000",
  );
  await page
    .getByLabel("Relatório", { exact: true })
    .selectOption("budget-actual");
  await expect(page).toHaveURL(/#finance-reports$/);
  await expect(page.getByLabel("Relatório", { exact: true })).toHaveValue(
    "budget-actual",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Relatórios Financeiros",
      exact: true,
    }),
  ).toBeVisible();
});

test("DRE service lifecycle through real forms shows known revenue once and explains missing coverage", async ({
  page,
}) => {
  await auth(page);
  await page.goto("/app#home");
  await sidebar(page, "DRE gerencial");
  await enterDate(page, "De", "2000-01-01");
  await enterDate(page, "Até", "2000-01-31");
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  await expect(page.locator(".dre-report")).toContainText(
    "Nenhuma operação no período",
  );
  await expect(page.locator(".dre-lines")).toHaveCount(0);
  await evidence(page, "dre-empty");
  await sidebar(page, "Clientes");
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page
    .getByLabel("Nome *", { exact: true })
    .fill("Empresa fictícia do fluxo completo DRE");
  const customerResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/customers") && r.request().method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  const cr = await customerResponse;
  expect(cr.status()).toBe(201);
  const customer = await cr.json();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await sidebar(page, "Serviços e pedidos");
  await page
    .getByRole("button", { name: "Novo serviço/pedido", exact: true })
    .click();
  await page
    .getByLabel("Cliente *", { exact: true })
    .selectOption(String(customer.id));
  await page
    .getByLabel("Descrição do serviço/pedido *", { exact: true })
    .fill("Serviço fictício de manutenção empresarial comprovado");
  await enterDate(page, "Data do serviço *", "2000-01-10");
  await page
    .getByLabel("Valor negociado (R$) *", { exact: true })
    .fill("R$ 5.000,01");
  const serviceResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/service-orders") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Cadastrar serviço", exact: true })
    .click();
  const sr = await serviceResponse;
  expect(sr.status()).toBe(201);
  const service = await sr.json();
  expect(service.negotiated_cents).toBe(500001);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: service.code });
  await row
    .getByRole("button", { name: "Concluir " + service.code, exact: true })
    .click();
  await enterDate(page, "Data efetiva de conclusão *", "2000-01-10");
  await page
    .getByLabel("Evidência da execução *", { exact: true })
    .fill("Documento inteiramente fictício de execução integral");
  const completion = page.waitForResponse((r) =>
    r.url().endsWith(`/service-orders/${service.id}/complete`),
  );
  await page
    .getByRole("button", {
      name: "Confirmar conclusão do serviço",
      exact: true,
    })
    .click();
  expect((await completion).status()).toBe(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await req(page, `/service-orders/${service.id}`)).titles,
  ).toHaveLength(0);
  await row.getByRole("button", { name: "Gerar títulos", exact: true }).click();
  const bank = (await req(page, "/accounts")).find(
    (a: any) => a.kind === "bank",
  );
  await page
    .getByLabel("Conta associada aos títulos *", { exact: true })
    .selectOption(String(bank.id));
  await enterDate(page, "Vencimento *", "2000-01-20");
  await enterDate(page, "Competência *", "2000-01-10");
  const generation = page.waitForResponse((r) =>
    r.url().endsWith(`/service-orders/${service.id}/generate-titles`),
  );
  await page
    .getByRole("button", { name: "Confirmar geração de títulos", exact: true })
    .click();
  expect((await generation).status()).toBe(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const generated = await req(page, `/service-orders/${service.id}`);
  expect(generated.titles).toHaveLength(1);
  const title = generated.titles[0];
  expect(title.amount_cents).toBe(500001);
  await sidebar(page, "DRE gerencial");
  await enterDate(page, "De", "2000-01-01");
  await enterDate(page, "Até", "2000-01-31");
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  await expect(page.locator(".dre-summary")).toContainText(
    "Existem operações para classificar ou confirmar",
  );
  await expect(page.locator(".dre-report")).toContainText(
    "A categoria ainda não possui classificação na DRE",
  );
  await evidence(page, "dre-pending");
  const period = "start=2000-01-01&end=2000-01-31",
    pending = await req(page, "/finance/dre?" + period);
  expect(pending.facts).toHaveLength(0);
  expect(pending.issues).toHaveLength(1);
  await page
    .getByRole("link", {
      name: "Revisar classificação no Plano financeiro",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Rubrica DRE", { exact: true }).selectOption("RB");
  await enterDate(page, "Vigência inicial da DRE", "2000-01-01");
  await enterDate(page, "Vigência final da DRE", "2000-01-31");
  await page
    .getByLabel("Motivo da classificação DRE", { exact: true })
    .fill("Classificação do serviço baseada somente em documentos fictícios");
  await page
    .getByRole("button", { name: "Prévia do impacto", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmar classificação revisada",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Classificação registrada com histórico.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(page).toHaveURL(/#finance-dre$/);
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  await expect(page.locator(".dre-summary")).toContainText("Resultado parcial");
  const report = await req(page, "/finance/dre?" + period);
  expect(report.facts).toHaveLength(1);
  expect(report.facts[0].amount_cents).toBe(500001);
  expect(report.facts[0].economic_date).toBe("2000-01-10");
  expect(
    report.lines.find((l: any) => l.code === "RB").known_amount_cents,
  ).toBe(500001);
  expect(
    report.lines.find((l: any) => l.code === "LL").final_amount_cents,
  ).toBeNull();
  const revenue = page
    .locator(".dre-lines tbody tr")
    .filter({ has: page.getByRole("rowheader", { name: /Receita bruta/ }) });
  await expect(revenue).toContainText("5.000,01");
  await page
    .getByRole("button", { name: "Detalhar Receita bruta", exact: true })
    .click();
  await expect(page.locator(".dre-screen-detail")).toContainText(
    "Serviço fictício de manutenção empresarial comprovado",
  );
  await expect(page.locator(".dre-screen-detail")).toContainText(
    "Conclusão do serviço conferida",
  );
  await evidence(page, "dre-known-partial");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto(`/app?source_id=${title.id}#finance-receivable`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Fechar janela", exact: true })
    .click();
  await page.getByRole("button", { name: "Tudo", exact: true }).click();
  const titleRow = page
    .getByRole("row")
    .filter({
      hasText: "Serviço fictício de manutenção empresarial comprovado",
    });
  await titleRow.getByRole("button", { name: "Quitar", exact: true }).click();
  await page
    .getByLabel("Principal nesta baixa (R$) *", { exact: true })
    .fill("R$ 2.000,01");
  const receipt = page.waitForResponse((r) =>
    r.url().endsWith(`/finance/${title.id}/settle`),
  );
  await page
    .getByRole("button", { name: "Registrar pagamento parcial", exact: true })
    .click();
  const paid = await (await receipt).json();
  expect(paid.remaining_cents).toBe(300000);
  expect((await req(page, "/finance/dre?" + period)).facts).toEqual(
    report.facts,
  );
  await titleRow
    .getByRole("button", { name: "Baixas (1)", exact: true })
    .click();
  await page
    .getByLabel("Motivo de estorno", { exact: true })
    .fill("Estorno bancário exclusivamente fictício");
  await page
    .getByRole("button", { name: "Estornar baixa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await req(page, "/finance/dre?" + period)).facts).toEqual(
    report.facts,
  );
  const after = await req(page, `/service-orders/${service.id}`);
  expect(after.titles).toHaveLength(1);
  expect(after.titles[0].id).toBe(title.id);
  await page.goto(
    "/app?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31#finance-dre",
  );
  await expect(
    page
      .locator(".dre-lines tbody tr")
      .filter({ has: page.getByRole("rowheader", { name: /Receita bruta/ }) }),
  ).toContainText("5.000,01");
  await expect(page.locator(".dre-summary")).toContainText("Resultado parcial");
  const folder = process.env.SILEX_DRE_HOME_EVIDENCE;
  if (folder)
    writeFileSync(
      join(folder, "lifecycle-" + page.viewportSize()!.width + ".json"),
      JSON.stringify(
        {
          service_id: service.id,
          title_id: title.id,
          customer_id: customer.id,
          expected_revenue_cents: 500001,
          known_revenue_cents: report.lines.find((l: any) => l.code === "RB")
            .known_amount_cents,
          remaining_after_partial: paid.remaining_cents,
          known_net_profit: report.lines.find((l: any) => l.code === "LL")
            .final_amount_cents,
          facts_before_after_receipt_and_reversal_equal: true,
          coverage_confirmations_created: 0,
        },
        null,
        2,
      ),
    );
});
