const fs=require('fs'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT,out=process.env.SILEX_EVIDENCE,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright');
(async()=>{const browser=await firefox.launch({executablePath:process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[],navigation=[];
try{for(const [variant,origin] of [['baseline',process.env.SILEX_BASELINE],['candidate',process.env.SILEX_CANDIDATE]]){
 for(const [locale,timezoneId] of [['pt-BR','America/Manaus'],['en-US','UTC'],['pt-BR','Pacific/Kiritimati']]){
  const page=await browser.newPage({viewport:{width:375,height:900},locale,timezoneId});
  await page.goto(origin+'/app#finance-accounts');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.waitForURL('**/app#finance-accounts');await page.locator('.app-shell main h1').waitFor();await page.waitForLoadState('networkidle');
  const opener=page.getByRole('button',{name:'Nova conta',exact:true});await opener.click();
  const field=page.getByLabel('Referência do saldo inicial *',{exact:true});await field.fill('2024-02-29');
  const native=await field.evaluate(e=>({declaredType:e.getAttribute('type'),effectiveType:e.type,value:e.value,valueAsDate:e.valueAsDate?.toISOString(),valid:e.validity.valid,language:navigator.language,lang:e.lang,min:e.min,max:e.max,required:e.required}));
  await page.mouse.move(0,0);await page.screenshot({path:`${out}/screenshots/${variant}-native-${locale}-${timezoneId.replaceAll('/','_')}.png`,fullPage:true});
  await page.keyboard.press('Escape');const focusReturned=await opener.evaluate(e=>e===document.activeElement);
  await page.goto(origin+'/app#finance-reports');await page.reload();await page.waitForLoadState('networkidle');
  const month=await page.locator('input[type=month]').first().evaluate(e=>({declaredType:e.getAttribute('type'),effectiveType:e.type,value:e.value,lang:e.lang}));
  rows.push({variant,locale,timezoneId,browser:await browser.version(),native,month,focusReturned});
  if(native.value!=='2024-02-29'||!native.valid||!focusReturned)throw Error(JSON.stringify(rows.at(-1)));
  await page.close();
 }
 for(const width of [1440,768,375]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});const consoleErrors=[],networkErrors=[];
  page.on('pageerror',e=>consoleErrors.push(e.message));page.on('requestfailed',r=>networkErrors.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  await page.goto(origin+'/app#home');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/app#home');await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);
  await page.screenshot({path:`${out}/screenshots/${variant}-home-${width}.png`,fullPage:true});
  for(let execution=1;execution<=10;execution++){
   await page.goto(origin+'/app#finance-dashboard');await page.reload();await page.locator('.settings-list li').first().waitFor();await page.waitForFunction(()=>document.querySelector('.silex-financial-dashboard')?.getAttribute('aria-busy')==='false');
   const auth=(await page.request.get(origin+'/api/auth/me')).status(),before=page.url();
   await page.getByRole('button',{name:'Abrir livro caixa',exact:true}).click();await page.waitForURL('**/app#finance');await page.getByRole('heading',{name:'Lançamentos (Despesa/Receita)',exact:true}).waitFor();
   navigation.push({variant,width,execution,before,expected:'/app#finance',observed:page.url(),auth,loadingAtClick:false,consoleErrors:[...consoleErrors],networkErrors:[...networkErrors]});
  }
  await page.close();
 }
}
// Corrected historical comparison: same pointer position, exact Home and valid session.
const page=await browser.newPage({viewport:{width:375,height:900},locale:'pt-BR'});await page.goto(process.env.SILEX_HISTORICAL+'/app#home');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/app#home');await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);await page.screenshot({path:`${out}/screenshots/historical-c269-home-375.png`,fullPage:true});await page.close();
fs.writeFileSync(out+'/native-and-v01.json',JSON.stringify({rows,navigation,zoom_native_homologated:false,screen_reader_homologated:false},null,2));
console.log(rows.length,'native probes;',navigation.length,'V01 clicks');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
