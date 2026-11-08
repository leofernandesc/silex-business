import {test,expect,type Page} from './integrationTest';
import {localDate} from '../src/format';
async function login(page:Page){expect((await page.request.post('/api/auth/login',{data:{username:'demo.admin',password:'DemoLocal#2026'}})).ok()).toBe(true);}
async function title(page:Page){const accounts=await(await page.request.get('/api/accounts')).json(),cats=await(await page.request.get('/api/categories')).json();const r=await page.request.post('/api/finance',{data:{description:'Título fictício - validação estrita',direction:'expense',amount_cents:12345,account_id:accounts.find((a:any)=>a.kind==='bank').id,category_id:cats.find((c:any)=>c.direction==='expense'||c.direction==='both').id,due_date:localDate()}});expect(r.status()).toBe(201);return r.json();}
for(const field of ['Juros (R$)','Multa (R$)','Desconto (R$)'])test(`invalid ${field} cannot silently become zero in a payment`,async({page})=>{
 await login(page);const entry=await title(page);let calls=0;await page.route(`**/api/finance/${entry.id}/settle`,r=>{calls++;return r.continue();});
 await page.goto('/app#finance-payable');await page.getByRole('row').filter({hasText:entry.description}).getByRole('button',{name:'Quitar',exact:true}).click();
 await page.getByLabel(field,{exact:true}).fill('inválido');await page.getByRole('dialog').getByRole('button',{name:/Confirmar quitação|Registrar pagamento/}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/valor|campos/i);expect(calls).toBe(0);
 const items=(await(await page.request.get('/api/finance')).json()).items;expect(items.find((r:any)=>r.id===entry.id).remaining_cents).toBe(12345);
});

test('customers HTTP failure never confirms an empty table',async({page})=>{
 await login(page);await page.route('**/api/customers?*',r=>r.fulfill({status:503,json:{detail:'Clientes indisponíveis (fixture).'}}));
 await page.goto('/app#customers');await expect(page.locator('main').getByRole('alert')).toContainText('Clientes indisponíveis');
 await expect(page.locator('main')).not.toContainText('Nenhum registro encontrado');await expect(page.locator('main')).toContainText('Dados indisponíveis');
});

test('POS cash query failure is unavailable rather than a closed cash session',async({page})=>{
 await login(page);await page.route('**/api/cash-sessions/current',r=>r.fulfill({status:503,json:{detail:'Caixa indisponível (fixture).'}}));
 await page.goto('/app#pos');await expect(page.locator('main').getByRole('alert')).toContainText('Caixa indisponível');await expect(page.locator('main')).not.toContainText('Seu caixa está fechado');
});

test('POS search cannot offer stale products while another query is pending',async({page})=>{
 await login(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);
 await page.route('**/api/products?*',async r=>{if(new URL(r.request().url()).searchParams.get('q')==='busca-inexistente'){await pending;await r.fulfill({json:{items:[],total:0,page:1,page_size:100}});}else await r.continue();});
 await page.goto('/app#pos');await expect(page.locator('.product-tile').first()).toBeVisible();
 const requested=page.waitForRequest(r=>new URL(r.url()).searchParams.get('q')==='busca-inexistente');await page.getByRole('textbox',{name:'Pesquisar',exact:true}).fill('busca-inexistente');await requested;
 try{await expect(page.locator('.product-tile')).toHaveCount(0);await expect(page.locator('main')).toContainText('Carregando');}finally{release();}
 await expect(page.locator('main')).toContainText('Nenhum item disponível');
});

test('structured HTTP validation remains readable and keeps the customer form',async({page})=>{
 await login(page);await page.goto('/app#customers');await page.getByRole('button',{name:'Novo cliente',exact:true}).click();await page.getByLabel('Nome *',{exact:true}).fill('Cadastro fictício');
 await page.route('**/api/customers',r=>r.fulfill({status:422,json:{detail:[{loc:['body','name'],msg:'invalid'}]}}));
 await page.getByRole('dialog').getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Confira');await expect(page.getByLabel('Nome *',{exact:true})).toHaveValue('Cadastro fictício');
});

