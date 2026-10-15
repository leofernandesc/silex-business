import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dateField, enterDate, expectDate } from "./dateHelpers";

const evidence = "../docs/evidence/sb07c";
const password = process.env.SILEX_TEST_PASSWORD!;
async function go(page: Page, origin: string, route: string) {
  await page.goto(`${origin}/app#${route}`);
  await expect(page.locator('main h1')).toBeVisible();
}
async function date(page: Page, variant: string, label: string, iso: string) {
  if (variant === 'baseline') await page.getByLabel(label, { exact: true }).fill(iso);
  else { await enterDate(page, label, iso); await expectDate(page, label, iso); }
}
for (const locale of ['pt-BR', 'en-US']) {
  test(`pilot: Services, credit sales and opening balance preserve ISO and results ${locale}`, async ({ browser }, info) => {
    test.setTimeout(120000);
    expect(password).toBeTruthy(); mkdirSync(evidence + '/screenshots', { recursive: true });
    const suffix = `${info.project.name}-${locale}-${Date.now()}`;
    const records: Record<string, unknown> = {};
    for (const [variant, origin] of [['baseline','http://127.0.0.1:18084'],['candidate','http://127.0.0.1:18085']]) {
      const context = await browser.newContext({ locale, timezoneId: 'America/Manaus', viewport: { width: 375, height: 900 } });
      try {
        const page = await context.newPage(), payloads: unknown[] = [], errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        expect((await page.request.post(origin+'/api/auth/login', { data: { username:'demo.admin', password } })).ok()).toBe(true);
        async function save(path: string, method: string, button: string) {
          const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api' + path && r.request().method() === method);
          await page.getByRole('button', { name: button, exact: true }).click();
          const result = await response; expect(result.ok(), await result.text()).toBe(true);
          payloads.push(result.request().postDataJSON()); return result.json();
        }
        await go(page, origin, 'service-orders');
        await page.getByRole('button', { name:'Novo serviço/pedido', exact:true }).click();
        await page.getByLabel('Cliente *', { exact:true }).selectOption({ index:1 });
        const description = 'Serviço SB07C ' + suffix;
        await page.getByLabel('Descrição do serviço/pedido *', { exact:true }).fill(description);
        await page.getByLabel('Valor negociado (R$) *', { exact:true }).fill('1234,56');
        await date(page, variant, 'Data do serviço *', '2026-03-04');
        await page.screenshot({ path:`${evidence}/screenshots/${variant}-service-${info.project.name}-${locale}-375.png` });
        const order = await save('/service-orders','POST','Cadastrar serviço');
        const row = page.getByRole('row').filter({ hasText:description }); await expect(row).toContainText('04/03/2026');
        await row.getByRole('button', { name:'Editar '+order.code, exact:true }).click();
        await date(page, variant, 'Data do serviço *', '2024-02-29');
        await save(`/service-orders/${order.id}`,'PUT','Salvar alterações');
        await page.reload(); await expect(row).toContainText('29/02/2024');
        const stored = await (await page.request.get(origin+`/api/service-orders/${order.id}`)).json();
        expect(stored.service_date).toBe('2024-02-29');
        await row.getByRole('button', { name:'Gerar títulos', exact:true }).click();
        await page.getByLabel('Conta associada aos títulos *', { exact:true }).selectOption({ index:1 });
        await date(page, variant, 'Vencimento *', '2026-12-31');
        await date(page, variant, 'Competência *', '2027-01-01');
        await save(`/service-orders/${order.id}/generate-titles`,'POST','Confirmar geração de títulos');
        await expect(row).toContainText('Títulos gerados');

        await go(page, origin, 'finance-accounts');
        await page.getByRole('button', { name:'Nova conta', exact:true }).click();
        const name = 'Conta SB07C ' + suffix;
        await page.getByLabel('Nome *', { exact:true }).fill(name);
        await page.getByLabel('Saldo inicial (R$) *', { exact:true }).fill('125,67');
        await date(page, variant, 'Referência do saldo inicial *', '2024-02-29');
        await page.screenshot({ path:`${evidence}/screenshots/${variant}-opening-${info.project.name}-${locale}-375.png` });
        const account = await save('/accounts','POST','Salvar');
        await expect(page.getByRole('row').filter({ hasText:name })).toContainText('125,67');
        await page.getByRole('button', { name:`Editar ${name}`, exact:true }).click();
        await date(page, variant, 'Referência do saldo inicial *', '2026-03-04');
        await save(`/accounts/${account.id}`,'PUT','Salvar');
        await page.reload(); await expect(page.getByRole('row').filter({ hasText:name })).toBeVisible();

        if (!(await (await page.request.get(origin+'/api/cash-sessions/current')).json())) expect((await page.request.post(origin+'/api/cash-sessions',{data:{opening_cents:0}})).ok()).toBe(true);
        const customers = await (await page.request.get(origin+'/api/customers')).json();
        const product = await (await page.request.post(origin+'/api/products',{data:{code:'D'+suffix,description:'Item SB07C '+suffix,kind:'service',unit:'UN',price_cents:1234}})).json();
        await go(page, origin, 'pos');
        await page.locator('.product-tile').filter({ hasText:product.description }).click();
        await page.getByLabel('Cliente', { exact:true }).selectOption(String(customers.items[0].id));
        await page.getByLabel('Forma de pagamento', { exact:true }).selectOption('credit');
        await date(page, variant, 'Vencimento *', '2026-12-31');
        await page.screenshot({ path:`${evidence}/screenshots/${variant}-credit-${info.project.name}-${locale}-375.png` });
        const finalized = page.waitForResponse(r => /\/api\/sales\/\d+\/finalize$/.test(new URL(r.url()).pathname) && r.request().method()==='POST');
        await page.getByRole('button', { name:'Finalizar venda', exact:true }).click();
        const saleResponse = await finalized; expect(saleResponse.ok(),await saleResponse.text()).toBe(true); payloads.push(saleResponse.request().postDataJSON());
        const sale = await saleResponse.json(); expect(sale.due_date).toBe('2026-12-31');
        await page.getByRole('button', { name:'Fechar janela', exact:true }).click();

        const draft = await (await page.request.post(origin+'/api/sales',{data:{customer_id:customers.items[0].id,items:[{product_id:product.id,quantity_milli:1000,unit_price_cents:1234}]}})).json();
        await go(page, origin, 'sales');
        await page.getByRole('button', { name:`Ver venda ${draft.id}`, exact:true }).click();
        await page.getByLabel('Pagamento', { exact:true }).selectOption('credit');
        await date(page, variant, 'Vencimento *', '2026-12-31');
        const detail = await save(`/sales/${draft.id}/finalize`,'POST','Finalizar rascunho');
        expect(detail.due_date).toBe('2026-12-31');
        const dash = await (await page.request.get(origin+'/api/finance/dashboard?start=2026-01-01&end=2027-12-31')).json();
        records[variant] = { payloads, service: { date:stored.service_date, revenue:stored.negotiated_cents, expected:stored.expected_result_cents }, sales:[sale,detail].map(s=>({due_date:s.due_date,total_cents:s.total_cents,status:s.status,finance_status:s.finance_status})), dashboard:dash };
        expect(errors).toEqual([]);
      } finally { await context.close(); }
    }
    writeFileSync(`${evidence}/pilot-${info.project.name}-${locale}.json`,JSON.stringify(records,null,2));
    expect(records.candidate).toEqual(records.baseline);
  });
}

