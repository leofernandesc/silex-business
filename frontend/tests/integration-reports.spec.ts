import { test, expect } from "./integrationTest";
import { enterDate } from "./dateHelpers";

test("all 26 reports: filtered pagination contracts, empty output, HTTP failure and recovery", async ({
  page,
}) => {
  test.setTimeout(180000);
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  const catalog = await (
    await page.request.get("/api/finance/reports/catalog")
  ).json();
  expect(catalog).toHaveLength(26);
  await page.goto("/app#finance-reports");
  const select = page.getByLabel("Relatório", { exact: true });
  await expect(select.locator("option")).toHaveCount(26);
  await enterDate(page, "De", "2001-01-01");
  await enterDate(page, "Até", "2001-01-31");
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  for (const report of catalog) {
    const pathname = "/api/finance/reports/" + report.id;
    const changed = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === pathname &&
        new URL(r.url()).searchParams.get("start") === "2001-01-01",
    );
    if ((await select.inputValue()) === report.id)
      await page
        .getByRole("button", { name: "Gerar relatório", exact: true })
        .click();
    else await select.selectOption(report.id);
    const response = await changed;
    expect(response.ok(), report.id).toBe(true);
    const value = await response.json();
    const section = page.locator(".finance-report-print");
    await expect(
      section.getByRole("heading", { name: value.name, exact: true }),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Imprimir", exact: true }),
    ).toBeEnabled();
    if (value.items.length === 0)
      await expect(section).toContainText("Nenhum registro encontrado");
    expect(value.page).toBe(1);
    expect(value.page_size).toBe(20);
    for (const number of [1, 2]) {
      const p = await page.request.get(
        pathname +
          "?start=2001-01-01&end=2001-01-31&page_size=1&page=" +
          number,
      );
      expect(p.ok(), report.id).toBe(true);
      const paged = await p.json();
      expect(paged.page).toBe(number);
      expect(paged.page_size).toBe(1);
      expect(paged.total).toBe(value.total);
      expect(paged.items).toEqual(value.items.slice(number - 1, number));
    }
    const csv = await page.request.get(
      pathname + ".csv?start=2001-01-01&end=2001-01-31",
    );
    expect(csv.ok(), report.id).toBe(true);
    expect((await csv.body()).subarray(0, 3).toString("hex")).toBe("efbbbf");
    expect(csv.headers()["content-type"]).toContain("text/csv");
    await page.emulateMedia({ media: "print" });
    await expect(section).toBeVisible();
    await expect(page.locator(".sidebar")).toBeHidden();
    await expect(section).toContainText(value.name);
    await page.emulateMedia({ media: "screen" });
    const pattern = "**/api/finance/reports/" + report.id + "?*";
    await page.route(pattern, (r) =>
      r.fulfill({
        status: 503,
        json: { detail: "Relatório temporariamente indisponível (fixture)." },
      }),
    );
    await page
      .getByRole("button", { name: "Gerar relatório", exact: true })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Relatório temporariamente indisponível",
    );
    await expect(
      section.getByRole("button", { name: "Imprimir", exact: true }),
    ).toBeDisabled();
    await page.unroute(pattern);
    await page
      .getByRole("button", { name: "Gerar relatório", exact: true })
      .click();
    await expect(
      section.getByRole("heading", { name: value.name, exact: true }),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Imprimir", exact: true }),
    ).toBeEnabled();
  }
});

test("report generation retries the same applied criteria after an HTTP failure", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  const pattern = "**/api/finance/reports/cash-monthly?*";
  await page.route(pattern, (r) =>
    r.fulfill({
      status: 503,
      json: { detail: "Consulta indisponível (fixture)." },
    }),
  );
  await page.goto("/app#finance-reports");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Consulta indisponível",
  );
  await page.unroute(pattern);
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/finance/reports/cash-monthly",
  );
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  expect((await response).ok()).toBe(true);
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("failed report is unavailable rather than a confirmed empty result", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  await page.route("**/api/finance/reports/cash-monthly?*", (r) =>
    r.fulfill({
      status: 503,
      json: { detail: "Consulta indisponível (fixture)." },
    }),
  );
  await page.goto("/app#finance-reports");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Consulta indisponível",
  );
  const section = page.locator(".finance-report-print");
  await expect(section).not.toContainText("Nenhum registro encontrado");
  await expect(section).toContainText("Dados do relatório indisponíveis");
  await expect(
    section.getByRole("button", { name: "Imprimir", exact: true }),
  ).toBeDisabled();
});

