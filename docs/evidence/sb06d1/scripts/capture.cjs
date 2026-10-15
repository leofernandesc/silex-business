const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT,out=process.env.SILEX_EVIDENCE;
const req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright');
process.env.SILEX_FRONTEND ||= root+'/frontend';
const {measure}=require(root+'/docs/evidence/sb06c/scripts/audit.cjs');
const routes=['home','dashboard','customers','products','suppliers','day-workers','subcontracted-freight','stock','pos','sales','service-orders','cash','finance','finance-dashboard','finance-reconcile','finance-payable','finance-receivable','finance-accounts','finance-categories','finance-subcategories','finance-reports','users','audit','company-settings'];
const capture=new Set(['home','finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard','finance-reports','sales','stock']);
async function settled(page,route){
 await page.waitForURL('**/app#'+route);
 await page.locator('.app-shell main h1').waitFor();
 await page.locator('.login-page').waitFor({state:'detached'});
 await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 if(!await page.evaluate(()=>document.querySelector('.app-shell main h1')?.textContent?.trim()))throw Error('Unsettled shell');
}
(async()=>{
 const browser=await firefox.launch({executablePath:process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});
 fs.mkdirSync(out+'/screenshots',{recursive:true});const rows=[],errors=[],home=[];
 try{for(const [variant,origin] of [['baseline',process.env.SILEX_BASELINE],['candidate',process.env.SILEX_CANDIDATE],['historical-c269',process.env.SILEX_HISTORICAL]]){
  for(const width of variant==='historical-c269'?[375]:[1440,768,375]){
   const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR',timezoneId:'America/Manaus'}),events=[];
   page.on('pageerror',e=>errors.push({variant,width,message:e.message}));
   page.on('framenavigated',f=>{if(f===page.mainFrame())events.push({type:'navigation',path:new URL(f.url()).pathname+new URL(f.url()).hash});});
   page.on('response',r=>{if(/\/api\/auth\//.test(r.url()))events.push({type:'auth-response',path:new URL(r.url()).pathname,status:r.status()});});
   await page.goto(origin+'/app#home');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);
   const login=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Entrar',exact:true}).click();if((await login).status()!==200)throw Error('Login failed');
   await settled(page,'home');await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();
   const me=await page.request.get(origin+'/api/auth/me');if(me.status()!==200)throw Error('Session not ready');
   home.push({variant,width,url:page.url(),heading:await page.locator('main h1').innerText(),session_status:me.status(),events});
   for(const route of variant==='historical-c269'?['home']:routes){
    if(route!=='home'){await page.goto(origin+'/app#'+route);await page.reload();await settled(page,route);}
    const m=await page.evaluate(measure);
    const controls=await page.locator('input[type=date],input[type=month]').evaluateAll(es=>es.map(e=>({type:e.type,value:e.value,lang:e.lang,min:e.min,max:e.max,required:e.required,label:e.labels?.[0]?.textContent?.trim(),description:e.getAttribute('aria-describedby')})));
    rows.push({variant,width,route,heading:await page.locator('main h1').innerText(),viewport:m.viewport,document:m.document,tableColumns:m.tableColumns,textFailures:m.texts.filter(t=>t.fail),minTarget:m.controls.length?Math.min(...m.controls.filter(c=>!c.disabled).map(c=>Math.min(c.rect.width,c.rect.height))):null,dateControls:controls});
    if(capture.has(route))await page.screenshot({path:`${out}/screenshots/${variant}-${route}-${width}.png`,fullPage:true});
    if(route==='finance-reports'){
      await page.getByLabel('Relatório',{exact:true}).selectOption('result-monthly');await page.waitForLoadState('networkidle');
      rows.push({variant,width,route,state:'result-monthly',groups:await page.locator('.finance-report-print tbody tr td:first-child').allTextContents()});
      await page.screenshot({path:`${out}/screenshots/${variant}-result-monthly-${width}.png`,fullPage:true});
    }
    if(route==='home'||route==='finance-reports'){
      const before=await page.locator('main').innerText();
      await page.locator('main').evaluate(main=>{for(const e of [main,...main.querySelectorAll('*')]){if(e instanceof HTMLElement){e.dataset.testFont=getComputedStyle(e).fontSize;}}for(const e of [main,...main.querySelectorAll('*')])if(e instanceof HTMLElement)e.style.fontSize=(parseFloat(e.dataset.testFont||'16px')*2)+'px';});
      const enlarged=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
      rows.push({variant,width,route,state:'text200',...enlarged,text_preserved:before===await page.locator('main').innerText()});
      await page.screenshot({path:`${out}/screenshots/${variant}-${route}-text200-${width}.png`,fullPage:true});
      // Reload prevents enlarged inline styles from leaking across hash navigation.
      await page.reload();await settled(page,route);
    }
    fs.writeFileSync(out+'/visual-checks.json',JSON.stringify({rows,home,errors},null,2));
   }
   if(variant!=='historical-c269')for(const route of ['login','public']){await page.goto(origin+(route==='login'?'/entrar':'/'));await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/screenshots/${variant}-${route}-${width}.png`,fullPage:true});}
   await page.close();console.log(variant,width,'completed');
  }
 }
 }finally{await browser.close();}
 if(errors.length)throw Error(JSON.stringify(errors));
 console.log('Settled checks',rows.length,'Home sessions',home.length);
})().catch(e=>{console.error(e);process.exitCode=1;});
