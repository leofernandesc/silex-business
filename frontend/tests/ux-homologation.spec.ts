import { test, expect, type Page } from "./integrationTest";
import AxeBuilder from "@axe-core/playwright";
import {randomUUID} from "node:crypto";
import { enterDate } from "./dateHelpers";
import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
async function req(
  page: Page,
  path: string,
  data?: unknown,
  status = data ? 201 : 200,
) {
  const r = data
    ? await page.request.post("/api" + path, { data })
    : await page.request.get("/api" + path);
  expect(r.status(), await r.text()).toBe(status);
  return r.json();
}
async function auth(page: Page) {
  await req(
    page,
    "/auth/login",
    { username: "demo.admin", password: process.env.SILEX_TEST_PASSWORD },
    200,
  );
}
async function evidence(page: Page, name: string) {
  const folder = process.env.SILEX_UX_EVIDENCE;
  if (folder) {
    mkdirSync(folder, { recursive: true });
    await page.screenshot({
      path: join(folder, name + ".png"),
      fullPage: true,
    });
  }
}

test("UX: empty DRE has an understandable empty state instead of unavailable rows", async ({
  page,
}) => {
  await auth(page);
  await page.goto(
    "/app?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31#finance-reports",
  );
  await expect(page.locator(".dre-report")).toBeVisible();
  await expect(
    page.getByText("Carregando DRE gerencial…", { exact: true }),
  ).toHaveCount(0);
  await evidence(page, "dre-empty");
  await expect(page.locator(".dre-report")).toContainText(
    "Nenhuma operação no período",
  );
  await expect(page.locator(".dre-lines")).toHaveCount(0);
});

test("UX: reversal action is reachable without horizontal scrolling with long descriptions and attachments", async ({
  page,
}) => {
  await auth(page);
  await page.setViewportSize({ width: 375, height: 812 });
  const today = (await req(page, "/dashboard")).date,
    accounts = await req(page, "/accounts"),
    cats = await req(page, "/categories");
  const bank = accounts.find((a: any) => a.kind === "bank");
  const entry = await req(page, "/finance", {
    description: "Serviço fictício com descrição extensa ".repeat(4),
    direction: "income",
    amount_cents: 10001,
    account_id: bank.id,
    category_id: cats.find(
      (c: any) => c.direction === "income" || c.direction === "both",
    ).id,
    due_date: today,
    competence_date: today,
  });
  const paid = await req(
    page,
    `/finance/${entry.id}/settle`,
    {
      method: "pix",
      account_id: bank.id,
      principal_cents: 10001,
      interest_cents: 0,
      fine_cents: 0,
      discount_cents: 0,
      request_key: randomUUID(),
    },
    200,
  );
  await req(page, `/finance/payments/${paid.payments[0].id}/attachments`, {
    filename: "Comprovante fictício com nome extenso.pdf",
    content_type: "application/pdf",
    content_base64: Buffer.from("%PDF-1.4\nFicticio\n").toString("base64"),
  });
  await page.goto(`/app?source_id=${entry.id}#finance-receivable`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await evidence(page, "payment-history");
  const box = await page
    .getByRole("button", { name: "Estornar baixa", exact: true })
    .boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const width of [1440, 1024, 768, 375])
  test(`UX: visual route and form inventory at ${width}px`, async ({
    page,
  }) => {
    await auth(page);
    await page.setViewportSize({ width, height: 900 });
    const rows: any[] = [];
    await req(page, "/customers", {
      name: "Empresa fictícia " + "X".repeat(130),
    });
    await req(page, "/products", {
      code: "UX-LONG",
      description: "Serviço fictício " + "Y".repeat(130),
      kind: "service",
      unit: "UN",
      price_cents: 100_000_000_000,
    });
    const routes = [
      ["customers", "Clientes"],
      ["products", "Produtos ou Serviços"],
      ["service-orders", "Serviços e pedidos"],
      ["sales", "Vendas"],
      ["finance-receivable", "Contas a Receber"],
      ["finance-payable", "Contas a Pagar"],
      ["finance-dashboard", "Visão financeira"],
      ["finance", "Lançamentos"],
      ["finance-plan", "Plano financeiro"],
      ["finance-reports", "Relatórios Financeiros"],
    ];
    for (const [route, title] of routes) {
      await page.goto("/app#" + route);
      await expect(page.locator(".page-title h1")).toContainText(title);
      await expect(
        page.locator('main [role="status"]').filter({ hasText: /^Carregando/ }),
      ).toHaveCount(0);
      const measure = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      rows.push({ route, ...measure });
      const add = page
        .locator(".page-title button")
        .filter({
          hasText:
            /Novo cliente|Novo item|Novo serviço|Nova receita|Nova despesa|Novo lançamento|Nova categoria/,
        })
        .first();
      if (await add.count()) {
        await add.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        rows.push({
          route: route + ":form",
          ...(await page
            .getByRole("dialog")
            .evaluate((el) => ({
              content: el.scrollWidth,
              width: el.clientWidth,
            }))),
        });
        if (
          (route === "customers" || route === "service-orders") &&
          (width === 1440 || width === 375)
        )
          await evidence(page, route + "-form-" + width);
        await page.keyboard.press("Escape");
      }
    }
    const folder = process.env.SILEX_UX_EVIDENCE;
    if (folder) {
      mkdirSync(folder, { recursive: true });
      writeFileSync(
        join(folder, `layout-${width}.json`),
        JSON.stringify(rows, null, 2),
      );
    }
    expect(
      rows.filter(
        (row) => row.document > row.viewport || row.content > row.width,
      ),
    ).toEqual([]);
  });

const accepted = [
  "5000,01",
  "5000.01",
  "R$ 5000,01",
  "R$ 5000.01",
  "R$ 5.000,01",
  "R$ 5,000.01",
  "5000",
  "R$ 5000",
];
for (const [index, value] of accepted.entries())
  test(`UX money: ${index + 1} product value persists in integer cents`, async ({
    page,
  }) => {
    await auth(page);
    await page.goto("/app#products");
    await page.getByRole("button", { name: "Novo item", exact: true }).click();
    const name = `Item fictício de moeda ${index}`;
    await page.getByLabel("Descrição *", { exact: true }).fill(name);
    await page
      .getByLabel("Código *", { exact: true })
      .fill("UX-MONEY-" + index);
    const price = page.getByLabel("Preço de venda (R$) *", { exact: true });
    await price.fill(value);
    await expect(price).toHaveValue(value);
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/products") && r.request().method() === "POST",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Salvar", exact: true })
      .click();
    const response = await saved;
    expect(response.status()).toBe(201);
    const product = await response.json();
    expect(product.price_cents).toBe(index < 6 ? 500001 : 500000);
    await page.reload();
    await page
      .getByRole("button", { name: "Editar " + name, exact: true })
      .click();
    await expect(price).toHaveValue(index < 6 ? "5000,01" : "5000,00");
    await price.fill("R$ 5,000.01");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Salvar", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      (await req(page, "/products?q=" + product.code)).items[0].price_cents,
    ).toBe(500001);
  });
