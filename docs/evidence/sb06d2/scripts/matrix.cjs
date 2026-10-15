// Browser-owned computed values and real CSSOM order. No production hooks or data mutation.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT,out=process.env.SILEX_EVIDENCE,req=createRequire(root+'/frontend/package.json');
const {firefox}=req('playwright'),{expect}=req('@playwright/test');
const selectors=['.topbar','.breadcrumb','.topbar-right','.sidebar','.sidebar .nav-item.active','.sidebar .nav-group-toggle','.page-title','main h1','main h2','.page-title p','main .help','main .field label','main input','main select','main button.primary','main button:not(.primary)','.summary-grid','.summary-card','.summary-card span','.summary-card small','.summary-card strong','.summary-icon','main button.selected','main .badge','main .notice','.table-wrap','main table','main th','main td','main .row-actions button','main .pagination button','.ledger-scroll-hint','.ledger-date-caption','dialog[open]','dialog[open] header','dialog[open] input','dialog[open] button','.login-card','.login-card h2','.login-card input','.login-card button','.login-note','.silex-public h1','.silex-public p','.silex-public a','.silex-public button','.silex-public__nav'];
const properties=['font-family','font-size','font-weight','font-variant-numeric','font-style','line-height','letter-spacing','color','background-color','background-image','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-top-width','border-right-width','border-bottom-width','border-left-width','border-radius','box-shadow','outline-color','outline-style','outline-width','outline-offset','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','display','position','top','right','bottom','left','z-index','width','height','min-width','max-width','min-height','max-height','box-sizing','gap','row-gap','column-gap','flex','flex-direction','flex-wrap','align-items','justify-content','grid-template-columns','grid-template-rows','white-space','overflow-wrap','word-break','overflow-x','overflow-y','text-align','text-overflow','opacity','visibility','transform','cursor','pointer-events','transition-property','transition-duration'];
const routes=['home','dashboard','customers','products','sales','pos','stock','finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard','finance-reports','company-settings'];
const endpoints={home:'/api/company-settings',dashboard:'/api/dashboard',customers:'/api/customers',products:'/api/products',sales:'/api/sales',pos:'/api/products',stock:'/api/stock-movements',finance:'/api/finance/movements','finance-payable':'/api/finance','finance-receivable':'/api/finance','finance-reconcile':'/api/finance/ofx/imports','finance-dashboard':'/api/finance/dashboard','finance-reports':'/api/finance/reports/cash-monthly','company-settings':'/api/company-settings'};
async function settled(page){
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>![...document.querySelectorAll('main .empty,main [role=status]')].some(e=>e.getClientRects().length&&/Carregando/.test(e.textContent||'')));
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.effect&&Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
}
async function reportReady(page,slug,trigger){
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/reports/'+slug&&r.status()===200);
 await trigger();const r=await response;await r.finished();const json=await r.json();
 await expect(page.getByLabel('Relatório',{exact:true})).toHaveValue(slug);
 await expect(page.locator('.finance-report-print h2')).toHaveText(json.name);
 await expect(page.locator('.finance-report-print .empty').filter({hasText:'Carregando'})).toHaveCount(0);
 const fields=Object.keys(json.items[0]||{}),expected=json.items.map(row=>fields.map(key=>{
  const value=row[key];if(value===null||value===undefined)return '—';
  if(key.endsWith('_cents')&&typeof value==='number')return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
  if(key==='group'&&typeof value==='string')return process.env.SILEX_VARIANT==='historical-aa'?value:value.replace(/(\d{4})-(\d{2})$/,'$2/$1');
  return String(value);
 }));
 const table=page.locator('.finance-report-print tbody tr');
 if(expected.length){await expect(table).toHaveCount(expected.length);for(let i=0;i<expected.length;i++)for(let j=0;j<expected[i].length;j++)await expect(table.nth(i).locator('td').nth(j)).toHaveText(expected[i][j]);}
 else await expect(page.locator('.finance-report-print .empty')).toContainText('Nenhum registro');
 await settled(page);
 return {slug,name:json.name,total:json.total,rows:json.items.length,request:new URL(r.url()).pathname+new URL(r.url()).search,response_sha256:crypto.createHash('sha256').update(JSON.stringify(json)).digest('hex'),table:await table.allTextContents(),loading:false};
}
function measure({selectors,properties}){
 const round=n=>Math.round(n*1000)/1000,nodes=[];
 for(const selector of selectors){const es=[...document.querySelectorAll(selector)].slice(0,selector.includes('summary')?8:3);for(let index=0;index<es.length;index++){
  const e=es[index],s=getComputedStyle(e),r=e.getBoundingClientRect();nodes.push({selector,index,tag:e.tagName,text:(e.textContent||'').trim().slice(0,180),style:Object.fromEntries(properties.map(p=>[p,s.getPropertyValue(p)])),rect:{x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height)},scroll:{width:e.scrollWidth,height:e.scrollHeight,clientWidth:e.clientWidth,clientHeight:e.clientHeight,left:e.scrollLeft},disabled:e.matches(':disabled'),selected:e.matches('.selected,.active,[aria-selected=true]'),invalid:e.matches(':invalid'),inert:!!e.closest('[inert]'),focusVisible:e.matches(':focus-visible')});
 }}
 const sheets=[...document.styleSheets].map((s,index)=>({index,href:s.href?new URL(s.href).pathname:null,logical:s.href?new URL(s.href).pathname.replace(/-[A-Za-z0-9_-]+\.css$/,'.css'):'inline',media:s.media.mediaText,disabled:s.disabled,rules:s.cssRules.length}));
 return {viewport:innerWidth,document:document.documentElement.scrollWidth,nodes,sheets};
}
async function keyboardFocus(page,target){
 for(let i=0;i<240;i++){if(await target.evaluate(e=>e===document.activeElement))return;const reverse=await target.evaluate(e=>!!(document.activeElement&&e.compareDocumentPosition(document.activeElement)&Node.DOCUMENT_POSITION_FOLLOWING));await page.keyboard.press(reverse?'Shift+Tab':'Tab');}
 throw Error('Keyboard target not reached');
}
module.exports={measure,settled,reportReady,selectors,properties};
if(require.main===module)(async()=>{
 const browser=await firefox.launch({executablePath:process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),variant=process.env.SILEX_VARIANT,origin=process.env.SILEX_ORIGIN,rows=[],errors=[],reports=[];
 fs.mkdirSync(out+'/screenshots',{recursive:true});
 const save=()=>fs.writeFileSync(out+'/'+variant+'-matrix.json',JSON.stringify({variant,properties,rows,reports,errors}));
 try{for(const width of [1440,768,375,320]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR',timezoneId:'America/Manaus'});page.on('pageerror',e=>errors.push({width,message:e.message}));
  const snap=async(route,state,png=false)=>{await settled(page);rows.push({width,route,state,...await page.evaluate(measure,{selectors,properties})});if(png&&width!==320)await page.screenshot({path:`${out}/screenshots/${variant}-${route}-${state}-${width}.png`,fullPage:true});save();};
  await page.goto(origin+'/');await page.locator('.silex-public h1').waitFor();await snap('public','normal',true);
  const publicMenu=page.getByRole('button',{name:'Abrir navegação pública',exact:true});if(await publicMenu.isVisible()){await publicMenu.click();await snap('public','menu-open');await page.keyboard.press('Escape');}
  await page.goto(origin+'/entrar');await page.locator('.login-card h2').waitFor();await snap('login','normal',true);
  await keyboardFocus(page,page.getByLabel('Usuário',{exact:true}));await snap('login','focus');
  await page.goto(origin+'/app#home');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/app#home');await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();
  for(const route of routes){
   if(route!=='home'){
    const response=page.waitForResponse(r=>new URL(r.url()).pathname===endpoints[route]&&r.status()===200);
    await page.goto(origin+'/app#'+route);await response;await page.locator('.app-shell main h1').waitFor();
   }
   await page.mouse.move(0,0);await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0)});await snap(route,'normal',true);
   const controls=page.locator('main input:not([type=hidden]):not(:disabled), main button:not(:disabled),main select:not(:disabled)');
   const first=controls.first();if(await first.isVisible()){
    await first.hover();await snap(route,'hover');await page.mouse.move(0,0);await keyboardFocus(page,first);await snap(route,'focus');
   }
   if(['customers','finance'].includes(route)){
    const opener=page.getByRole('button',{name:route==='customers'?'Novo cliente':'Nova despesa',exact:true});await opener.click();await page.locator('dialog[open]').waitFor();await snap(route,'modal',true);await page.keyboard.press('Escape');await expect(opener).toBeFocused();
   }
   if(route==='home'&&width<=768){const open=page.getByRole('button',{name:'Abrir menu',exact:true});await open.click();await snap(route,'menu-open',true);await page.keyboard.press('Escape');await expect(open).toBeFocused();}
   if(route==='finance-reports'){
    const report=await reportReady(page,'result-monthly',()=>page.getByLabel('Relatório',{exact:true}).selectOption('result-monthly'));reports.push({width,...report});await snap(route,'result-monthly',true);
    const monthly=await reportReady(page,'cash-monthly',()=>page.getByLabel('Relatório',{exact:true}).selectOption('cash-monthly'));reports.push({width,...monthly});await snap(route,'cash-monthly',true);
   }
   if(route==='finance'){
    await page.locator('main').evaluate(main=>{const es=[main,...main.querySelectorAll('*')].filter(e=>e instanceof HTMLElement),sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]*2+'px');});await snap(route,'text200',true);
    const loaded=page.waitForResponse(r=>new URL(r.url()).pathname===endpoints[route]&&r.status()===200);await page.reload();await loaded;await settled(page);
    await page.getByLabel('De',{exact:true}).fill('2026-10-31');await page.getByLabel('Até',{exact:true}).fill('2026-10-01');const failed=page.waitForResponse(r=>new URL(r.url()).pathname===endpoints[route]&&r.status()===422);await page.getByRole('button',{name:'Pesquisar',exact:true}).click();await failed;await page.getByRole('alert').waitFor();await snap(route,'error',true);
   }
   console.log(variant,width,route,rows.length);save();
  }
  await page.close();
 }}finally{save();await browser.close();}
 if(errors.length)throw Error(JSON.stringify(errors));console.log('DONE',rows.length,'states');
})().catch(e=>{console.error(e);process.exitCode=1;});
