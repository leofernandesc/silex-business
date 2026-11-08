import {localDate} from '../src/format';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
function credential(username:string){return JSON.parse(readFileSync(process.env.SILEX_TRANSPORT_FIXTURE!,'utf8'))[username].password as string;}
async function login(page:Page,username:string){
 await page.goto('/entrar');await page.getByLabel('Usuário',{exact:true}).fill(username);await page.getByLabel('Senha',{exact:true}).fill(credential(username));await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.locator('.app-shell')).toBeVisible();
}

test('Demo retains general ERP, denies transport URL and API, and keeps generic forms',async({page})=>{
 await login(page,'demo.restricted.admin');
 for(const route of ['customers','products','suppliers','day-workers','stock','pos','sales','service-orders','cash','finance-dashboard','finance','finance-payable','finance-receivable','finance-reconcile','finance-reports','users','company-settings']){
  await page.goto('/app#'+route);await expect(page.locator('main h1')).toBeVisible();await expect(page).toHaveURL(new RegExp('#'+route+'$'));
 }
 await page.goto('/app#customers');await page.getByRole('button',{name:'Novo cliente',exact:true}).click();
 await expect(page.locator('.customer-address-group')).toHaveCount(0);await expect(page.getByLabel('CEP',{exact:true})).toBeVisible();await expect(page.getByLabel('Tipo de serviço',{exact:true})).toHaveCount(0);
 await page.keyboard.press('Escape');
 await page.goto('/app#service-orders');await page.getByRole('button',{name:'Novo serviço/pedido',exact:true}).click();await expect(page.getByRole('button',{name:'Adicionar diarista'})).toBeVisible();await expect(page.getByRole('button',{name:'Adicionar frete'})).toHaveCount(0);await expect(page.getByRole('dialog')).not.toContainText(/\bfrete\b/i);
 await page.goto('/app#subcontracted-freight');await expect(page).toHaveURL(/#home$/);
 expect((await page.request.get('/api/suppliers?kind=subcontracted_freight')).status()).toBe(403);
 expect((await page.request.post('/api/customers',{data:{name:'Forbidden',service_details:{service_type:'local'}}})).status()).toBe(403);
});

test('Sammya receives full structured addresses, persistence, service types and freight controls',async({page})=>{
 await login(page,'sammya');await page.goto('/app#subcontracted-freight');await expect(page.locator('main h1')).toHaveText('Frete Subcontratado');
 await page.goto('/app#customers');await page.getByRole('button',{name:'Novo cliente',exact:true}).click();await expect(page.locator('.customer-address-group')).toHaveCount(2);
 const name='Structured '+randomUUID();await page.getByLabel('Nome *',{exact:true}).fill(name);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
 const values={CEP:'00000-001',Logradouro:'Synthetic street',Número:'12',Complemento:'Unit A',Bairro:'Synthetic district',Cidade:'Synthetic city',UF:'AM'};
 for(const kind of ['coleta','entrega']){
  const group=page.getByRole('group',{name:'Endereço de '+kind,exact:true});await expect(group.locator('input')).toHaveCount(7);
  for(const [label,value] of Object.entries(values))await page.getByLabel(label+' da '+kind,{exact:true}).fill(kind==='entrega'&&label==='Logradouro'?'Independent destination':value);
 }
 await page.getByLabel('Tipo de serviço',{exact:true}).selectOption('interstate');
 const saved=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/customers');await page.getByRole('button',{name:'Salvar',exact:true}).click();expect((await saved).status()).toBe(201);
 await page.reload();const row=page.getByRole('row').filter({hasText:name});await expect(row).toBeVisible();await row.getByRole('button',{name:'Editar'}).click();await expect(page.getByLabel('Logradouro da entrega',{exact:true})).toHaveValue('Independent destination');await expect(page.getByLabel('Tipo de serviço',{exact:true})).toHaveValue('interstate');await page.getByLabel('Tipo de serviço',{exact:true}).selectOption('local');await page.getByRole('button',{name:'Salvar',exact:true}).click();
 await page.goto('/app#service-orders');await page.getByRole('button',{name:'Novo serviço/pedido',exact:true}).click();await expect(page.getByRole('button',{name:'Adicionar frete'})).toBeVisible();
});

test('Other administrator and operator cannot use the module through the backend or a hidden URL',async({page})=>{
 for(const username of ['generic.admin','generic.operator']){
  await login(page,username);expect((await page.request.get('/api/suppliers?kind=subcontracted_freight')).status()).toBe(403);
  await page.goto('/app#subcontracted-freight');await expect(page).toHaveURL(/#home$/);
  await page.request.post('/api/auth/logout');
 }
});

test('Historical transport finance remains readable while specialized order edits stay blocked',async({page})=>{
 await login(page,'sammya');
 const token=randomUUID();const name='Historical provider '+token;
 const freight=await (await page.request.post('/api/suppliers',{data:{name,kind:'subcontracted_freight'}})).json();
 const customer=await (await page.request.post('/api/customers',{data:{name:'History '+token}})).json();
 const today=localDate();
 const payload={customer_id:customer.id,description:'History '+token,service_date:today,negotiated_cents:50000,costs:[{kind:'subcontracted_freight',supplier_id:freight.id,agreed_amount_cents:12345}]};
 const response=await page.request.post('/api/service-orders',{data:payload});expect(response.status()).toBe(201);const order=await response.json();
 const accounts=await (await page.request.get('/api/accounts')).json();
 expect((await page.request.post(`/api/service-orders/${order.id}/generate-titles`,{data:{account_id:accounts.find((a:{kind:string})=>a.kind==='bank').id,due_date:today,competence_date:today}})).status()).toBe(200);
 await page.request.post('/api/auth/logout');await login(page,'demo.restricted.admin');
 await page.goto('/app#service-orders');const row=page.getByRole('row').filter({hasText:order.code});await expect(row.getByRole('button',{name:'Editar '+order.code,exact:true})).toHaveCount(0);
 await row.getByRole('button',{name:'Ver '+order.code,exact:true}).click();await expect(page.getByText(/Custos especializados preservados/)).toBeVisible();await expect(page.getByText(/Há custos especializados restritos nesta consulta/)).toBeVisible();
 expect((await page.request.put(`/api/service-orders/${order.id}`,{data:{...payload,costs:[]}})).status()).toBe(403);
 await page.goto('/app#finance-payable');await expect(page.getByRole('row').filter({hasText:name})).toContainText('123,45');await expect(page.locator('option[value="subcontracted_freight"]')).toHaveCount(0);
 await page.goto('/app#finance-reports');await expect(page.locator('option[value="subcontracted_freight"]')).toHaveCount(0);
});
