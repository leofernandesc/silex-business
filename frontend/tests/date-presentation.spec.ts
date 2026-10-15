import { dateField, enterDate, expectDate } from "./dateHelpers";
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, route: string) {
  await page.goto('/app#' + route);
  await page.getByLabel('Usuário', {exact:true}).fill('demo.admin');
  await page.getByLabel('Senha', {exact:true}).fill(process.env.SILEX_TEST_PASSWORD!);
  await page.getByRole('button', {name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(new RegExp('/app#'+route+'$'));
  await expect(page.locator('.app-shell main h1')).toBeVisible();
  await page.waitForLoadState('networkidle');
}

test('P05: monthly report labels change only presentation', async ({page}) => {
  await login(page,'finance-reports');
  for (const report of ['cash-monthly','charges-monthly','discounts-monthly','result-monthly']) {
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/reports/'+report);
    if(report==='cash-monthly')await page.reload();
    else await page.getByLabel('Relatório',{exact:true}).selectOption(report);
    const raw=await (await response).json();
    await page.waitForLoadState('networkidle');
    const rows=page.locator('.finance-report-print tbody tr');
    if(raw.items.length){
      await expect(rows).toHaveCount(raw.items.length);
      for(let i=0;i<raw.items.length;i++){
        const group=raw.items[i].group as string;
        const expected=report==='result-monthly'?group.replace(/(\d{4})-(\d{2})$/,'$2/$1'):group.replace(/^(\d{4})-(\d{2})$/,'$2/$1');
        await expect(rows.nth(i).locator('td').first()).toHaveText(expected);
        const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(raw.items[i].income_cents/100);
        await expect(rows.nth(i)).toContainText(money);
      }
    }
  }
});

test('P05: Brazilian editing with ISO creation and editing retain actual API payloads', async ({page},info) => {
  await login(page,'finance-accounts');
  const name='Conta fictícia datas '+info.project.name;
  const payloads: unknown[]=[];
  await page.getByRole('button',{name:'Nova conta',exact:true}).click();
  await page.getByLabel('Nome *',{exact:true}).fill(name);
  await enterDate(page, 'Referência do saldo inicial *', '2024-02-29');
  const created=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/accounts'&&r.method()==='POST');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  const body=(await created).postDataJSON();payloads.push(body);expect(body.opening_date).toBe('2024-02-29');
  const row=page.getByRole('row').filter({hasText:name});await expect(row).toContainText('29/02/2024');
  await row.getByRole('button',{name:'Editar '+name,exact:true}).click();
  await expectDate(page, 'Referência do saldo inicial *', '2024-02-29'); await enterDate(page, 'Referência do saldo inicial *', '2025-01-01');
  const edited=page.waitForRequest(r=>/^\/api\/accounts\/\d+$/.test(new URL(r.url()).pathname)&&r.method()==='PUT');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  const updated=(await edited).postDataJSON();payloads.push(updated);expect(updated.opening_date).toBe('2025-01-01');
  await expect(row).toContainText('01/01/2025');
  await info.attach('ISO-payloads',{body:JSON.stringify(payloads),contentType:'application/json'});
});

test('P05: range requests and financial totals use unchanged ISO values', async ({page},info) => {
  await login(page,'finance');
  // Change the initial month range so the existing useLoad key actually changes.
  await enterDate(page, 'De', '2026-09-01');
  await enterDate(page, 'Até', '2026-10-31');
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/movements'&&new URL(r.url()).searchParams.get('end')==='2026-10-31');
  await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
  const r=await response,u=new URL(r.url()),json=await r.json();
  expect(u.searchParams.get('start')).toBe('2026-09-01');expect(u.searchParams.get('end')).toBe('2026-10-31');

  await expectDate(page, 'De', '2026-09-01');
  await expectDate(page, 'Até', '2026-10-31');
  for(const row of json.items){expect(row.posting_date>='2026-09-01'&&row.posting_date<='2026-10-31').toBe(true);}
  await info.attach('ISO-filter-response',{body:JSON.stringify({query:u.searchParams.toString(),response:json}),contentType:'application/json'});
});
