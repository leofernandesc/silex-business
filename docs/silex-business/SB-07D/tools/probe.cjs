const fs=require('fs'),path=require('path'),{createRequire}=require('module'),root=path.resolve(__dirname,'../../../..'),req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright');
const out=root+'/docs/evidence/sb07d',origin=process.env.SILEX_ORIGIN||'http://127.0.0.1:18094',variant=process.env.SILEX_VARIANT||'baseline';
function inspect(){
 const main=document.querySelector('main'),header=document.querySelector('.topbar');
 const rows=[...main.querySelectorAll('*')].filter(n=>n instanceof HTMLElement&&n.getClientRects().length).flatMap(n=>{
  const b=n.getBoundingClientRect(),s=getComputedStyle(n),range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect();
  let scroll=null,clip=null;for(let p=n.parentElement;p&&p!==main;p=p.parentElement){const c=getComputedStyle(p);if(['auto','scroll'].includes(c.overflowX)&&p.scrollWidth>p.clientWidth+1)scroll=p.className;if(['hidden','clip'].includes(c.overflowX)&&text.right>p.getBoundingClientRect().right+1)clip=p.className;}
  const own=[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim());
  if(b.right<=innerWidth+1&&(!own||text.right<=innerWidth+1)&&!clip)return[];
  return[{tag:n.tagName,selector:n.className||n.tagName,text:n.innerText?.slice(0,180),width:b.width,right:b.right,textWidth:own?text.width:null,textRight:own?text.right:null,scroll,clip,minWidth:s.minWidth,display:s.display,whiteSpace:s.whiteSpace,font:s.fontSize}];
 });
 return{viewport:innerWidth,document:document.documentElement.scrollWidth,excess:document.documentElement.scrollWidth-innerWidth,header:{right:header.getBoundingClientRect().right,scroll:header.scrollWidth},rows};
}
(async()=>{const b=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[];
try{for(const scenario of process.env.SILEX_PROBE_SCENARIOS?.split(',')||['normal','historical-name','extreme']){
 const p=await b.newPage({viewport:{width:375,height:900},locale:'pt-BR'});
 await p.addInitScript((scenario)=>{const original=window.fetch.bind(window);window.fetch=async(...args)=>{const response=await original(...args),input=args[0],path=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href).pathname;if(response.ok&&['/api/auth/me','/api/company-settings'].includes(path)){const d=await response.clone().json();if(path==='/api/auth/me'&&scenario!=='normal')d.name='Pessoa Ilustrativa com NomeExtensoSemEspaçosParaRobustez — Dados Fictícios';if(path==='/api/company-settings'&&scenario==='extreme')d.company_name='EmpresaFicticiaSemEspacos'.repeat(6);const headers=new Headers(response.headers);headers.delete('content-length');return new Response(JSON.stringify(d),{status:response.status,headers});}return response;};},scenario);
 await p.request.post(origin+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});
 for(const route of ['home','dashboard'])for(const width of [1440,1024,768,375,320,256,187]){
  await p.setViewportSize({width,height:900});await p.goto(origin+'/app#'+route);await p.reload();await p.locator('main h1').waitFor();await p.locator(route==='home'?'.silex-home__company[aria-busy=false]':'.overview-summary').waitFor();await p.evaluate(()=>document.fonts.ready);
  for(const state of process.env.SILEX_PROBE_STATES?.split(',')||['normal','text200']){
   if(state==='text200')await p.locator('main').evaluate(m=>{const es=[m,...m.querySelectorAll('*')].filter(n=>n instanceof HTMLElement),sizes=es.map(n=>parseFloat(getComputedStyle(n).fontSize));es.forEach((n,i)=>n.style.fontSize=sizes[i]*2+'px')});
   const measure=await p.evaluate(inspect);rows.push({variant,scenario,route,width,state,...measure});
   if(scenario==='historical-name'&&state==='normal')await p.screenshot({path:`${out}/screenshots/${variant}-${route}-${width}.png`});
  }
 }
 await p.close();}
fs.writeFileSync(out+'/'+variant+(process.env.SILEX_PROBE_SUFFIX||'')+'-probe.json',JSON.stringify(rows,null,2));console.log('Measurements',rows.length,'overflow cases',rows.filter(r=>r.excess>1).length);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
