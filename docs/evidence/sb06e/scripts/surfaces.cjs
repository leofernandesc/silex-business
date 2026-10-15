// Read-only runtime inventory and targeted reflow diagnosis; all accounts/values synthetic.
const fs=require('fs'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT, out=process.env.SILEX_EVIDENCE, req=createRequire(root+'/frontend/package.json');
const {firefox}=req('playwright'),{settled}=require('../../sb06d2/scripts/matrix.cjs');
const routes=['home','dashboard','customers','products','suppliers','day-workers','subcontracted-freight','stock','pos','sales','service-orders','cash','finance','finance-dashboard','finance-reconcile','finance-payable','finance-receivable','finance-accounts','finance-categories','finance-subcategories','finance-reports','users','audit','company-settings'];
const shots=new Set(['home','dashboard','customers','products','pos','sales','stock','finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard','company-settings']);
function inspect({limit=65}={}){
 const rect=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x*100)/100,right:Math.round(r.right*100)/100,width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100}};
 const selector=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'?e.className.trim().split(/\s+/).filter(Boolean).map(v=>'.'+v).join(''):'');
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]');
 const safeText=e=>(e.textContent||'').trim().slice(0,130);
 const overflow=[...document.querySelectorAll('.topbar,main,main *')].filter(visible).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>{
  let a=e.parentElement,scrollAncestor=null;while(a&&a!==document.body){if(/auto|scroll/.test(getComputedStyle(a).overflowX)&&a.scrollWidth>a.clientWidth){scrollAncestor=selector(a);break;}a=a.parentElement;}
  const s=getComputedStyle(e),p=e.parentElement;
  return {selector:selector(e),path:[e.parentElement?.parentElement,e.parentElement,e].filter(Boolean).map(selector).join(' > '),text:safeText(e),rect:rect(e),available:p?.clientWidth,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollAncestor,style:{display:s.display,minWidth:s.minWidth,whiteSpace:s.whiteSpace,overflowWrap:s.overflowWrap,grid:s.gridTemplateColumns,fontSize:s.fontSize,overflowX:s.overflowX},functional:e.matches('button,input,select,a,textarea')};
 }).slice(0,limit);
 return {viewport:innerWidth,document:document.documentElement.scrollWidth,excess:document.documentElement.scrollWidth-innerWidth,header:document.querySelector('.topbar')?rect(document.querySelector('.topbar')):null,h1:document.querySelector('h1')?.textContent,loading:[...document.querySelectorAll('main .empty,main [role=status]')].some(e=>visible(e)&&/Carregando/.test(e.textContent||'')),formCount:document.querySelectorAll('main form').length,fields:[...document.querySelectorAll('main input,main select,main textarea')].filter(visible).map(e=>({type:e.type,label:e.labels?.[0]?.textContent?.trim().slice(0,100),value:e.type==='password'?'[redacted]':e.value,disabled:e.disabled})),actions:[...document.querySelectorAll('main button,main a')].filter(visible).map(e=>({name:e.getAttribute('aria-label')||safeText(e),disabled:e.disabled||false,href:e.getAttribute('href')})),tables:[...document.querySelectorAll('main table')].map(e=>({headers:[...e.querySelectorAll('th')].map(safeText),rows:e.querySelectorAll('tbody tr').length})),font:getComputedStyle(document.querySelector('h1')||document.body).fontFamily,overflow};
}
module.exports={inspect};
if(require.main===module&&process.argv.includes('--classify-existing')){
 const file=out+'/surfaces.json',data=JSON.parse(fs.readFileSync(file));
 fs.copyFileSync(file,out+'/surfaces-initial-unclassified.json');
 for(const r of data.responses)r.expected=r.route==='login'&&r.path==='/api/auth/me'&&r.status===401;
 if(data.errors.length||data.responses.some(r=>!r.expected))throw Error('Unexpected runtime error');
 data.collectorNote='Expected anonymous login auth/me 401 classified explicitly; original measurements retained, no product assertion changed';
 fs.writeFileSync(file,JSON.stringify(data,null,2));console.log('All 156 measured states valid; five expected anonymous login probes classified');
}else if(require.main===module)(async()=>{const browser=await firefox.launch({executablePath:process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});const rows=[],errors=[],responses=[];
 const save=()=>fs.writeFileSync(out+'/surfaces.json',JSON.stringify({browser:browser.version(),fixture:'synthetic only',rows,errors,responses},null,2));
 try{for(const width of [1440,1024,768,375,320]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR',timezoneId:'America/Manaus'});let current='';page.on('pageerror',e=>errors.push({width,route:current,error:e.message}));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)responses.push({width,route:current,path:new URL(r.url()).pathname,status:r.status(),expected:current==='login'&&new URL(r.url()).pathname==='/api/auth/me'&&r.status()===401});});
  for(const route of ['public','login']){current=route;await page.goto(process.env.SILEX_CANDIDATE+(route==='public'?'/':'/entrar'));await page.locator(route==='public'?'.silex-public h1':'.login-card h2').waitFor();await settled(page);rows.push({route,width,state:'normal',...await page.evaluate(inspect)});if([1440,768,375].includes(width))await page.screenshot({path:`${out}/screenshots/${route}-${width}.png`,fullPage:route==='public'});}
  const auth=await page.request.post(process.env.SILEX_CANDIDATE+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});if(auth.status()!==200)throw Error('synthetic login failed');
  for(const route of routes){current=route;await page.goto(process.env.SILEX_CANDIDATE+'/app#'+route);await page.locator('.app-shell main h1').waitFor();await settled(page);const measured=await page.evaluate(inspect);rows.push({route,width,state:'normal',...measured});if(measured.loading)throw Error('Premature readiness '+route);
   if([1440,768,375].includes(width)&&shots.has(route))await page.screenshot({path:`${out}/screenshots/${route}-${width}.png`});save();
  }
  await page.close();console.log('inventoried',width,rows.length);
 }
 for(const width of [1440,768,375,320]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});await page.request.post(process.env.SILEX_CANDIDATE+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});
  for(const route of ['home','dashboard','finance','finance-payable','finance-receivable']){await page.goto(process.env.SILEX_CANDIDATE+'/app#'+route);await page.locator('.app-shell main h1').waitFor();await settled(page);
   // Explicit computed-text simulation; NOT native browser zoom.
   await page.locator('main').evaluate(main=>{const es=[main,...main.querySelectorAll('*')].filter(e=>e instanceof HTMLElement),sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]*2+'px');});
   rows.push({route,width,state:'computed-text200-NOT-native-zoom',...await page.evaluate(inspect)});if([768,375,320].includes(width)&&['home','dashboard','finance'].includes(route))await page.screenshot({path:`${out}/screenshots/${route}-text200-${width}.png`});save();
  }await page.close();
 }
 for(const width of [256,187]){const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});await page.request.post(process.env.SILEX_CANDIDATE+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});for(const route of ['home','dashboard','finance']){await page.goto(process.env.SILEX_CANDIDATE+'/app#'+route);await page.locator('.app-shell main h1').waitFor();await settled(page);rows.push({route,width,state:'extra-narrow-NOT-native-zoom',...await page.evaluate(inspect)});}await page.close();}
 save();if(errors.length||responses.some(r=>!r.expected))throw Error(JSON.stringify({errors,responses}));console.log('DONE',rows.length,'surfaces/states');
 }finally{save();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
