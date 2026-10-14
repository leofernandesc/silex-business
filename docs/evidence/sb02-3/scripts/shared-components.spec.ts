import { test, expect } from '@playwright/test';
const output='/home/leofernandesc/controlmax-inspired/docs/evidence/sb02-3/states';
async function login(page: import('@playwright/test').Page){
  await page.goto('/');
  await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');
  await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.locator('main h1')).toHaveText('Visão geral');
}
test('SB023: Clientes — paginação, formulário ocupado, edição, vazio, erro, CSV e tabela por teclado',async({page},info)=>{
  await login(page);await page.goto('/#customers');
  await expect(page.locator('main h1')).toHaveText('Clientes');
  const paging=await page.evaluate(async()=>await(await fetch('/api/customers?active=true')).json());
  const pages=Math.max(1,Math.ceil(paging.total/paging.page_size));expect(pages).toBeGreaterThan(1);
  await expect(page.locator('.pagination')).toContainText(`1 de ${pages}`);
  await page.getByRole('button',{name:'Próxima página',exact:true}).click();
  await expect(page.locator('.pagination')).toContainText(`2 de ${pages}`);
  for(let n=3;n<=pages;n++){await page.getByRole('button',{name:'Próxima página',exact:true}).click();await expect(page.locator('.pagination')).toContainText(`${n} de ${pages}`);}
  await expect(page.getByRole('button',{name:'Próxima página',exact:true})).toBeDisabled();
  for(let n=pages-1;n>=1;n--){await page.getByRole('button',{name:'Página anterior',exact:true}).click();await expect(page.locator('.pagination')).toContainText(`${n} de ${pages}`);}
  const name='SB023 Cliente '+info.project.name+'-'+Date.now();
  await page.getByRole('button',{name:'Novo cliente',exact:true}).click();
  await expect.poll(()=>page.locator('dialog').evaluate(e=>e.contains(document.activeElement))).toBe(true);
  await page.getByLabel('Nome *',{exact:true}).fill(name);
  await page.getByLabel('E-mail',{exact:true}).fill('cliente-sb023@example.test');
  // Test-only fetch wrapper: the installed Firefox protocol lacks page.route support.
  await page.evaluate(()=>{
    const target=window as Window & {sb023Fetch?:typeof fetch;sb023Release?:()=>void};
    const original=window.fetch.bind(window);target.sb023Fetch=original;
    window.fetch=async(input,init)=>{
      if(String(input).includes('/api/customers')&&init?.method==='POST')await new Promise<void>(resolve=>target.sb023Release=resolve);
      return original(input,init);
    };
  });
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Salvando...',exact:true})).toBeDisabled();
  await expect(page.locator('dialog fieldset')).toHaveAttribute('disabled','');
  await expect(page.getByLabel('Nome *',{exact:true})).toBeDisabled();
  await page.screenshot({path:output+'/customer-busy-'+info.project.name+'.png'});
  await page.evaluate(()=>{(window as Window & {sb023Release?:()=>void}).sb023Release?.();});
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.evaluate(()=>{const target=window as Window & {sb023Fetch?:typeof fetch};if(target.sb023Fetch)window.fetch=target.sb023Fetch;});
  const search=page.getByRole('textbox',{name:'Pesquisar',exact:true});
  await search.fill(name);const row=page.getByRole('row').filter({hasText:name});
  await expect(row).toBeVisible();await row.getByRole('button').click();
  await page.getByLabel('Nome *',{exact:true}).fill(name+' editado');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await expect(page.locator('dialog')).toHaveCount(0);await search.fill(name+' editado');
  await expect(page.getByRole('row').filter({hasText:name+' editado'})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('customers.csv');
  await download.saveAs(output+'/customers-'+info.project.name+'.csv');
  const table=page.locator('.table-wrap');
  const hasOverflow=await table.evaluate(e=>e.scrollWidth>e.clientWidth);
  if(hasOverflow){
    await table.evaluate(e=>e.scrollLeft=0);await table.focus();await page.keyboard.press('ArrowRight');
    await expect.poll(()=>table.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
    const maximum=await table.evaluate(e=>e.scrollWidth-e.clientWidth);
    for(let n=0;n<40;n++){
      if(await table.evaluate(e=>e.scrollLeft)>=maximum-1)break;
      await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);
    }
    await expect.poll(()=>table.evaluate(e=>e.scrollLeft)).toBeGreaterThanOrEqual(maximum-1);
    await page.screenshot({path:output+'/customer-table-keyboard-end-'+info.project.name+'.png',fullPage:true});
  }
  await row.getByRole('button').focus();await page.keyboard.press('Enter');await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('dialog')).toHaveCount(0);
  await search.fill('sem-resultado-SB023');await expect(page.getByText('Nenhum registro encontrado',{exact:true})).toBeVisible();
  await page.screenshot({path:output+'/customer-empty-'+info.project.name+'.png',fullPage:true});
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window);
    window.fetch=async(input,init)=>String(input).includes('/api/customers?')
      ?new Response(JSON.stringify({detail:'Falha simulada apenas no teste SB-02.3'}),{status:500,headers:{'Content-Type':'application/json'}})
      :original(input,init);
  });
  await page.reload();await expect(page.getByRole('alert')).toContainText('Falha simulada');
  await page.screenshot({path:output+'/customer-error-'+info.project.name+'.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SB023: Empresa e identidade — marca fixa, campos legados, contrato e sucesso em banco descartável',async({page},info)=>{
  await login(page);await page.goto('/#company-settings');
  const brand=page.getByLabel('Nome de apresentação *',{exact:true});
  const company=page.getByLabel('Nome da empresa',{exact:true});
  await expect(brand).toHaveAttribute('required','');await expect(brand).toHaveAttribute('maxlength','50');
  const before=await page.evaluate(async()=>await(await fetch('/api/company-settings')).json());
  await brand.fill('Gestão');await company.fill('');
  await page.getByRole('button',{name:'Salvar identificação',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Identificação salva');
  await expect(page.locator('.workspace strong')).toHaveText('Minha empresa');
  await expect(page.locator('.sidebar-logo')).toHaveAttribute('alt','Silex Business');
  expect(await page.title()).toBe('Silex Business');
  await page.screenshot({path:output+'/company-empty-'+info.project.name+'.png',fullPage:true});
  await brand.fill('Nome de apresentação SB023');await company.fill('Empresa SB023 · Fictícia');
  await page.getByRole('button',{name:'Salvar identificação',exact:true}).click();
  await expect(page.locator('.workspace strong')).toHaveText('Empresa SB023 · Fictícia');
  await page.reload();await expect(brand).toHaveValue('Nome de apresentação SB023');await expect(company).toHaveValue('Empresa SB023 · Fictícia');
  const after=await page.evaluate(async()=>await(await fetch('/api/company-settings')).json());
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  for(const key of ['company_document','phone','email','address'])expect(after[key]).toEqual(before[key]);
  expect(after.brand_name).toBe('Nome de apresentação SB023');expect(after.company_name).toBe('Empresa SB023 · Fictícia');
  await page.screenshot({path:output+'/company-success-'+info.project.name+'.png',fullPage:true});
  const exit=page.getByRole('button',{name:'Sair',exact:true});await exit.click();
  await expect(page.locator('.login-card h2')).toHaveText('Acesse seu espaço');
  await expect(page.locator('.workspace')).toHaveCount(0);
});
