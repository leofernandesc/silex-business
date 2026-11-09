import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {test,expect,type Page} from './integrationTest';
async function login(page:Page){
 const response=await page.request.post('/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});expect(response.ok()).toBe(true);
}
test('DRE: classify in the existing plan, confirm economic recognition and export a partial statement',async({page},info)=>{
 await login(page);
 const categories=await page.request.post('/api/categories',{data:{name:'Receita fictícia DRE navegador',direction:'income',classification:'operating'}});expect(categories.ok()).toBe(true);const category=await categories.json();
 const accounts=await(await page.request.get('/api/accounts')).json();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Manaus',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const created=await page.request.post('/api/finance',{data:{description:'Fato econômico fictício DRE',direction:'income',amount_cents:100001,category_id:category.id,account_id:accounts.find((a:any)=>a.kind==='bank').id,due_date:today,competence_date:today}});expect(created.ok()).toBe(true);const entry=await created.json();
 await page.goto('/app#finance-plan');
 const detail=page.locator('details').filter({hasText:category.name});await detail.locator('summary').click();
 await detail.getByRole('button',{name:'Editar categoria '+category.name,exact:true}).click();
 await page.getByLabel('Motivo da classificação DRE',{exact:true}).fill('Classificação comprovada em dados sintéticos');
 await page.getByRole('button',{name:'Prévia do impacto',exact:true}).click();
 await expect(page.getByText(/fontes potencialmente afetadas/)).toBeVisible();
 await page.getByRole('button',{name:'Confirmar classificação revisada',exact:true}).click();
 await expect(page.getByText('Classificação registrada com histórico.')).toBeVisible();
 await page.getByRole('button',{name:'Voltar',exact:true}).click();
 await page.goto('/app#finance-reports');await page.getByLabel('Relatório',{exact:true}).selectOption('dre');
 await page.getByRole('link',{name:'Configuração da DRE',exact:true}).click();
 const key=`finance_entry:${entry.id}:principal`;
 await page.getByRole('button',{name:'Revisar reconhecimento de Conta a receber #'+key.split(':')[1],exact:true}).click();
 await page.getByLabel('Tipo de evidência *',{exact:true}).fill('Documento sintético comprovado');
 await page.getByLabel('Justificativa e evidência *',{exact:true}).fill('Receita auferida e conferida na fixture');
 let decisions=0;await page.route('**/api/finance/dre/recognition-review',route=>{decisions++;return decisions===1?route.fulfill({status:503,json:{detail:'Unavailable'}}):route.continue()});
 await page.getByRole('button',{name:'Confirmar revisão',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();await expect(page.getByLabel('Justificativa e evidência *',{exact:true})).toHaveValue('Receita auferida e conferida na fixture');
 await page.getByRole('button',{name:'Confirmar revisão',exact:true}).click();
 expect(decisions).toBe(2);
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('link',{name:'Consultar demonstrativo financeiro',exact:true}).click();
 await page.getByRole('button',{name:'Detalhar Receita bruta',exact:true}).click();
 await page.getByRole('link',{name:'Conta a receber #'+entry.id,exact:true}).click();
 await expect(page).toHaveURL(/#finance-receivable$/);
 await expect(page.getByRole('dialog')).toContainText('Fato econômico fictício DRE');
 await page.getByRole('button',{name:'Fechar janela',exact:true}).click();
 await page.goBack();await expect(page.getByLabel('Relatório',{exact:true})).toHaveValue('dre');
 const params={start:today.slice(0,7)+'-01',end:today};
 const before=await(await page.request.get('/api/finance/dre',{params})).json();
 expect(before.facts.filter((f:any)=>f.key===key)).toHaveLength(1);
 expect(before.lines.find((l:any)=>l.code==='LL').final_amount_cents).toBeNull();
 const settled=await page.request.post(`/api/finance/${entry.id}/settle`,{data:{account_id:entry.account_id,method:'pix',principal_cents:30001,request_key:'dre-browser-partial-unique'}});expect(settled.ok()).toBe(true);
 const after=await(await page.request.get('/api/finance/dre',{params})).json();expect(after.facts).toEqual(before.facts);
 const download=page.waitForEvent('download');await page.locator('.dre-report').getByRole('button',{name:/CSV/}).click();const file=await download;expect(await file.failure()).toBeNull();
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 const evidence=process.env.SILEX_DRE_EVIDENCE_DIR;
 if(evidence){mkdirSync(evidence,{recursive:true});await page.screenshot({path:join(evidence,`dre-${info.project.name}-${process.env.SILEX_INTEGRATION_BROWSER||'chromium'}.png`),fullPage:true})}
 await page.emulateMedia({media:'print'});await expect(page.locator('.dre-report')).toBeVisible();await expect(page.locator('.dre-print-facts')).toHaveCount(0);await expect(page.locator('.dre-report th[scope=row]').filter({hasText:'Lucro líquido gerencial'})).toBeVisible();
 for(const button of await page.locator('.dre-report button').all())await expect(button).toBeHidden();
 await expect(page.locator('.dre-lines th').filter({hasText:'Revisão'})).toHaveCount(0);
 if(evidence&&info.project.name==='desktop'&&process.env.SILEX_INTEGRATION_BROWSER!=='firefox')await page.pdf({path:join(evidence,'dre-partial-a4.pdf'),format:'A4',printBackground:true});
});

test('navigation aliases converge on one home and one financial plan',async({page})=>{
 await login(page);let dashboardRequests=0;page.on('request',r=>{if(r.url().endsWith('/api/dashboard'))dashboardRequests++});
 await page.goto('/app#dashboard');await expect(page).toHaveURL(/#home$/);await expect(page.getByRole('heading',{level:1,name:'Página inicial'})).toBeVisible();await expect(page.getByRole('region',{name:'Indicadores operacionais',exact:true})).toHaveCount(1);expect(dashboardRequests).toBe(1);
 await page.goto('/app#finance-categories');await expect(page.getByRole('heading',{level:1,name:'Plano financeiro',exact:true})).toBeVisible();
 await page.goto('/app#finance-subcategories');await expect(page.getByRole('heading',{level:1,name:'Plano financeiro',exact:true})).toBeVisible();await expect(page.locator('details[open]').first()).toBeVisible();
 await page.goto('/app#finance-dashboard');await expect(page.getByRole('heading',{level:1,name:'Visão financeira',exact:true})).toBeVisible();
});

test('service completion persists without auto titles and contextual generation remains confirmed and unique',async({page})=>{
 await login(page);const customer=await(await page.request.post('/api/customers',{data:{name:'Cliente fictício da conclusão'}})).json();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Manaus',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const response=await page.request.post('/api/service-orders',{data:{customer_id:customer.id,description:'Execução fictícia do navegador',service_date:today,negotiated_cents:500001,costs:[]}});expect(response.ok()).toBe(true);const order=await response.json();
 await page.goto('/app#service-orders');await page.getByRole('button',{name:'Concluir '+order.code,exact:true}).click();await page.getByLabel('Evidência da execução *',{exact:true}).fill('Conclusão sintética conferida pelo avaliador');await page.getByRole('button',{name:'Confirmar conclusão do serviço',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const row=page.getByRole('row').filter({hasText:order.code});await expect(row).toContainText('Títulos pendentes');
 const completed=await(await page.request.get(`/api/service-orders/${order.id}`)).json();expect(completed.completed_on).toBe(today);expect(completed.titles).toHaveLength(0);
 await row.getByRole('button',{name:'Gerar títulos',exact:true}).click();
 const accounts=await(await page.request.get('/api/accounts')).json();await page.getByLabel('Conta associada aos títulos *',{exact:true}).selectOption(String(accounts.find((a:any)=>a.kind==='bank').id));
 let posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/generate-titles'))posts++});
 await page.getByRole('button',{name:'Confirmar geração de títulos',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const generated=await(await page.request.get(`/api/service-orders/${order.id}`)).json();expect(generated.titles).toHaveLength(1);expect(generated.titles[0].amount_cents).toBe(500001);expect(posts).toBe(1);
});

test('DRE lookup failure and malformed response recover in place without reporting a zero profit',async({page})=>{
 await login(page);let requests=0;
 await page.route('**/api/finance/dre?*',route=>{requests++;return requests===1?route.fulfill({status:503,json:{detail:'unavailable'}}):requests===2?route.fulfill({json:{}}):route.continue()});
 await page.goto('/app#finance-reports');await page.getByLabel('Relatório',{exact:true}).selectOption('dre');
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('.dre-report tbody tr')).toHaveCount(0);
 await page.getByRole('button',{name:'Tentar novamente: DRE gerencial',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Resposta inválida');
 await page.getByRole('button',{name:'Tentar novamente: DRE gerencial',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.locator('.dre-summary')).toContainText('Informações insuficientes');await expect(page.locator('.dre-lines')).toHaveCount(0);await expect(page.locator('.dre-report')).not.toContainText('R$ 0,00');const today=(await(await page.request.get('/api/dashboard')).json()).date;const report=await(await page.request.get('/api/finance/dre',{params:{start:today.slice(0,7)+'-01',end:today}})).json();expect(report.lines.find((l:any)=>l.code==='LL').final_amount_cents).toBeNull();expect(requests).toBe(3);
});
