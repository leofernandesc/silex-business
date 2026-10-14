const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { firefox } = require('node:module').createRequire('/home/leofernandesc/controlmax-inspired/frontend/package.json')('playwright');
const evidence = path.resolve(__dirname, '..');
(async()=>{
 const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox',headless:true});
 const results=[];
 try{
 for(const port of [18023,5173]) for(const width of [1440,768,375]){
  const context=await browser.newContext({viewport:{width,height:900},baseURL:`http://127.0.0.1:${port}`});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/entrar','/app']){const response=await context.request.get(route);assert.equal(response.status(),200);assert.match(await response.text(),/<div id="root"><\/div>/);}
  await page.goto('/app#customers');await page.getByLabel('Usuário',{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/entrar');
  await page.getByLabel('Usuário',{exact:true}).fill('demo.operador');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Clientes',exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'#customers');
  await page.reload();await page.getByRole('heading',{name:'Clientes',exact:true}).waitFor();
  await page.evaluate(()=>{location.hash='finance';});await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();await page.getByRole('alert').waitFor();assert.equal(new URL(page.url()).hash,'#dashboard');
  const measure=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,brand:document.title,financialGroup:[...document.querySelectorAll('.sidebar button')].some(b=>b.textContent==='FINANCEIRO')}));assert.equal(measure.overflow,false);assert.equal(measure.financialGroup,false);assert.equal(errors.length,0);
  await page.getByRole('button',{name:'Sair',exact:true}).click();await page.getByLabel('Usuário',{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/entrar');
  results.push({server:port===5173?'Vite-dev':'FastAPI-built',width,fallback200:true,protectedReturn:true,refresh:true,operatorDenied:true,logout:true,...measure,errors});await context.close();
 }
 fs.writeFileSync(path.join(evidence,'runtime-checks.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,cases:results.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