for(const [route,path,button] of [['finance-payable','/api/finance','Pesquisar'],['finance','/api/finance/movements','Pesquisar']] as const)test(`${route} retries the same applied filter after a failed query`,async({page})=>{
 await login(page);const pattern='**'+path+'?*';await page.route(pattern,r=>r.fulfill({status:503,json:{detail:'Consulta indisponível (fixture).'}}));
 await page.goto('/app#'+route);await expect(page.locator('main').getByRole('alert').first()).toContainText('Consulta indisponível');await page.unroute(pattern);
 const response=page.waitForResponse(r=>new URL(r.url()).pathname===path,{timeout:5000});
 await page.getByRole('button',{name:button,exact:true}).click();expect((await response).ok()).toBe(true);await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

for(const surface of ['session','login'])test(`malformed auth ${surface} response never enters a broken authenticated shell`,async({page})=>{
 if(surface==='session'){await login(page);await page.route('**/api/auth/me',r=>r.fulfill({json:{}}));await page.goto('/app#customers');await expect(page).toHaveURL(/\/entrar$/);await expect(page.getByRole('alert').first()).toContainText('sessão');}
 else{await page.goto('/entrar');await page.route('**/api/auth/login',r=>r.fulfill({json:{}}));await page.getByLabel('Usuário',{exact:true}).fill('fixture');await page.getByLabel('Senha',{exact:true}).fill('SyntheticOnly#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('alert').first()).toContainText('Resposta');await expect(page.locator('.app-shell')).toHaveCount(0);}
});

test('CSV failure stays in the ERP, prevents duplicate requests and allows a real retry',async({page})=>{
 await login(page);await page.goto('/app#customers');let calls=0,release!:()=>void;const hold=new Promise<void>(r=>release=r);
 const pattern='**/api/reports/customers.csv?*';await page.route(pattern,async r=>{calls++;await hold;await r.fulfill({status:503,json:{detail:'Exportação indisponível (fixture).'}});});
 await page.getByRole('button',{name:'Exportar CSV',exact:true}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
 try{await expect.poll(()=>calls).toBe(1);await expect(page.getByRole('button',{name:'Exportando...'})).toBeDisabled();}finally{release();}
 await expect(page.getByRole('alert').first()).toContainText('Exportação indisponível');await expect(page).toHaveURL(/#customers$/);
 await page.unroute(pattern);const received=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();const file=await received;expect(file.suggestedFilename()).toMatch(/\.csv$/);expect(await file.failure()).toBeNull();
});

for(const [route,path] of [['products','products'],['suppliers','suppliers'],['day-workers','suppliers'],['stock','stock-movements'],['sales','sales'],['service-orders','service-orders'],['audit','audit']] as const)test(`${route} query failure and invalid success are recoverable, never empty confirmation`,async({page})=>{
 await login(page);const pattern='**/api/'+path+'?*';await page.route(pattern,r=>r.fulfill({status:503,json:{detail:'Indisponibilidade controlada da consulta.'}}));await page.goto('/app#'+route);
 await expect(page.locator('main').getByRole('alert').first()).toContainText('Indisponibilidade');await expect(page.locator('main')).not.toContainText('Nenhum registro encontrado');
 await page.unroute(pattern);await page.route(pattern,r=>r.fulfill({json:{}}));await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.locator('main').getByRole('alert').first()).toContainText('Resposta inválida');
 await page.unroute(pattern);const received=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/'+path);await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();expect((await received).ok()).toBe(true);await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('stock product lookup failure explains the blocked operation and retry restores choices',async({page})=>{
 await login(page);await page.route('**/api/products?*',r=>r.fulfill({status:503,json:{detail:'Produtos indisponíveis.'}}));await page.goto('/app#stock');await page.getByRole('button',{name:'Novo lançamento',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Produtos indisponíveis');await expect(page.getByLabel('Produto *',{exact:true})).toBeDisabled();await page.unroute('**/api/products?*');await page.getByRole('button',{name:'Tentar novamente: produtos',exact:true}).click();await expect(page.getByLabel('Produto *',{exact:true})).toBeEnabled();await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
});

test('unavailable financial account lookup disables actions rather than producing inert buttons',async({page})=>{
 await login(page);await page.route('**/api/accounts',r=>r.fulfill({status:503,json:{detail:'Contas indisponíveis.'}}));await page.goto('/app#finance-payable');await expect(page.locator('main').getByRole('alert').first()).toContainText('Contas indisponíveis');await expect(page.getByRole('button',{name:'Nova despesa',exact:true})).toBeDisabled();await page.unroute('**/api/accounts');await page.getByRole('button',{name:'Tentar novamente: contas',exact:true}).click();await expect(page.getByRole('button',{name:'Nova despesa',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Nova despesa',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
});

test('financial creation remains focusable while refreshing lookups and opens a pending dialog',async({page})=>{
 await login(page);await page.goto('/app#finance-payable');await expect(page.getByRole('button',{name:'Nova despesa',exact:true})).toBeEnabled();
 let release!:()=>void;const hold=new Promise<void>(r=>release=r);await page.route('**/api/accounts',async r=>{await hold;await r.continue();});
 const reload=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/accounts');await page.getByRole('button',{name:'Pesquisar',exact:true}).click();await reload;
 await page.getByRole('button',{name:'Nova despesa',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Carregando');release();await expect(page.getByLabel('Histórico *',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Nova despesa',exact:true})).toBeFocused();
});

test('240 persisted customers retain filters, distinct pages and complete CSV at desktop/mobile widths',async({page})=>{
 test.setTimeout(90000);await login(page);
 const prefix='Volume fictício audit ';
 for(let i=0;i<240;i++){const r=await page.request.post('/api/customers',{data:{name:prefix+String(i).padStart(3,'0')+' '+('X'.repeat(90)),phone:'(92) 0000-0000',email:'fixture@example.test'}});expect(r.status()).toBe(201);}
 await page.goto('/app#customers');await page.getByRole('textbox',{name:'Pesquisar',exact:true}).fill(prefix);
 await expect(page.locator('.pagination')).toContainText('240 registros');const first=await(await page.request.get('/api/customers?q='+encodeURIComponent(prefix))).json();expect(first.items).toHaveLength(20);
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/customers'&&new URL(r.url()).searchParams.get('page')==='2');await page.getByRole('button',{name:'Próxima página',exact:true}).click();const second=await(await response).json();expect(second.items).toHaveLength(20);expect(second.items.some((r:any)=>first.items.some((x:any)=>x.id===r.id))).toBe(false);
 const rows=page.locator('main tbody tr');await expect(rows).toHaveCount(20);for(const row of second.items)await expect(rows.filter({hasText:row.name})).toHaveCount(1);
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();const file=await downloaded;const stream=await file.createReadStream();const buffers:Buffer[]=[];for await(const chunk of stream!)buffers.push(Buffer.from(chunk));const csv=Buffer.concat(buffers).toString('utf8');expect(csv.split(/\r?\n/).filter(Boolean)).toHaveLength(241);expect(csv).toContain(prefix+'000');expect(csv).toContain(prefix+'239');
 await page.reload();await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width+1);
});