test("budget query failure is not represented as an empty confirmed budget", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  await page.route("**/api/finance/budgets?*", (r) =>
    r.fulfill({
      status: 503,
      json: { detail: "Orçamento indisponível (fixture)." },
    }),
  );
  await page.goto("/app#finance-reports");
  const panel = page
    .locator("section.panel")
    .filter({
      has: page.getByRole("heading", {
        name: "Orçamento mensal por categoria",
      }),
    });
  await expect(panel.getByRole("alert")).toContainText(
    "Orçamento indisponível",
  );
  await expect(panel).not.toContainText("Nenhum registro encontrado");
  await page.unroute("**/api/finance/budgets?*");
  await page
    .getByRole("button", { name: "Gerar relatório", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(panel).toContainText("Nenhum registro encontrado");
});

test('all report and CSV endpoints distinguish operator denial from missing session',async({browser})=>{
 const op=await browser.newContext({baseURL:'http://127.0.0.1:8011'}),visitor=await browser.newContext({baseURL:'http://127.0.0.1:8011'}),admin=await browser.newContext({baseURL:'http://127.0.0.1:8011'});
 try{
  expect((await admin.request.post('/api/auth/login',{data:{username:'demo.admin',password:'DemoLocal#2026'}})).ok()).toBe(true);
  expect((await op.request.post('/api/auth/login',{data:{username:'demo.operador',password:'DemoLocal#2026'}})).ok()).toBe(true);
  const catalog=await(await admin.request.get('/api/finance/reports/catalog')).json();expect(catalog).toHaveLength(26);
  for(const report of catalog)for(const suffix of ['', '.csv']){
   const path='/api/finance/reports/'+report.id+suffix;
   expect((await op.request.get(path)).status(),path).toBe(403);expect((await visitor.request.get(path)).status(),path).toBe(401);
  }
 }finally{await admin.close();await op.close();await visitor.close();}
});

test('page two print preserves current rows, long text, IDs and full cents on A4',async({page,browserName})=>{
 test.setTimeout(90000);
 expect((await page.request.post('/api/auth/login',{data:{username:'demo.admin',password:'DemoLocal#2026'}})).ok()).toBe(true);
 const reference=(await(await page.request.get('/api/finance')).json()).summary.as_of_date;
 const accounts=await(await page.request.get('/api/accounts')).json(),categories=await(await page.request.get('/api/categories')).json();
 const bank=accounts.find((a:any)=>a.kind==='bank'),category=categories.find((c:any)=>c.direction==='expense'||c.direction==='both');
 for(let i=0;i<23;i++)expect((await page.request.post('/api/finance',{data:{description:`Documento fictício ${i} `+'X'.repeat(140),direction:'expense',account_id:bank.id,category_id:category.id,amount_cents:99999999999-i,due_date:reference,competence_date:reference}})).status()).toBe(201);
 await page.goto('/app#finance-reports');await page.getByLabel('Relatório',{exact:true}).selectOption('payable-open');
 await enterDate(page,'De',reference);await enterDate(page,'Até',reference);
 const first=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/reports/payable-open'&&new URL(r.url()).searchParams.get('start')===reference);
 await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();const firstPage=await(await first).json();expect(firstPage.total).toBeGreaterThanOrEqual(23);
 const next=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/reports/payable-open'&&new URL(r.url()).searchParams.get('page')==='2');
 const section=page.locator('.finance-report-print');await section.getByRole('button',{name:'Próxima página'}).click();const data=await(await next).json();expect(data.page).toBe(2);expect(data.items.length).toBeGreaterThan(0);
 const rows=section.locator(':scope > .table-wrap tbody tr');await expect(rows).toHaveCount(data.items.length);
 for(let i=0;i<data.items.length;i++){const value=data.items[i];await expect(rows.nth(i)).toContainText(value.description);await expect(rows.nth(i).locator('td').nth(Object.keys(value).indexOf('id'))).toHaveText(String(value.id));await expect(rows.nth(i)).toContainText(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value.amount_cents/100));}
 await page.emulateMedia({media:'print'});await expect(section.locator('.finance-report-print-note')).toContainText('Página 2 de');await expect(section.locator('.finance-report-print-note')).toContainText(`${data.items.length} registros nesta página`);
 const bands=section.locator('.finance-report-column-bands');await expect(bands).toBeVisible();
 for(const value of data.items){await expect(bands).toContainText(value.description);await expect(bands).toContainText(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value.amount_cents/100));}
 for(const value of firstPage.items)expect(data.items.map((r:any)=>r.id)).not.toContain(value.id);
 if(browserName==='chromium')await page.pdf({path:'../docs/evidence/system-review/page-two-large-a4.pdf',format:'A4',printBackground:true});
});
