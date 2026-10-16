// Real clicks and real server responses, with a test-only delivery gate for loading races.
const fs=require('fs'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright'),{expect}=req('@playwright/test'),{settled}=require('../../../evidence/sb06d2/scripts/matrix.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[],publicRows=[];
const save=()=>{fs.writeFileSync(process.env.SILEX_EVIDENCE+'/v01-navigation.json',JSON.stringify(rows,null,2));fs.writeFileSync(process.env.SILEX_EVIDENCE+'/t01-public.json',JSON.stringify(publicRows,null,2));};
try{for(const [variant,origin] of [['baseline',process.env.SILEX_BASELINE],['candidate',process.env.SILEX_CANDIDATE]])for(const width of [1440,768,375])for(const mode of ['loaded','held-response-during-loading']){
 const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});let errors=[],networkFailures=[],events=[],responses=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});page.on('requestfailed',r=>networkFailures.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));page.on('response',r=>{if(r.url().includes('/api/'))responses.push({path:new URL(r.url()).pathname,status:r.status()});});page.on('framenavigated',f=>{if(f===page.mainFrame())events.push(new URL(f.url()).pathname+new URL(f.url()).hash);});
 if(mode!=='loaded')await page.addInitScript(()=>{const original=window.fetch.bind(window);window.fetch=async(...args)=>{const input=args[0],u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);const response=await original(...args);if(u.pathname==='/api/finance/dashboard'){window.__SB06E_GATE_HIT__=true;await new Promise(resolve=>window.__SB06E_RELEASE__=resolve);}return response;};});
 const auth=await page.request.post(origin+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});if(auth.status()!==200)throw Error('Login failed');
 for(let execution=1;execution<=(mode==='loaded'?10:5);execution++){
  errors=[];networkFailures=[];events=[];responses=[];await page.goto(origin+'/app#finance-dashboard');await page.getByRole('heading',{name:'Dashboard financeiro',exact:true}).waitFor();
  if(mode==='loaded'){await page.locator('.silex-financial-dashboard[aria-busy=false]').waitFor();await settled(page);}else await page.waitForFunction(()=>window.__SB06E_GATE_HIT__===true);
  const session=(await page.request.get(origin+'/api/auth/me')).status(),loading=await page.locator('.silex-financial-dashboard').getAttribute('aria-busy'),before=page.url(),started=Date.now();
  await page.getByRole('button',{name:'Abrir livro caixa',exact:true}).click();await page.waitForURL('**/app#finance');await page.getByRole('heading',{name:'Lançamentos (Despesa/Receita)',exact:true}).waitFor();
  if(mode!=='loaded')await page.evaluate(()=>window.__SB06E_RELEASE__());await settled(page);
  const observed=new URL(page.url()).pathname+new URL(page.url()).hash,pass=observed==='/app#finance'&&session===200&&errors.length===0&&networkFailures.length===0;
  rows.push({variant,width,mode,execution,session,loadingAtClick:loading,before,expected:'/app#finance',observed,elapsedMs:Date.now()-started,pass,errors,networkFailures,responses,events});save();expect(pass,JSON.stringify(rows.at(-1))).toBe(true);
 }await page.close();
}
for(const width of [1440,768,375]){const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});let events=[];page.on('pageerror',e=>events.push({type:'pageerror',message:e.message}));page.on('console',m=>{if(m.type()==='error')events.push({type:'console-error',message:m.text()})});page.on('requestfailed',r=>events.push({type:'requestfailed',path:new URL(r.url()).pathname,reason:r.failure()?.errorText}));page.on('response',r=>events.push({type:'response',path:new URL(r.url()).pathname,status:r.status()}));
 for(let execution=1;execution<=5;execution++){
  events=[];const started=Date.now();await page.goto(process.env.SILEX_CANDIDATE+'/');await page.getByRole('heading',{level:1}).waitFor();await page.getByRole('link',{name:'Conhecer os módulos',exact:true}).click();await expect(page.locator('#modulos')).toBeInViewport();await page.reload();await expect(page.locator('#modulos')).toBeInViewport();await page.evaluate(()=>document.fonts.ready);await page.locator('.silex-public__header').getByRole('link',{name:'Entrar',exact:true}).waitFor();
  const readiness=await page.evaluate(()=>({heading:document.querySelector('h1')?.textContent,fonts:document.fonts.status,readyState:document.readyState,path:location.pathname,hash:location.hash,privateShell:!!document.querySelector('.app-shell')}));
  // networkidle is measured after actual interface predicates, not used alone.
  await page.waitForLoadState('networkidle');const pass=!events.some(e=>e.type!=='response'||e.status>=400||e.path.startsWith('/api/'))&&!readiness.privateShell;
  publicRows.push({width,execution,elapsedMs:Date.now()-started,readiness,events,pass});save();expect(pass).toBe(true);
 }await page.close();}
console.log('V01',rows.length,'passes; T01',publicRows.length,'passes; neither observation closed');
}finally{save();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