for (const value of ["1.000", "R$ 5.000,001", "R$ 1 2", "-R$ 5,00"])
  test(`UX money: invalid ${value} never saves a product`, async ({ page }) => {
    await auth(page);
    await page.goto("/app#products");
    await page.getByRole("button", { name: "Novo item", exact: true }).click();
    await page
      .getByLabel("Descrição *", { exact: true })
      .fill("Item fictício inválido");
    await page.getByLabel("Código *", { exact: true }).fill("UX-INVALID");
    await page.getByLabel("Preço de venda (R$) *", { exact: true }).fill(value);
    let posts = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/products") && r.method() === "POST") posts++;
    });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Salvar", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
    expect(posts).toBe(0);
    await expect(
      page.getByLabel("Preço de venda (R$) *", { exact: true }),
    ).toHaveValue(value);
  });

for (const direction of ["income", "expense"])
  test(`UX money: ${direction} partial payment and reversal preserve cents and one mutation`, async ({
    page,
  }) => {
    await auth(page);
    await page.goto(
      "/app#finance-" + (direction === "income" ? "receivable" : "payable"),
    );
    await page
      .getByRole("button", {
        name: direction === "income" ? "Nova receita" : "Nova despesa",
        exact: true,
      })
      .click();
    const description = "Título fictício de moeda " + direction;
    await page.getByLabel("Histórico *", { exact: true }).fill(description);
    await page
      .getByLabel("Valor de cada título (R$) *", { exact: true })
      .fill("R$ 5.000,01");
    const created = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/finance") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Criar título", exact: true })
      .click();
    const entry = await (await created).json();
    expect(entry.amount_cents).toBe(500001);
    const row = page.getByRole("row").filter({ hasText: description });
    await row.getByRole("button", { name: "Quitar", exact: true }).click();
    await page
      .getByLabel("Principal nesta baixa (R$) *", { exact: true })
      .fill("R$ 2,000.01");
    await page.getByLabel("Juros (R$)", { exact: true }).fill("R$ 1,01");
    await page.getByLabel("Multa (R$)", { exact: true }).fill("R$ 0.02");
    await page.getByLabel("Desconto (R$)", { exact: true }).fill("R$ 0,03");
    const settlement = page.waitForResponse((r) =>
      r.url().endsWith(`/api/finance/${entry.id}/settle`),
    );
    await page
      .getByRole("button", { name: "Registrar pagamento parcial", exact: true })
      .click();
    const paid = await (await settlement).json();
    expect(paid.remaining_cents).toBe(300000);
    expect(paid.payments[0].amount_cents).toBe(
      direction === "income" ? 200101 : -200101,
    );
    await row.getByRole("button", { name: "Baixas (1)", exact: true }).click();
    const reverse = page.getByRole("button", {
      name: "Estornar baixa",
      exact: true,
    });
    await expect(reverse).toBeDisabled();
    await page
      .getByLabel("Motivo de estorno", { exact: true })
      .fill("Correção fictícia conferida");
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/reverse")) posts++;
    });
    await reverse.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(posts).toBe(1);
    const after = (
      await req(page, "/finance?q=" + encodeURIComponent(description))
    ).items[0];
    expect(after.remaining_cents).toBe(500001);
    expect(after.payments).toHaveLength(2);
    expect(
      after.payments[0].amount_cents + after.payments[1].amount_cents,
    ).toBe(0);
  });

