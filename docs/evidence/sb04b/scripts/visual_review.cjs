const fs=require('fs'),path=require('path');const {firefox}=require('module').createRequire('/home/leofernandesc/controlmax-inspired/frontend/package.json')('playwright');
const e=path.resolve(__dirname,'..');
function contrastAudit(){
 const rgb=s=>{const m=s.match(/[\d.]+/g)?.map(Number)||[0,0,0];return[m[0],m[1],m[2],m[3]??1]}, blend=(a,b)=>a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3]));
 const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const bg=el=>{const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);return chain.reduce((b,p)=>blend(rgb(getComputedStyle(p).backgroundColor),b),[255,255,255]);};
 const rows=[];for(const el of document.querySelectorAll('.silex-home *')){if(!el.getClientRects().length)continue;
 const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();if(!text)continue;
 const s=getComputedStyle(el),back=bg(el),fg=blend(rgb(s.color),back),a=lum(fg),b=lum(back),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);
 rows.push({text,ratio:+ratio.toFixed(3),minimum:large?3:4.5,pass:ratio+0.005>=(large?3:4.5)});}
 return {rows,failures:rows.filter(r=>!r.pass)};
}
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});const rows=[];try{
 for(const variant of ['baseline','candidate'])for(const width of [1440,768,375]){
 const origin=`http://127.0.0.1:${variant==='baseline'?18028:18027}`,context=await browser.newContext({viewport:{width,height:width===1440?900:width===768?1024:812},locale:'pt-BR'}),page=await context.newPage();const errors=[],requests=[],pending=new Set();let finished=Date.now();
 page.on('pageerror',x=>errors.push(x.message));page.on('request',r=>{requests.push(r.url());if(r.url().includes('/api/'))pending.add(r)});const done=r=>{pending.delete(r);finished=Date.now()};page.on('requestfinished',done);page.on('requestfailed',done);
 async function settle(){await page.waitForTimeout(150);const end=Date.now()+15000;while(pending.size||Date.now()-finished<250){if(Date.now()>end)throw Error('API readiness timeout');await page.waitForTimeout(80)}await page.evaluate(()=>document.fonts.ready);}
 async function capture(id,role='admin'){await settle();const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,font:getComputedStyle(document.querySelector('.silex-home')||document.body).fontFamily,inter400:document.fonts.check('400 16px "Silex Inter Local"'),inter600:document.fonts.check('600 16px "Silex Inter Local"')}));const filename=`screenshots/${variant}-${role}-${id}-${width}.png`;await page.screenshot({path:path.join(e,filename),fullPage:true});rows.push({variant,width,id,role,filename,...metrics,errors:[...errors]});return rows[rows.length-1];}
 await page.goto(origin+'/');await page.locator('.silex-public h1').waitFor();const before=requests.length;await capture('public');rows[rows.length-1].apiRequests=requests.filter(x=>x.includes('/api/'));
 await page.goto(origin+'/entrar');await page.getByLabel('Usuário',{exact:true}).waitFor();await capture('login');
 await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.app-shell').waitFor();
 if(variant==='candidate'){
 await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();const row=await capture('home');row.audit=await page.evaluate(contrastAudit);row.apiRequests=requests.filter(x=>x.includes('/api/'));row.shortcuts=await page.locator('[data-home-route]').evaluateAll(es=>es.map(x=>x.getAttribute('data-home-route')));
 await page.evaluate(()=>{const s=document.createElement('style');s.id='sb04b-text-probe';s.textContent='.silex-home h1{font-size:52px}.silex-home h2{font-size:40px}.silex-home h3{font-size:32px}.silex-home p,.silex-home a,.silex-home dt,.silex-home dd{font-size:28px}';document.head.append(s)});await capture('home-text-200');await page.evaluate(()=>document.getElementById('sb04b-text-probe').remove());
 if(width<=900){await page.getByRole('button',{name:'Abrir menu',exact:true}).focus();await page.keyboard.press('Enter');await capture('home-menu');await page.keyboard.press('Escape');}
 }
 for(const [id,title] of [['dashboard','Visão geral'],['customers','Clientes'],['sales','Vendas'],['stock','Movimentações de estoque'],['finance','Lançamentos (Despesa/Receita)']]){await page.evaluate(id=>{location.hash=id},id);await page.getByRole('heading',{name:title,exact:true}).first().waitFor();await capture(id);}
 if(variant==='candidate'){
 await page.getByRole('button',{name:'Sair',exact:true}).click();await page.getByLabel('Usuário',{exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Sair"]'));
 await page.waitForTimeout(200);await page.getByLabel('Usuário',{exact:true}).fill('demo.operador');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();const row=await capture('home','operator');row.audit=await page.evaluate(contrastAudit);row.shortcuts=await page.locator('[data-home-route]').evaluateAll(es=>es.map(x=>x.getAttribute('data-home-route')));
 // Text enlargement probe uses all home descendants, then screenshot for review.
 await page.evaluate(()=>{const s=document.createElement('style');s.id='sb04b-text-probe';s.textContent='.silex-home h1{font-size:52px}.silex-home h2{font-size:40px}.silex-home h3{font-size:32px}.silex-home p,.silex-home a,.silex-home dt,.silex-home dd{font-size:28px}';document.head.append(s)});await capture('home-text-200','operator');
 }
 await context.close();
 }
 fs.writeFileSync(path.join(e,'visual-matrix.json'),JSON.stringify({rows,passed:rows.every(r=>r.scrollWidth<=r.viewport+1&&!r.errors.length&&!r.audit?.failures.length&&!(r.id==='public'&&r.apiRequests.length))},null,2));console.log(JSON.stringify({captures:rows.length,overflow:rows.filter(r=>r.scrollWidth>r.viewport+1).length,contrastFailures:rows.reduce((n,r)=>n+(r.audit?.failures.length||0),0)}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
