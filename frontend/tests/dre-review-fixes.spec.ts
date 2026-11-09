import {test,expect,type Page} from './integrationTest';
import {civilDate} from '../src/civilDates';
import {enterDate} from './dateHelpers';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
async function post(page:Page,path:string,data:unknown,status=201){const r=await page.request.post('/api'+path,{data});expect(r.status(),await r.text()).toBe(status);return r.json()}
async function login(page:Page){await post(page,'/auth/login',{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD},200)}
async function setup(page:Page){
 await login(page);const today=(await(await page.request.get('/api/dashboard')).json()).date as string;
 const category=await post(page,'/categories',{name:'Política econômica fictícia do navegador',direction:'income',classification:'operating'});
 const account=(await(await page.request.get('/api/accounts')).json()).find((a:any)=>a.kind==='bank');
 const entry=await post(page,'/finance',{description:'Fato econômico fictício revisado',direction:'income',amount_cents:10001,category_id:category.id,account_id:account.id,due_date:today,competence_date:today});
 const mappingBody={category_id:category.id,line_code:'RB',valid_from:'2000-01-01',valid_to:'2099-12-31',expected_revision:0,reason:'Classificação inicial comprovada na fixture'};
 const preview=await post(page,'/finance/dre/mappings/preview',mappingBody,200);
 const first=await post(page,'/finance/dre/mappings',{...mappingBody,preview_token:preview.preview_token});
 const params={start:today.slice(0,7)+'-01',end:today},key=`finance_entry:${entry.id}:principal`;
 const source=(await(await page.request.get('/api/finance/dre/issues',{params})).json()).find((i:any)=>i.key===key);
 await post(page,'/finance/dre/recognition-review',{source_key:key,decision:'recognize',economic_date:today,source_fingerprint:source.source_fingerprint,policy_fingerprint:source.policy_fingerprint,expected_revision:0,evidence_kind:'comprovação_sintética',reason:'Receita auferida com documentação fictícia',request_key:'browser-initial-recognition-key'});
 return {today,params,key,category,entry,first};
}
async function dre(page:Page){await page.goto('/app#finance-reports');await page.getByLabel('Relatório',{exact:true}).selectOption('dre');await expect(page.locator('.dre-report h2')).toHaveText('DRE gerencial')}

test('DRE review: dated policy splits preserve history and generic catalog edits cannot bypass review',async({page})=>{
 const {today,category,first,params,key}=await setup(page);const tomorrow=civilDate(today)!.add({days:1}).toString();
 await page.goto('/app#finance-plan');const categoryRow=page.locator('details').filter({hasText:category.name});await categoryRow.locator('summary').click();await categoryRow.getByRole('button',{name:'Editar categoria '+category.name,exact:true}).click();
 await page.getByLabel('Classificação',{exact:true}).selectOption('financing');await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('revisão com vigência');
 await page.getByLabel('Classificação',{exact:true}).selectOption('operating');
 await page.getByLabel('Revisão a substituir',{exact:true}).selectOption(`${first.id}:${first.valid_from}:${first.valid_to}`);
 await enterDate(page,'Vigência inicial da DRE',tomorrow);
 await page.getByLabel('Rubrica DRE',{exact:true}).selectOption('outside_dre');await page.getByLabel('Natureza econômica nesta vigência DRE',{exact:true}).selectOption('financing');
 await page.getByLabel('Motivo da classificação DRE',{exact:true}).fill('Nova natureza econômica comprovada a partir de amanhã');await page.getByRole('button',{name:'Prévia do impacto',exact:true}).click();await expect(page.getByText(/Intervalos preservados:/)).toBeVisible();
 await page.getByRole('button',{name:'Confirmar classificação revisada',exact:true}).click();await expect(page.getByText('Classificação registrada com histórico.')).toBeVisible();
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const result=await(await page.request.get('/api/finance/dre',{params})).json();expect(result.facts.find((f:any)=>f.key===key).dre_line_code).toBe('RB');
 const records=await(await page.request.get('/api/finance/dre/mappings')).json();expect(records.filter((r:any)=>r.category_id===category.id)).toHaveLength(2);
 expect((await(await page.request.get('/api/categories')).json()).find((r:any)=>r.id===category.id).classification).toBe('operating');
});