test("UX money: signed balances, percentage rates and budgets use their own contracts", async ({
  page,
}) => {
  await auth(page);
  await page.goto("/app#finance-accounts");
  await page.getByRole("button", { name: "Nova conta", exact: true }).click();
  await page
    .getByLabel("Nome *", { exact: true })
    .fill("Conta fictícia com saldo assinado");
  await page
    .getByLabel("Saldo inicial (R$) *", { exact: true })
    .fill("-R$ 5,000.01");
  await page.getByLabel("Juros por mês (%)", { exact: true }).fill("2,50");
  await page.getByLabel("Multa (%)", { exact: true }).fill("1,00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const account = (await req(page, "/accounts")).find(
    (a: any) => a.name === "Conta fictícia com saldo assinado",
  );
  expect(account.opening_cents).toBe(-500001);
  expect(account.interest_bps).toBe(250);
  expect(account.fine_bps).toBe(100);
  await page.goto("/app#finance-reports");
  await page.getByRole("button", { name: "Nova meta", exact: true }).click();
  await page
    .getByLabel("Categoria *", { exact: true })
    .selectOption({ index: 1 });
  await page
    .getByLabel("Meta mensal (R$) *", { exact: true })
    .fill("R$ 5.000,01");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const now = (await req(page, "/dashboard")).date;
  expect(
    (
      await req(
        page,
        `/finance/budgets?year=${now.slice(0, 4)}&month=${Number(now.slice(5, 7))}`,
      )
    ).some((b: any) => b.target_cents === 500001),
  ).toBe(true);
});

test("UX money: service costs and daily quantities persist independently after edit", async ({
  page,
}) => {
  await auth(page);
  const customer = await req(page, "/customers", {
      name: "Empresa fictícia do serviço",
    }),
    worker = await req(page, "/suppliers", {
      name: "Prestador fictício de diárias",
      kind: "day_worker",
      default_rate_cents: 10001,
    });
  await page.goto("/app#service-orders");
  await page
    .getByRole("button", { name: "Novo serviço/pedido", exact: true })
    .click();
  await page
    .getByLabel("Cliente *", { exact: true })
    .selectOption(String(customer.id));
  await page
    .getByLabel("Descrição do serviço/pedido *", { exact: true })
    .fill("Serviço fictício com valores naturais");
  await page
    .getByLabel("Valor negociado (R$) *", { exact: true })
    .fill("R$ 5,000.01");
  await page
    .getByRole("button", { name: "Adicionar diarista", exact: true })
    .click();
  await page
    .getByLabel("Diarista *", { exact: true })
    .selectOption(String(worker.id));
  await page
    .getByLabel("Quantidade de diárias *", { exact: true })
    .fill("0,125");
  await page
    .getByLabel("Valor acordado neste serviço (R$) *", { exact: true })
    .fill("R$ 2.000,01");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/service-orders") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cadastrar serviço", exact: true })
    .click();
  const order = await (await response).json();
  expect(order.negotiated_cents).toBe(500001);
  expect(order.costs[0].agreed_amount_cents).toBe(200001);
  expect(order.costs[0].quantity_milli).toBe(125);
  await page.reload();
  await page
    .getByRole("button", { name: "Editar " + order.code, exact: true })
    .click();
  await expect(
    page.getByLabel("Valor negociado (R$) *", { exact: true }),
  ).toHaveValue("5000,01");
  await expect(
    page.getByLabel("Quantidade de diárias *", { exact: true }),
  ).toHaveValue("0,125");
  await expect(
    page.getByLabel("Valor acordado neste serviço (R$) *", { exact: true }),
  ).toHaveValue("2000,01");
});

