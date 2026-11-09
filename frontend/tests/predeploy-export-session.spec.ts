import {test,expect,type Page} from './integrationTest';
import {randomUUID} from 'node:crypto';
async function req(page:Page,path:string,data?:unknown,status=data?201:200){const r=data?await page.request.post('/api'+path,{data}):await page.request.get('/api'+path);expect(r.status()).toBe(status);return r.json()}
async function login(page:Page,username:string){await page.getByLabel('Usuário',{exact:true}).fill(username);await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD!);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('button',{name:'Sair',exact:true})).toBeVisible()}
for(const diagnostic of [false,true])test(`a ${diagnostic?'diagnostic':'commercial'} financial download from the previous session must not finish in the operator session`,async({page})=>{
 await page.goto('/app');await login(page,'demo.admin');
 const today=(await req(page,'/dashboard')).date,period={start:today.slice(0,7)+'-01',end:today};
 const account=(await req(page,'/accounts')).find((a:any)=>a.kind==='bank');
 const category=await req(page,'/categories',{name:'Receita fictícia de segurança da exportação',direction:'income',classification:'operating'});
 const entry=await req(page,'/finance',{description:'Operação fictícia reservada ao financeiro',direction:'income',amount_cents:10001,category_id:category.id,account_id:account.id,due_date:today,competence_date:today});
 const values={category_id:category.id,line_code:'RB',valid_from:'2000-01-01',valid_to:'2099-12-31',expected_revision:0,reason:'Classificação fictícia documentada na fixture'};
 const preview=await req(page,'/finance/dre/mappings/preview',values,200);await req(page,'/finance/dre/mappings',{...values,preview_token:preview.preview_token});
 const report=await req(page,'/finance/dre?'+new URLSearchParams(period));const issue=report.issues.find((r:any)=>r.key===`finance_entry:${entry.id}:principal`);
 const policy=await req(page,'/finance/dre/recognition-policy?'+new URLSearchParams({source_key:issue.key,economic_date:today}));
 await req(page,'/finance/dre/recognition-review',{source_key:issue.key,decision:'recognize',economic_date:today,evidence_kind:'Comprovante fictício',expected_revision:0,request_key:randomUUID(),source_fingerprint:issue.source_fingerprint,policy_fingerprint:policy.policy_fingerprint,reason:'Reconhecimento fictício apenas em teste descartável'});
 await page.goto('/app#finance-reports');await page.getByLabel('Relatório',{exact:true}).selectOption('dre');await expect(page.locator('.dre-lines')).toContainText('100,01');
 if(diagnostic){await page.getByRole('link',{name:'Configuração da DRE',exact:true}).click();await expect(page.locator('.dre-configuration .dre-lines')).toBeVisible();}
 let started!:()=>void;const intercepted=new Promise<void>(r=>started=r);let release!:()=>void;const held=new Promise<void>(r=>release=r);
 await page.route('**/api/finance/dre?*',async route=>{const response=await route.fetch();expect(response.status()).toBe(200);started();await held;await route.fulfill({response})});
 await page.getByRole('button',{name:diagnostic?'Exportar diagnóstico CSV':'Exportar CSV',exact:true}).click();await intercepted;
 await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByRole('heading',{name:'Acesse seu espaço'})).toBeVisible();await login(page,'demo.operador');
 expect((await page.request.get('/api/finance/dre?'+new URLSearchParams(period))).status()).toBe(403);
 // Start the negative observation only after the new identity is established;
 // a slow logout/login must not consume the window before releasing the body.
 const download=page.waitForEvent('download',{timeout:10000}).catch(()=>null);
 release();const result=await download;expect(result,'No download may survive the authenticated identity change').toBeNull();
});
