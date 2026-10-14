const fs=require('fs');const path=require('path');const {firefox}=require('module').createRequire('/home/leofernandesc/controlmax-inspired/frontend/package.json')('playwright');
const evidence=path.resolve(__dirname,'..');
function contrastAudit(){
 const rgb=s=>{const m=s.match(/[\d.]+/g)?.map(Number)||[0,0,0];return[m[0],m[1],m[2],m[3]??1]};
 const blend=(a,b)=>a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3]));
 const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const bg=el=>{const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);return chain.reduce((b,p)=>blend(rgb(getComputedStyle(p).backgroundColor),b),[255,255,255]);};
 const rows=[];
 for(const el of document.querySelectorAll('.silex-public *')){
  if(el.getClientRects().length===0||el.classList.contains('silex-public__sr-only'))continue;
  const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();if(!text)continue;
  const s=getComputedStyle(el),back=bg(el),fg=blend(rgb(s.color),back),a=lum(fg),b=lum(back),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);
  rows.push({text,element:el.tagName,class:el.className,fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,background:back,ratio:+ratio.toFixed(3),minimum:large?3:4.5,pass:ratio+0.005>=(large?3:4.5)});
 }
 return{rows,failures:rows.filter(r=>!r.pass),controls:[...document.querySelectorAll('.silex-public a,.silex-public button')].filter(e=>e.getClientRects().length).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};
}
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});const results=[];try{
 for(const width of [1440,768,375]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:width===768?1024:812},locale:'pt-BR'});const page=await context.newPage();const requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:18023/');await page.locator('h1').waitFor();await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,font:getComputedStyle(document.body.firstElementChild).fontFamily,title:document.title,inter400:document.fonts.check('400 16px "Silex Inter Local"'),inter600:document.fonts.check('600 16px "Silex Inter Local"')}));const audit=await page.evaluate(contrastAudit);
  await page.screenshot({path:path.join(evidence,`screenshots/public-${width}.png`),fullPage:true});
  if(width===375){await page.locator('.silex-public__close').screenshot({path:path.join(evidence,'screenshots/public-cta-375.png')});await page.getByRole('button',{name:'Abrir navegação pública',exact:true}).focus();await page.keyboard.press('Enter');await page.screenshot({path:path.join(evidence,`screenshots/public-menu-${width}.png`),fullPage:true});await page.keyboard.press('Escape');}
  const region=page.getByRole('region',{name:'Tabela ilustrativa de vendas'});const scroll=await region.evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth}));
  results.push({surface:'public',width,...metrics,apiRequests:requests.filter(r=>r.includes('/api/')),external:requests.filter(r=>!r.startsWith('http://127.0.0.1:18023/')),operationalBundleRequested:requests.some(r=>/\/assets\/App-/.test(r)),requests,errors,audit,table:scroll});await context.close();
 }
 for(const variant of ['baseline','candidate'])for(const width of [1440,768,375]){
  const base=`http://127.0.0.1:${variant==='baseline'?18024:18023}`;const context=await browser.newContext({viewport:{width,height:width===1440?900:width===768?1024:812},locale:'pt-BR'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/entrar');await page.getByLabel('Usuário',{exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(evidence,`screenshots/${variant}-login-${width}.png`),fullPage:true});
  await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.app-shell').waitFor();
  for(const [id,title]of [['dashboard','Visão geral'],['customers','Clientes'],['finance','Lançamentos (Despesa/Receita)']]){
   if(variant==='candidate'){await page.evaluate(()=>{history.pushState({},'','/');window.dispatchEvent(new PopStateEvent('popstate'));});await page.locator('.silex-public').waitFor();await page.evaluate(id=>{location.hash=id},id);}
   else await page.evaluate(id=>{location.hash=id},id);
   await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.waitForTimeout(120);await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:path.join(evidence,`screenshots/${variant}-${id}-${width}.png`),fullPage:true});
   const style=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,font:getComputedStyle(document.body).fontFamily,sidebar:getComputedStyle(document.querySelector('.sidebar')).backgroundColor,title:document.title}));results.push({surface:id,variant,width,...style,errors});
  }await context.close();
 }
 fs.writeFileSync(path.join(evidence,'visual-a11y-matrix.json'),JSON.stringify({results,passed:results.every(r=>r.scrollWidth<=r.viewport+1&&!(r.errors?.length)&&!(r.apiRequests?.length)&&!(r.external?.length)&&!r.operationalBundleRequested&&!(r.audit?.failures.length))},null,2));console.log(JSON.stringify({cases:results.length,publicContrastFailures:results.filter(r=>r.audit).reduce((s,r)=>s+r.audit.failures.length,0),overflow:results.filter(r=>r.scrollWidth>r.viewport+1).length}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