test("UX money: draft sale values and discounts preserve quantity precision and cursor", async ({
  page,
}) => {
  await auth(page);
  await req(page, "/products", {
    code: "UX-SALE",
    description: "Serviço fictício para venda",
    kind: "service",
    unit: "HR",
    price_cents: 500001,
  });
  await page.goto("/app#pos");
  await page
    .getByRole("button")
    .filter({ hasText: "Serviço fictício para venda" })
    .click();
  const price = page.getByLabel("Valor unitário (R$)", { exact: true });
  await price.fill("R$ 5.000,01");
  await price.evaluate((input: HTMLInputElement) =>
    input.setSelectionRange(5, 5),
  );
  await price.press("2");
  await expect(price).toHaveValue("R$ 5.2000,01");
  expect(
    await price.evaluate((input: HTMLInputElement) => input.selectionStart),
  ).toBe(6);
  await price.fill("R$ 5,000.01");
  await page.getByLabel("Quantidade (HR)", { exact: true }).fill("0,125");
  await page.getByLabel("Desconto total (R$)", { exact: true }).fill("R$ 0,01");
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/sales") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  const sale = await (await saved).json();
  expect(sale.items[0].unit_price_cents).toBe(500001);
  expect(sale.items[0].quantity_milli).toBe(125);
  expect(sale.total_cents).toBe(62499);
});