for (const locale of ['pt-BR', 'en-US']) {
  test(`migration: financial forms, all period filters and monthly competence ${locale}`, async ({ browser }, info) => {
    test.setTimeout(120000);
    const suffix = `${info.project.name}-${locale}-${Date.now()}`;
    const records: Record<string, unknown> = {};
    for (const [variant, origin] of [['baseline','http://127.0.0.1:18084'],['candidate','http://127.0.0.1:18085']]) {
      const context = await browser.newContext({ locale, timezoneId: locale === 'pt-BR' ? 'America/Manaus' : 'America/Sao_Paulo', viewport: { width:375,height:900 } });
      try {
        const page = await context.newPage(), payloads: Record<string, unknown>[] = [], queries: string[] = [];
        expect((await page.request.post(origin+'/api/auth/login',{data:{username:'demo.admin',password}})).ok()).toBe(true);
        async function save(path:string, button:string) {
          const waiting = page.waitForResponse(r=>new URL(r.url()).pathname==='/api'+path&&r.request().method()==='POST');
          await page.getByRole('button',{name:button,exact:true}).click();
          const result=await waiting;expect(result.ok(),await result.text()).toBe(true);
          const body=result.request().postDataJSON();delete body.request_key;payloads.push(body);return result.json();
        }
        await go(page,origin,'finance');
        await page.getByRole('button',{name:'Nova receita',exact:true}).click();
        await page.getByLabel('Histórico *',{exact:true}).fill('Movimento SB07C '+suffix);
        await page.getByLabel('Valor (R$) *',{exact:true}).fill('100,01');
        const posting=variant==='baseline'?await page.getByLabel('Data de lançamento *',{exact:true}).inputValue():await dateField(page,'Data de lançamento *').locator('input[type=date]').inputValue();
        await date(page,variant,'Data de lançamento *',posting);
        await date(page,variant,'Data de competência *','2024-02-29');
        const movement=await save('/finance/movements','Salvar lançamento');
        expect(movement.posting_date).toBe(posting);expect(movement.competence_date).toBe('2024-02-29');

        for (const [route, add] of [['finance-payable','Nova despesa'],['finance-receivable','Nova receita']]) {
          await go(page,origin,route);await page.getByRole('button',{name:add,exact:true}).click();
          await page.getByLabel('Histórico *',{exact:true}).fill('Título '+route+' '+suffix);
          await page.getByLabel('Valor de cada título (R$) *',{exact:true}).fill('234,56');
          await date(page,variant,'Vencimento *','2026-12-31');await date(page,variant,'Competência *','2027-01-01');
          await page.screenshot({path:`${evidence}/screenshots/${variant}-${route}-${info.project.name}-${locale}-375.png`});
          await save('/finance','Criar título');
        }
        for (const [route,path,button] of [
          ['finance','/api/finance/movements','Pesquisar'],['finance-payable','/api/finance','Pesquisar'],['finance-receivable','/api/finance','Pesquisar'],
          ['finance-dashboard','/api/finance/dashboard','Atualizar'],['finance-reports','/api/finance/reports/cash-monthly','Gerar relatório'],
          ['sales','/api/sales',''],['stock','/api/stock-movements',''],
        ]) {
          await go(page,origin,route);
          await date(page,variant,'De','2026-09-01');
          const waiting=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname===path&&u.searchParams.get('start')==='2026-09-01'&&u.searchParams.get('end')==='2026-10-31'});
          await date(page,variant,'Até','2026-10-31');
          if(button)await page.getByRole('button',{name:button,exact:true}).click();
          const response=await waiting;expect(response.ok()).toBe(true);queries.push(new URL(response.url()).search);
          if(variant==='candidate'){await expectDate(page,'De','2026-09-01');await expectDate(page,'Até','2026-10-31');}
          if(route==='finance-reports')await page.screenshot({path:`${evidence}/screenshots/${variant}-period-${info.project.name}-${locale}-375.png`});
        }
        await go(page,origin,'finance-reports');
        const budgetResponse=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/finance/budgets'&&u.searchParams.get('year')==='2026'&&u.searchParams.get('month')==='3'});
        if(variant==='baseline')await page.getByLabel('Mês',{exact:true}).fill('2026-03');
        else { await page.getByLabel('Mês: mês',{exact:true}).selectOption('03'); await page.getByLabel('Mês: ano',{exact:true}).fill('2026'); await page.getByLabel('Mês: ano',{exact:true}).press('Tab'); }
        expect((await budgetResponse).ok()).toBe(true);
        await page.getByRole('button',{name:'Nova meta',exact:true}).click();
        if(variant==='baseline')await expect(page.getByRole('dialog').getByLabel('Mês',{exact:true})).toHaveValue('2026-03');
        else {await expect(page.getByRole('dialog').getByLabel('Mês: mês',{exact:true})).toHaveValue('03');await expect(page.getByRole('dialog').getByLabel('Mês: ano',{exact:true})).toHaveValue('2026');}
        await page.getByLabel('Categoria *',{exact:true}).selectOption({index:1});await page.getByLabel('Meta mensal (R$) *',{exact:true}).fill('345,67');
        await page.screenshot({path:`${evidence}/screenshots/${variant}-month-${info.project.name}-${locale}-375.png`});
        await save('/finance/budgets','Salvar');
        const dashboard=await(await page.request.get(origin+'/api/finance/dashboard?start=2026-01-01&end=2027-12-31')).json();
        const csv=await(await page.request.get(origin+'/api/finance/reports/cash-monthly.csv?start=2026-01-01&end=2027-12-31')).text();
        records[variant]={payloads,queries,dashboard,csv};
      }finally{await context.close();}
    }
    writeFileSync(`${evidence}/migration-${info.project.name}-${locale}.json`,JSON.stringify(records,null,2));
    expect(records.candidate).toEqual(records.baseline);
  });
}

test('validation: incomplete filter/competence cannot trigger queries or open a target form',async({page})=>{
  expect((await page.request.post('/api/auth/login',{data:{username:'demo.admin',password}})).ok()).toBe(true);
  await page.goto('/app#finance-payable');await expect(page.locator('main h1')).toHaveText('Contas a Pagar');
  await page.waitForLoadState('networkidle');
  const calls:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/finance')calls.push(r.url())});
  const field=dateField(page,'De');const day=field.locator('[data-type=day]');await day.focus();
  for(let i=0;i<2&&(await day.getAttribute('data-placeholder'))===null;i++)await day.press('Backspace');
  await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
  await expect(field).toContainText('O valor anterior foi mantido');
  expect(await page.locator('.finance-filter-grid').evaluate((f:HTMLFormElement)=>f.checkValidity())).toBe(false);expect(calls).toEqual([]);
  await page.goto('/app#finance-reports');await expect(page.locator('main h1')).toHaveText('Relatórios Financeiros');
  await page.getByLabel('Mês: ano',{exact:true}).fill('');await page.getByRole('button',{name:'Nova meta',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.silex-budget-period')).toContainText('Informe o mês e o ano completos');
});
