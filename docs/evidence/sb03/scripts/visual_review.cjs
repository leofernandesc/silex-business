const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { firefox } = createRequire('/home/leofernandesc/controlmax-inspired/frontend/package.json')('playwright');
const evidence = path.resolve(__dirname, '..');
const widths = [1440, 768, 375];
const screens = [['dashboard','Visão geral'],['customers','Clientes'],['products','Produtos ou Serviços'],['pos','Frente de Caixa'],['sales','Vendas'],['finance','Lançamentos (Despesa/Receita)'],['finance-dashboard','Dashboard financeiro'],['company-settings','Empresa e identidade']];
(async () => {
 const browser = await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox',headless:true});
 const results = [], errors = [], external = [];
 try {
  for (const variant of ['before','after']) for (const width of widths) {
   const origin = `http://127.0.0.1:${variant==='before'?18024:18023}`;
   const context = await browser.newContext({viewport:{width,height:width===1440?900:width===768?1024:812},locale:'pt-BR'});
   const page = await context.newPage(); const pending = new Set(); let finished = Date.now();
   page.on('request',r=>{if(r.url().includes('/api/'))pending.add(r); if(!r.url().startsWith(origin))external.push(r.url());});
   const done = r=>{pending.delete(r);finished=Date.now();};page.on('requestfinished',done);page.on('requestfailed',done);
   page.on('pageerror',e=>errors.push({variant,width,message:e.message}));
   async function settle(){await page.waitForTimeout(120);const until=Date.now()+15000;while(pending.size||Date.now()-finished<250){if(Date.now()>until)throw Error('API readiness timeout');await page.waitForTimeout(80);}await page.evaluate(()=>document.fonts.ready);}
   async function capture(id){await settle();const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,font:getComputedStyle(document.body).fontFamily,inter400:document.fonts.check('400 14px "Silex Inter Local"'),inter600:document.fonts.check('600 14px "Silex Inter Local"'),url:location.pathname+location.hash,sidebar:!!document.querySelector('.sidebar'),labels:[...document.querySelectorAll('.sidebar nav button')].map(b=>b.textContent.trim())})); const filename=`screenshots/${variant}-${id}-${width}.png`;await page.screenshot({path:path.join(evidence,filename),fullPage:true});results.push({variant,width,id,filename,...metrics});}
   await page.goto(origin+'/');await page.getByLabel('Usuário',{exact:true}).waitFor();await capture('login');
   await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.app-shell').waitFor();
   for(const [id,title] of screens){await page.evaluate(id=>{location.hash=id;},id);await page.getByRole('heading',{name:title,exact:true}).first().waitFor();await capture(id);}
   if(width<=900){await page.getByRole('button',{name:'Abrir menu',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(250);const initial=await page.evaluate(()=>({label:document.activeElement?.getAttribute('aria-label'),inside:document.querySelector('.sidebar').contains(document.activeElement),modal:document.querySelector('.sidebar').getAttribute('aria-modal')}));await page.keyboard.press('Tab');const tab=await page.evaluate(()=>({label:document.activeElement?.getAttribute('aria-label'),text:document.activeElement?.textContent,inside:document.querySelector('.sidebar').contains(document.activeElement)}));await capture('menu');results.push({variant,width,id:'menu-focus',initial,tab});if(variant==='after')await page.keyboard.press('Escape');else await page.locator('.sidebar').getByRole('button',{name:'Fechar menu',exact:true}).click();}
   await page.getByRole('button',{name:'Sair',exact:true}).click();await page.getByLabel('Usuário',{exact:true}).waitFor();await page.getByLabel('Usuário',{exact:true}).fill('demo.operador');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.app-shell').waitFor();await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();
   if(width<=900)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
   await page.waitForTimeout(250);await capture('operator-menu');
   await context.close();
  }
  fs.writeFileSync(path.join(evidence,'visual-matrix.json'),JSON.stringify({results,errors,external,passed:results.filter(r=>r.filename).every(r=>!r.overflow)&&!errors.length&&!external.length},null,2));
  console.log(JSON.stringify({captures:results.filter(r=>r.filename).length,overflows:results.filter(r=>r.overflow).length,errors:errors.length,external:external.length}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