for (const width of [1440, 375])
  test(`UX DRE: service lifecycle, classification, partial and complete coverage at ${width}px`, async ({
    page,
  }, info) => {
    await auth(page);
    await page.setViewportSize({ width, height: 900 });
    const customer = await req(page, "/customers", {
        name: "Empresa fictícia da DRE",
      }),
      bank = (await req(page, "/accounts")).find((a: any) => a.kind === "bank");
    const order = await req(page, "/service-orders", {
      customer_id: customer.id,
      description: "Serviço fictício comprovado para homologação",
      service_date: "2000-01-10",
      negotiated_cents: 500001,
      costs: [],
    });
    await req(
      page,
      `/service-orders/${order.id}/complete`,
      {
        completed_on: "2000-01-10",
        reason: "Documento fictício da execução integral",
        incurred_costs: [],
        request_key: randomUUID(),
      },
      200,
    );
    const generated = await req(
      page,
      `/service-orders/${order.id}/generate-titles`,
      {
        account_id: bank.id,
        due_date: "2000-01-20",
        competence_date: "2000-01-10",
      },
      200,
    );
    const title = generated.service_order.titles[0];
    const query = "start=2000-01-01&end=2000-01-31",
      url =
        "/app?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31#finance-reports";
    await page.goto(url);
    await expect(page.locator(".dre-summary")).toContainText(
      "Informações insuficientes para apresentar",
    );
    expect(await page.locator(".dre-report").innerText()).not.toContain(
      "versão 0",
    );
    await evidence(page, "dre-pending-" + width);
    await page
      .getByRole("link", {
        name: "Configuração da DRE",
        exact: true,
      })
      .click();
    await page.getByRole("button",{name:"Classificar esta operação",exact:true}).click();
    await page.getByLabel("Rubrica DRE", { exact: true }).selectOption("RB");
    await enterDate(page, "Vigência inicial da DRE", "2000-01-01");
    await enterDate(page, "Vigência final da DRE", "2000-01-31");
    await page
      .getByLabel("Motivo da classificação DRE", { exact: true })
      .fill("Comprovação exclusivamente fictícia de prestação de serviços");
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
      page.getByText("Classificação registrada com histórico.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto(url);
    await expect(page.locator(".dre-summary")).toContainText(
      "Resultado parcial",
    );
    let report = await req(page, "/finance/dre?" + query);
    expect(report.facts).toHaveLength(1);
    expect(
      report.lines.find((r: any) => r.code === "RB").known_amount_cents,
    ).toBe(500001);
    expect(
      report.lines.find((r: any) => r.code === "LL").final_amount_cents,
    ).toBeNull();
    await page
      .getByRole("button", { name: "Detalhar Receita bruta", exact: true })
      .click();
    expect(report.facts[0].recognition_basis).toBe("verified_finalization");
    await expect(page.locator(".dre-screen-detail code")).toHaveCount(0);
    await expect(page.locator(".dre-screen-detail")).toContainText(
      "Serviço fictício comprovado para homologação",
    );
    if(width===375){for(const cell of await page.locator('.dre-screen-detail tbody td').all())expect((await cell.boundingBox())!.width).toBeGreaterThan(250)}
    await evidence(page, "dre-partial-" + width);
    if(process.env.SILEX_UX_EVIDENCE&&width===1440&&process.env.SILEX_INTEGRATION_BROWSER!=='firefox'){
      await page.emulateMedia({media:'print'});
      for(const button of await page.locator('.dre-report button').all())await expect(button).toBeHidden();
      await page.pdf({path:join(process.env.SILEX_UX_EVIDENCE,'dre-partial-a4.pdf'),format:'A4',printBackground:true});
      await page.emulateMedia({media:'screen'});
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const today = (await req(page, "/dashboard")).date;
    const paid = await req(
      page,
      `/finance/${title.id}/settle`,
      {
        method: "pix",
        account_id: bank.id,
        principal_cents: 200001,
        interest_cents: 0,
        fine_cents: 0,
        discount_cents: 0,
        posting_date: today,
        request_key: randomUUID(),
      },
      200,
    );
    expect(paid.remaining_cents).toBe(300000);
    expect((await req(page, "/finance/dre?" + query)).facts).toEqual(
      report.facts,
    );
    await req(
      page,
      `/finance/payments/${paid.payments[0].id}/reverse`,
      { reason: "Estorno fictício sem cancelamento econômico" },
      200,
    );
    expect((await req(page, "/finance/dre?" + query)).facts).toEqual(
      report.facts,
    );
    // Confirmations below are deliberately fictitious evidence, never real-company defaults.
    for (const line of [
      "RB",
      "DED",
      "CD",
      "DO",
      "OR",
      "OD",
      "DA",
      "FI",
      "FE",
      "TL",
    ]) {
      report = await req(page, "/finance/dre?" + query);
      await req(page, "/finance/dre/component-assertions", {
        start: "2000-01-01",
        end: "2000-01-31",
        source_fingerprint: report.source_fingerprint,
        line_code: line,
        assertion_kind: "complete",
        reason:
          "Cobertura e zeros comprovados SOMENTE nesta fixture descartável",
      });
    }
    await page.reload();
    await expect(page.locator(".dre-summary")).toHaveText(
      "Demonstrativo completo para o período.",
    );
    report = await req(page, "/finance/dre?" + query);
    expect(
      report.lines.find((r: any) => r.code === "LL").final_amount_cents,
    ).toBe(500001);
    await evidence(page, "dre-complete-" + width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const download = page.waitForEvent("download");
    await page
      .locator(".dre-report")
      .getByRole("button", { name: "Exportar CSV", exact: true })
      .click();
    const file = await download,
      csv = readFileSync((await file.path())!, "utf8");
    expect(csv).toContain("5.000,01");
    expect(csv).not.toContain("Identificador técnico (auditoria)");
    expect(csv).not.toMatch(/finance_entry:|service_order:|Fingerprint|Versão/);
    const folder = process.env.SILEX_UX_EVIDENCE;
    if (folder)
      await file.saveAs(join(folder, "dre-complete-" + width + ".csv"));
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".dre-lines")).toContainText("5.000,01");
    await expect(page.locator(".dre-print-facts")).toHaveCount(0);
    await expect(page.locator(".dre-administration")).toHaveCount(0);
    for(const button of await page.locator('.dre-report button').all())await expect(button).toBeHidden();
    if (
      folder &&
      width === 1440 &&
      process.env.SILEX_INTEGRATION_BROWSER !== "firefox"
    )
      await page.pdf({
        path: join(folder, "dre-a4.pdf"),
        format: "A4",
        printBackground: true,
      });
  });
