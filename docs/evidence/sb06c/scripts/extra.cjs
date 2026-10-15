const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const {firefox}=createRequire(process.env.SILEX_FRONTEND+'/package.json')('playwright');
const {measure}=require('./audit.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});const rows=[],navigation=[];try{
for(const variant of ['baseline','candidate'])for(const width of [1440,768,375,320]){
 const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'}),origin=process.env[variant==='baseline'?'SILEX_BASELINE':'SILEX_CANDIDATE'];
 await page.goto(origin+'/app#pos');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('main h1').waitFor();await page.waitForLoadState('networkidle');
 await page.locator('.product-tile').first().click();rows.push({variant,width,route:'pos',state:'cart-filled',...await page.evaluate(measure)});
 if(width!==320)await page.screenshot({path:path.join(process.env.SILEX_EVIDENCE,'screenshots',`${variant}-pos-cart-${width}.png`),fullPage:true});
 await page.goto(origin+'/app#customers');await page.waitForLoadState('networkidle');
 const opener=page.getByRole('button',{name:'Novo cliente',exact:true});await opener.click();await page.locator('dialog[open]').waitFor();
 const checks=await page.locator('dialog input[type=checkbox]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),l=e.closest('label')||e.labels?.[0],lr=l?.getBoundingClientRect();return {input:{width:r.width,height:r.height},label:lr?{width:lr.width,height:lr.height}:null,associated:!!l};}));
 rows.push({variant,width,route:'customers',state:'checkbox-labels',checks});await page.keyboard.press('Escape');
 const menu=page.getByRole('button',{name:'Abrir menu',exact:true});if(await menu.isVisible())await menu.click();
 const nav=page.locator('.sidebar .nav-item').first();await nav.hover();rows.push({variant,width,route:'menu',state:'hover',...await page.evaluate(measure)});await page.keyboard.press('Tab');await nav.focus();rows.push({variant,width,route:'menu',state:'focus-selected',...await page.evaluate(measure)});
 if(width!==320)await page.screenshot({path:path.join(process.env.SILEX_EVIDENCE,'screenshots',`${variant}-menu-${width}.png`)});if(await menu.isVisible())await page.keyboard.press('Escape');
 await page.goto(origin+'/app#finance-payable');await page.waitForLoadState('networkidle');
 const input=page.locator('.input-with-icon input');for(let i=0;i<300;i++){if(await input.evaluate(e=>e===document.activeElement))break;await page.keyboard.press('Tab');}
 rows.push({variant,width,route:'finance-payable',state:'keyboard-search',...await page.evaluate(measure)});if(width!==320)await page.screenshot({path:path.join(process.env.SILEX_EVIDENCE,'screenshots',`${variant}-payable-focus-${width}.png`)});
 // Actual computed font sizes doubled, as a text-enlargement simulation, not native zoom.
 await page.evaluate(()=>{const all=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement);const sizes=all.map(e=>parseFloat(getComputedStyle(e).fontSize));all.forEach((e,i)=>e.style.fontSize=sizes[i]*2+'px');});
 rows.push({variant,width,route:'finance-payable',state:'text200-simulation',...await page.evaluate(measure)});if(width!==320)await page.screenshot({path:path.join(process.env.SILEX_EVIDENCE,'screenshots',`${variant}-payable-text200-${width}.png`),fullPage:true});
 for(const route of ['home','dashboard','customers','products','pos','sales','stock','finance','finance-receivable','finance-reconcile','finance-dashboard','company-settings']){
  await page.goto(origin+'/app#'+route);await page.reload();await page.waitForLoadState('networkidle');
  await page.evaluate(()=>{const es=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement),sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]*2+'px');});
  rows.push({variant,width,route,state:'text200-simulation',...await page.evaluate(measure)});
 }
 if(variant==='candidate'&&width===375){
  await page.reload();await page.waitForLoadState('networkidle');
  const metrics=()=>({inner:innerWidth,dpr:devicePixelRatio,scale:visualViewport?.scale});
  const before=await page.evaluate(metrics);const attempts=[];
  for(const presses of [2,6]){await page.keyboard.press('Control+0');for(let i=0;i<presses;i++)await page.keyboard.press('Control+Equal');attempts.push({presses,metrics:await page.evaluate(metrics)});}
  await page.keyboard.press('Control+0');rows.push({variant,width,state:'native-zoom-attempt',before,attempts,homologated:false});
 }
 if(width!==320){
  const consoleErrors=[],networkErrors=[];page.on('pageerror',e=>consoleErrors.push(e.message));page.on('requestfailed',r=>networkErrors.push({url:r.url(),error:r.failure()?.errorText}));
  for(let n=1;n<=10;n++){
   await page.goto(origin+'/app#finance-dashboard');await page.reload();await page.locator('.settings-list li').first().waitFor();await page.waitForFunction(()=>document.querySelector('.silex-financial-dashboard')?.getAttribute('aria-busy')==='false');
   const auth=(await page.request.get(origin+'/api/auth/me')).status(),before=page.url(),start=Date.now();let failure=null;
   try{await page.getByRole('button',{name:'Abrir livro caixa',exact:true}).click({timeout:5000});await page.waitForURL('**/app#finance',{timeout:5000});await page.getByRole('heading',{name:'Lançamentos (Despesa/Receita)',exact:true}).waitFor();}catch(e){failure=e.message;}
   navigation.push({variant,width,execution:n,before,expected:'/app#finance',observed:page.url(),auth,loadingAtClick:false,elapsedMs:Date.now()-start,failure,consoleErrors:[...consoleErrors],networkErrors:[...networkErrors]});
  }
 }
 await page.close();console.log(variant,width,'done');
 fs.writeFileSync(path.join(process.env.SILEX_EVIDENCE,'extra-audit.json'),JSON.stringify(rows,null,2));
 fs.writeFileSync(path.join(process.env.SILEX_EVIDENCE,'v01-navigation.json'),JSON.stringify(navigation,null,2));
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
