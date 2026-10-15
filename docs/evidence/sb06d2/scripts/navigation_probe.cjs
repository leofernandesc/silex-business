const fs=require('fs'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright'),{settled}=require('./matrix.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[];try{
 for(const [variant,origin] of [['baseline',process.env.SILEX_BASELINE],['candidate',process.env.SILEX_CANDIDATE]])for(const width of [1440,768,375]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});let consoleErrors=[],networkErrors=[],events=[];page.on('pageerror',e=>consoleErrors.push(e.message));page.on('requestfailed',r=>networkErrors.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));page.on('framenavigated',f=>{if(f===page.mainFrame())events.push({path:new URL(f.url()).pathname+new URL(f.url()).hash,time:Date.now()});});
  await page.goto(origin+'/app#home');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/app#home');await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();await settled(page);
  for(let execution=1;execution<=10;execution++){
   const loaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/dashboard'&&r.status()===200);await page.goto(origin+'/app#finance-dashboard');await loaded;await page.locator('.silex-financial-dashboard[aria-busy=false]').waitFor();await settled(page);
   const preparation={consoleErrors,networkErrors,events};consoleErrors=[];networkErrors=[];events=[];
   const auth=(await page.request.get(origin+'/api/auth/me')).status(),before=page.url(),started=Date.now();await page.getByRole('button',{name:'Abrir livro caixa',exact:true}).click();await page.waitForURL('**/app#finance');await page.getByRole('heading',{name:'Lançamentos (Despesa/Receita)',exact:true}).waitFor();await settled(page);
   rows.push({variant,width,execution,profile:'admin',auth,loadingAtClick:false,before,expected:'/app#finance',observed:page.url(),elapsedMs:Date.now()-started,preparation,consoleErrors,networkErrors,events});
  }
  await page.close();
 }
 fs.writeFileSync(process.env.SILEX_EVIDENCE+'/v01-navigation.json',JSON.stringify(rows,null,2));console.log(rows.length,'V01 clicks; observation remains open');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
