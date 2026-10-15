const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const {firefox}=createRequire(process.env.SILEX_FRONTEND+'/package.json')('playwright');
const {measure}=require('./audit.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[];try{
for(const [variant,port]of [['baseline',18571],['candidate',18572]])for(const width of [1440,768,375,320]){
 const page=await browser.newPage({viewport:{width,height:width===768?1024:900},locale:'pt-BR'});
 await page.goto(`http://127.0.0.1:${port}/app#dashboard`);await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();await page.locator('.welcome-banner').waitFor();await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 const gradients=await page.locator('.welcome-banner').evaluate(banner=>{const b=banner.getBoundingClientRect();return {background:getComputedStyle(banner).backgroundImage,box:{x:b.x,y:b.y,width:b.width,height:b.height},text:[...banner.querySelectorAll('.eyebrow,h2,p')].map(e=>{const range=document.createRange();range.selectNodeContents(e);return {text:e.textContent,foreground:getComputedStyle(e).color,rects:[...range.getClientRects()].map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))};})};});
 rows.push({variant,route:'dashboard',width,state:'default',gradients,...await page.evaluate(measure)});
 if(width!==320)await page.screenshot({path:path.join(process.env.SILEX_EVIDENCE,'screenshots',`${variant}-dashboard-${width}.png`),fullPage:true});await page.close();
}fs.writeFileSync(path.join(process.env.SILEX_EVIDENCE,'dashboard-settled-recheck.json'),JSON.stringify(rows,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