test('DRE review: changing economic policy invalidates the shown confirmation and can recover in the same modal',async({page})=>{
 const {today,category,first,key}=await setup(page);
 async function change(nature:string,previous:any){const data={category_id:category.id,line_code:'outside_dre',economic_classification:nature,valid_from:'2000-01-01',valid_to:'2099-12-31',expected_revision:previous.revision,supersedes_id:previous.id,reason:'Política revisada e documentada em teste'};const p=await post(page,'/finance/dre/mappings/preview',data,200);return post(page,'/finance/dre/mappings',{...data,preview_token:p.preview_token})}
 const second=await change('financing',first);await dre(page);
 let legacy=true;await page.route('**/api/finance/dre/recognition-policy?*',route=>legacy?route.fulfill({json:{policy_fingerprint:'0'.repeat(64),economic_policy:{classification:null,affects_result:null}}}):route.continue());
 await page.getByRole('button',{name:'Revisar reconhecimento de Conta a receber #'+key.split(':')[1],exact:true}).click();await expect(page.getByText(/Incidência não confirmada/)).toBeVisible();await expect(page.getByRole('button',{name:'Confirmar revisão',exact:true})).toBeDisabled();
 legacy=false;await page.getByRole('button',{name:'Atualizar política econômica',exact:true}).click();await expect(page.getByText('Natureza econômica na data: Financiamento',{exact:false})).toBeVisible();
 await page.getByLabel('Tipo de evidência *',{exact:true}).fill('Revisão sintética fundamentada');await page.getByLabel('Justificativa e evidência *',{exact:true}).fill('Natureza econômica confirmada após supervisão');
 await enterDate(page,'Data econômica comprovada',civilDate(today)!.subtract({days:1}).toString());await expect(page.getByRole('button',{name:'Confirmar revisão',exact:true})).toBeEnabled();
 await change('investment',second);await page.getByRole('button',{name:'Confirmar revisão',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Política econômica mudou');
 await page.getByRole('button',{name:'Atualizar política econômica',exact:true}).click();await expect(page.getByText('Natureza econômica na data: Investimento',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Justificativa e evidência *',{exact:true})).toHaveValue('Natureza econômica confirmada após supervisão');await page.getByRole('button',{name:'Confirmar revisão',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('DRE review: economic cancellation has an explicit preview, handles failures and double clicks without financial duplication',async({page},info)=>{
 const {params,key,entry}=await setup(page);const before=await(await page.request.get('/api/finance/dre',{params})).json();
 const review=await post(page,'/finance/dre/period-reviews',{...params,source_fingerprint:before.source_fingerprint,report_fingerprint:before.report_fingerprint,reason:'Competência sintética revisada antes do cancelamento'});
 await post(page,`/finance/${entry.id}/cancel`,{reason:'Cancelamento financeiro já documentado'},200);const cancelled=await(await page.request.get(`/api/finance/dre/source-entry/${entry.id}`)).json();
 await dre(page);await page.getByRole('button',{name:'Revisar cancelamento de Conta a receber #'+key.split(':')[1],exact:true}).click();await page.getByLabel('Evidência do cancelamento *',{exact:true}).fill('Documento fictício de cancelamento');await page.getByLabel('Justificativa do ajuste *',{exact:true}).fill('Obrigação econômica cancelada com comprovação sintética');await page.getByLabel('Confirmo a data e que revisões históricas permanecerão preservadas',{exact:true}).check();
 let previews=0;await page.route('**/api/finance/dre/cancellation-review/preview',r=>++previews===1?r.fulfill({json:{}}):r.continue());
 await page.getByRole('button',{name:'Prévia do ajuste econômico',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Resposta inválida');await expect(page.getByLabel('Justificativa do ajuste *',{exact:true})).toHaveValue('Obrigação econômica cancelada com comprovação sintética');
 await page.getByRole('button',{name:'Prévia do ajuste econômico',exact:true}).click();await expect(page.getByRole('region',{name:'Prévia do ajuste econômico',exact:true})).toContainText('100,01');expect((await(await page.request.get('/api/finance/dre',{params})).json()).facts.filter((f:any)=>f.source_type==='economic_adjustment')).toHaveLength(0);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 let attempts=0,release!:()=>void;const gate=new Promise<void>(r=>release=r);await page.route('**/api/finance/dre/cancellation-review',async r=>{attempts++;if(attempts===1)return r.fulfill({status:503,json:{detail:'Unavailable'}});await gate;await r.continue()});
 const confirm=page.getByRole('button',{name:'Confirmar revisão do cancelamento',exact:true});await confirm.click();await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
 await confirm.evaluate(b=>{(b as HTMLButtonElement).click();(b as HTMLButtonElement).click()});await expect(page.getByRole('dialog').locator('button[type="submit"]')).toBeDisabled();release();await expect(page.getByRole('dialog')).toHaveCount(0);expect(attempts).toBe(2);
 const after=await(await page.request.get('/api/finance/dre',{params})).json();expect(after.facts.filter((f:any)=>f.key===key||f.original_source_key===key).map((f:any)=>f.amount_cents)).toEqual([10001,-10001]);
 expect((await(await page.request.get(`/api/finance/dre/source-entry/${entry.id}`)).json())).toEqual(cancelled);
 const old=await(await page.request.get(`/api/finance/dre/period-reviews/${review.id}`)).json();expect(old.snapshot.facts).toEqual(before.facts);
 const csv=await page.request.get('/api/finance/dre.csv',{params});expect(csv.ok()).toBe(true);expect(await csv.text()).toContain('-10001');
 const evidence=process.env.SILEX_DRE_REVIEW_EVIDENCE;if(evidence){mkdirSync(evidence,{recursive:true});await page.screenshot({path:join(evidence,`cancellation-${info.project.name}-${process.env.SILEX_INTEGRATION_BROWSER||'chromium'}.png`),fullPage:true})}
 await page.emulateMedia({media:'print'});await expect(page.locator('.dre-print-facts')).toContainText('100,01');
 if(evidence&&info.project.name==='desktop'&&process.env.SILEX_INTEGRATION_BROWSER!=='firefox')await page.pdf({path:join(evidence,'economic-cancellation-a4.pdf'),format:'A4',printBackground:true});
});

test('DRE review: one balanced home preserves legacy navigation and does not disclose private service activity',async({page,browser,baseURL},info)=>{
 await login(page);const today=(await(await page.request.get('/api/dashboard')).json()).date;const customer=await post(page,'/customers',{name:'Cliente fictício multissetorial'});
 for(const status of ['scheduled','in_progress'])await post(page,'/service-orders',{customer_id:customer.id,description:'Serviço genérico fictício',service_date:today,status,negotiated_cents:10001,costs:[]});
 const context=await browser.newContext({baseURL});try{const specialized=await context.newPage();await post(specialized,'/auth/login',{username:'transport.fixture.admin',password:'CustomerFixtureOnly#2026'},200);const supplier=await post(specialized,'/suppliers',{name:'Frete privado fictício',kind:'subcontracted_freight'});await post(specialized,'/service-orders',{customer_id:customer.id,description:'Operação especializada privada',service_date:today,status:'scheduled',negotiated_cents:99999,costs:[{supplier_id:supplier.id,kind:'subcontracted_freight',agreed_amount_cents:50001}]})}finally{await context.close()}
 await page.goto('/app#dashboard');await expect(page).toHaveURL(/#home$/);await expect(page.getByRole('region',{name:'Resumo de serviços e pedidos',exact:true})).toBeVisible();await expect(page.locator('.overview-summary .summary-card').first()).toContainText('Serviços em andamento');await expect(page.locator('.overview-summary .summary-card').first().locator('strong')).toHaveText('2');await expect(page.locator('main')).not.toContainText('tela independente');await expect(page.locator('main')).not.toContainText('Operação especializada privada');await expect(page.locator('main a[href="/app#home"]')).toHaveCount(0);
 const evidence=process.env.SILEX_DRE_REVIEW_EVIDENCE;if(evidence){mkdirSync(evidence,{recursive:true});await page.screenshot({path:join(evidence,`home-${info.project.name}-${process.env.SILEX_INTEGRATION_BROWSER||'chromium'}.png`),fullPage:true})}
 await page.getByRole('button',{name:'Consultar serviços e pedidos',exact:true}).click();await expect(page).toHaveURL(/#service-orders$/);
 await post(page,'/auth/logout',{},200);await post(page,'/auth/login',{username:'demo.operador',password:process.env.SILEX_TEST_PASSWORD},200);await page.goto('/app#home');await page.reload();await expect(page.getByRole('region',{name:'Resumo de serviços e pedidos',exact:true})).toHaveCount(0);await expect(page.getByText('A receber',{exact:true})).toHaveCount(0);
});
