import {test,expect,type Page} from '@playwright/test';

async function login(page:Page,route:string){
 await page.goto('/app#'+route);await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD!);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(new RegExp('/app#'+route+'$'));await expect(page.locator('.app-shell main h1')).toBeVisible();await page.waitForLoadState('networkidle');
}

test('CSS pilot: ledger caption family keeps tokens, semantics and text enlargement',async({page})=>{
 await login(page,'finance');
 const captions=page.locator('.silex-ledger .summary-card span,.silex-ledger .summary-card small');
 await expect(captions).toHaveCount(8);const original=await captions.allTextContents();
 const values=await captions.evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {text:e.textContent,font:s.fontSize,line:s.lineHeight,color:s.color,caption:getComputedStyle(document.documentElement).getPropertyValue('--silex-size-caption').trim()};}));
 for(const value of values){expect(value.font).toBe(value.caption);expect(value.line).toBe('18px');expect(value.text?.trim()).not.toBe('');}
 const before=await page.locator('.summary-card strong').allTextContents();
 await captions.evaluateAll(es=>es.forEach(e=>{(e as HTMLElement).style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*2)+'px'}));
 for(const size of await captions.evaluateAll(es=>es.map(e=>getComputedStyle(e).fontSize)))expect(size).toBe('24px');
 await expect(captions).toHaveText(original);await expect(page.locator('.summary-card strong')).toHaveText(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('CSS cascade: entry sheet stays first across warm operational routes',async({page})=>{
 await login(page,'home');
 const sheets=()=>page.evaluate(()=>[...document.styleSheets].map(s=>s.href?new URL(s.href).pathname.replace(/-[A-Za-z0-9_-]+\.css$/,'.css'):'inline'));
 const initial=await sheets();expect(initial).toEqual(['/assets/index.css','/assets/App.css']);
 for(const route of ['finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard','home']){
  await page.goto('/app#'+route);await page.waitForLoadState('networkidle');expect(await sheets()).toEqual(initial);
 }
});

test('Monthly report capture: networkidle can precede the correct API and rendered rows',async({page},info)=>{
 // Test-only deferred network request. No response mutation, timer or production hook.
 await page.addInitScript(()=>{
  const original=window.fetch.bind(window);let intercepted=false;
  window.fetch=async(...args:Parameters<typeof fetch>)=>{
   const input=args[0],raw=typeof input==='string'?input:input instanceof Request?input.url:String(input);
   if(new URL(raw,location.href).pathname==='/api/finance/reports/result-monthly'&&!intercepted){intercepted=true;await new Promise<void>(resolve=>{(window as Window & {__releaseCssReport?:()=>void}).__releaseCssReport=resolve;});}
   return original(...args);
  };
 });
 await login(page,'finance-reports');await expect(page.locator('.finance-report-print h2')).toHaveText('Fluxo de caixa mensal');
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/reports/result-monthly'&&r.status()===200);
 await page.getByLabel('Relatório',{exact:true}).selectOption('result-monthly');
 await page.waitForFunction(()=>Boolean((window as Window & {__releaseCssReport?:()=>void}).__releaseCssReport));
 await page.waitForLoadState('networkidle');await expect(page.locator('.finance-report-print .empty')).toContainText('Carregando');
 await expect(page.getByLabel('Relatório',{exact:true})).toHaveValue('result-monthly');
 await page.evaluate(()=>(window as Window & {__releaseCssReport?:()=>void}).__releaseCssReport!());
 const data=await(await response).json();await expect(page.locator('.finance-report-print h2')).toHaveText(data.name);
 await expect(page.locator('.finance-report-print .empty').filter({hasText:'Carregando'})).toHaveCount(0);
 await expect(page.locator('.finance-report-print tbody tr')).toHaveCount(data.items.length);
 for(let i=0;i<data.items.length;i++){
  await expect(page.locator('.finance-report-print tbody tr').nth(i).locator('td').first()).toHaveText(data.items[i].group.replace(/(\d{4})-(\d{2})$/,'$2/$1'));
 }
 await info.attach('report-readiness',{body:JSON.stringify({selected:'result-monthly',response_id:data.id,name:data.name,total:data.total,rendered_rows:await page.locator('.finance-report-print tbody tr').count(),controlled_latency:true,networkidle_alone_insufficient:true}),contentType:'application/json'});
});
