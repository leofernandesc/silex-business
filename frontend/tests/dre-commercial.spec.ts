import { test, expect, type Page } from "./integrationTest";
import { enterDate } from "./dateHelpers";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
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
const forbidden =
  /Pendências econômicas|Versão de classificação|Versão de reconhecimento|Identificador técnico|finance_entry:\d|service_order:\d|Fingerprint|Rastreabilidade técnica|Revisar reconhecimento|Revisar cobertura/;
async function configure(page: Page, category: number) {
  await page
    .getByLabel("Categoria para configurar", { exact: true })
    .selectOption(String(category));
  await page.getByLabel("Rubrica DRE", { exact: true }).selectOption("RB");
  await enterDate(page, "Vigência inicial da DRE", "2000-01-01");
  await page
    .getByLabel("Motivo da classificação DRE", { exact: true })
    .fill(
      "Receita de prestação comprovada em documentos inteiramente fictícios",
    );
  await page
    .getByRole("button", { name: "Prévia do impacto", exact: true })
    .click();
  await expect(page.getByText(/fontes potencialmente afetadas/)).toBeVisible();
  await page
    .getByRole("button", {
      name: "Confirmar classificação revisada",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Classificação registrada com histórico.", { exact: true }),
  ).toBeVisible();
}
async function commercial(page: Page) {
  await page
    .getByRole("link", {
      name: "Consultar demonstrativo financeiro",
      exact: true,
    })
    .click();
  await expect(page.locator(".dre-summary")).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(forbidden);
  expect(await page.locator("main code").count()).toBe(0);
}

test("DRE commercial: reusable setup, uncompleted service and manual evidence stay outside the statement and exports", async ({
  page,
}, info) => {
  await req(
    page,
    "/auth/login",
    { username: "demo.admin", password: process.env.SILEX_TEST_PASSWORD },
    200,
  );
  const today = (await req(page, "/dashboard")).date;
  const period = { start: "2000-01-01", end: "2000-01-31" };
  await page.goto(
    "/app?dre_view=dre&dre_start=2000-01-01&dre_end=2000-01-31#finance-dre-config",
  );
  const categories = await req(page, "/categories"),
    category = categories.find((c: any) => c.name === "Vendas");
  expect(category).toBeTruthy();
  // Explicit human mapping, not automatic classification from this label.
  await configure(page, category.id);
  const customer = await req(page, "/customers", {
      name: "Cliente sintético de configuração reutilizável",
    }),
    account = (await req(page, "/accounts")).find(
      (a: any) => a.kind === "bank",
    );
  async function service(completed: boolean) {
    const s = await req(page, "/service-orders", {
      customer_id: customer.id,
      description: "Prestação fictícia para DRE comercial",
      service_date: "2000-01-10",
      negotiated_cents: 500001,
      costs: [],
    });
    if (completed)
      await req(
        page,
        `/service-orders/${s.id}/complete`,
        {
          completed_on: "2000-01-10",
          reason: "Documento fictício comprova a execução integral",
          request_key: "commercial-completion-" + s.id,
          incurred_costs: [],
        },
        200,
      );
    await req(
      page,
      `/service-orders/${s.id}/generate-titles`,
      {
        account_id: account.id,
        due_date: "2000-01-20",
        competence_date: "2000-01-10",
      },
      200,
    );
    return req(page, `/service-orders/${s.id}`);
  }
  const service1 = await service(true);
  await commercial(page);
  await expect(page.locator(".dre-lines")).toContainText("5.000,01");
  const earlyFolder=process.env.SILEX_DRE_COMMERCIAL_EVIDENCE;
  if(earlyFolder){mkdirSync(earlyFolder,{recursive:true});await page.screenshot({path:join(earlyFolder,`service-500001-${info.project.name}.png`),fullPage:true})}
  const report = await req(page, "/finance/dre?" + new URLSearchParams(period));
  expect(report.facts).toHaveLength(1);
  expect(report.facts[0].amount_cents).toBe(500001);
  const title = service1.titles[0];
  const paid = await req(
    page,
    `/finance/${title.id}/settle`,
    {
      account_id: account.id,
      principal_cents: 200001,
      method: "pix",
      request_key: "commercial-fixture-receipt",
    },
    200,
  );
  const reconciliation = await req(
    page,
    "/finance/dre/reconciliation?" + new URLSearchParams(period),
  );
  expect(
    reconciliation.reconciliation.find(
      (r: any) => r.key === report.facts[0].key,
    ).outstanding_principal_cents,
  ).toBe(300000);
  expect(
    (await req(page, "/finance/dre?" + new URLSearchParams(period))).facts,
  ).toEqual(report.facts);
  await req(
    page,
    `/finance/payments/${paid.payments[0].id}/reverse`,
    { reason: "Estorno fictício sem cancelamento econômico" },
    200,
  );
  expect(
    (await req(page, "/finance/dre?" + new URLSearchParams(period))).facts,
  ).toEqual(report.facts);
  const uncompleted = await service(false);
  await page
    .getByRole("link", { name: "Configuração da DRE", exact: true })
    .click();
  await expect(page.locator(".dre-configuration")).toContainText(
    "Serviço ainda não concluído",
  );
  await expect(
    page.getByRole("button", {
      name: `Revisar reconhecimento de Receita do serviço #${uncompleted.id}`,
      exact: true,
    }),
  ).toHaveCount(0);
  // A second valid service uses the same mapping, with no recognition decision.
  const next = await service(true);
  const result = await req(page, "/finance/dre?" + new URLSearchParams(period));
  expect(
    result.facts.filter((f: any) => f.source_type === "service_order"),
  ).toHaveLength(2);
  expect(
    result.facts.find((f: any) => f.source_id === next.id).amount_cents,
  ).toBe(500001);
  const manual = await req(page, "/finance", {
    description: "Receita avulsa sintética comprovável",
    direction: "income",
    amount_cents: 10001,
    category_id: category.id,
    account_id: account.id,
    due_date: "2000-01-10",
    competence_date: "2000-01-10",
  });
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Revisar reconhecimento de Conta a receber #${manual.id}`,
      exact: true,
    })
    .click();
  await enterDate(page, "Data econômica comprovada", "2000-01-10");
  await page
    .getByLabel("Tipo de evidência *", { exact: true })
    .fill("Documento sintético da prestação avulsa");
  await page
    .getByLabel("Justificativa e evidência *", { exact: true })
    .fill("Execução e data conferidas exclusivamente nesta fixture");
  await page
    .getByRole("button", { name: "Confirmar revisão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: `Revisar reconhecimento de Conta a receber #${manual.id}`,
      exact: true,
    }),
  ).toHaveCount(0);
  const final = await req(page, "/finance/dre?" + new URLSearchParams(period));
  expect(final.facts).toHaveLength(3);
  expect(final.lines.find((l: any) => l.code === "RB").known_amount_cents).toBe(
    1010003,
  );
  expect(
    final.lines.find((l: any) => l.code === "LL").final_amount_cents,
  ).toBeNull();
  expect(
    final.issues.filter(
      (i: any) => i.key === `service_order:${uncompleted.id}:revenue`,
    ),
  ).toHaveLength(1);
  const diagnostic = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar diagnóstico CSV", exact: true })
    .click();
  const audit = readFileSync((await (await diagnostic).path())!, "utf8");
  expect(audit).toContain(`service_order:${uncompleted.id}:revenue`);
  expect(audit).toContain(final.source_fingerprint);
  if(earlyFolder){expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await page.screenshot({path:join(earlyFolder,`configuration-${info.project.name}.png`),fullPage:true})}
  await commercial(page);
  await expect(page.locator(".dre-summary")).toContainText("Resultado parcial");
  await expect(page.locator(".dre-lines")).toContainText("10.100,03");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const file = await download,
    csv = readFileSync((await file.path())!, "utf8");
  expect(csv).not.toMatch(forbidden);
  expect(csv).not.toContain(final.source_fingerprint);
  expect(csv).toContain("10.100,03");
  expect(csv).toContain("Resultado parcial");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const folder = process.env.SILEX_DRE_COMMERCIAL_EVIDENCE;
  if (folder) {
    mkdirSync(folder, { recursive: true });
    await page.screenshot({
      path: join(folder, `commercial-${info.project.name}.png`),
      fullPage: true,
    });
    writeFileSync(join(folder, `commercial-${info.project.name}.csv`), csv);
    writeFileSync(join(folder, `audit-${info.project.name}.csv`), audit);
  }
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".dre-report")).toBeVisible();
  expect(await page.locator(".dre-report").innerText()).not.toMatch(forbidden);
  await expect(page.locator(".dre-report")).toContainText("10.100,03");
  await expect(page.locator(".dre-configuration-link")).toBeHidden();
  if (
    folder &&
    info.project.name === "desktop" &&
    process.env.SILEX_INTEGRATION_BROWSER !== "firefox"
  )
    await page.pdf({
      path: join(folder, "commercial-a4.pdf"),
      format: "A4",
      printBackground: true,
    });
});

test("DRE commercial: administrative destination is denied to operator and visitor", async ({
  page,
}) => {
  for (const [username, status] of [
    [null, 401],
    ["demo.operador", 403],
  ] as const) {
    if (username)
      await req(
        page,
        "/auth/login",
        { username, password: process.env.SILEX_TEST_PASSWORD },
        200,
      );
    await page.goto("/app#finance-dre-config");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Configuração da DRE",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Categoria para configurar", { exact: true }),
    ).toHaveCount(0);
    for (const path of [
      "/finance/dre",
      "/finance/dre/mappings",
      "/finance/dre/issues",
      "/finance/dre.csv",
    ])
      expect(
        (
          await page.request.get("/api" + path, {
            params: { start: "2000-01-01", end: "2000-01-31" },
          })
        ).status(),
      ).toBe(status);
  }
});
