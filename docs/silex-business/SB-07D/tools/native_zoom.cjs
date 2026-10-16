const fs=require('fs'),path=require('path'),{createRequire}=require('module'),{execFileSync}=require('child_process'),root=path.resolve(__dirname,'../../../..'),{firefox,expect}=createRequire(root+'/frontend/package.json')('@playwright/test'),out=root+'/docs/evidence/sb07d';
(async()=>{const b=await firefox.launch({headless:false,executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox',env:{...process.env,DISPLAY:':1068',MOZ_ENABLE_WAYLAND:'0'},firefoxUserPrefs:{'browser.zoom.animate':false}}),rows=[],steps=[];
const key=(k,...args)=>execFileSync('python3',[__dirname+'/native_keys.py',':1068',k,...args.map(String)]),save=()=>fs.writeFileSync(out+'/native-zoom.json',JSON.stringify({browser:b.version(),method:'actual X11 XTest Firefox zoom; viewport:null; CSS zoom1',rows,steps},null,2));
try{for(const role of ['admin','operator'])for(const variant of ['baseline','candidate']){
 const c=await b.newContext({viewport:null,locale:'pt-BR'});
 try{const p=await c.newPage(),origin='http://127.0.0.1:'+(variant==='baseline'?'18094':'18095');
 await p.addInitScript(()=>{const original=window.fetch.bind(window);window.fetch=async(...args)=>{const response=await original(...args),a=args[0],path=new URL(typeof a==='string'?a:a instanceof URL?a.href:a.url,location.href).pathname;if(response.ok&&['/api/auth/me','/api/company-settings','/api/dashboard'].includes(path)){const d=await response.clone().json();if(path==='/api/auth/me')d.name='PessoaFicticiaSemEspacos'.repeat(5);if(path==='/api/company-settings')d.company_name='EmpresaFicticiaSemEspacos'.repeat(6);if(path==='/api/dashboard'){d.sales_today_cents=123456789;d.sales_month_cents=987654321;d.cash={...(d.cash||{}),expected_cents:-123456789}}const h=new Headers(response.headers);h.delete('content-length');return new Response(JSON.stringify(d),{status:response.status,headers:h})}return response;};});
 expect((await p.request.post(origin+'/api/auth/login',{data:{username:role==='admin'?'demo.admin':'demo.operador',password:process.env.SILEX_TEST_PASSWORD}})).ok()).toBe(true);
 await p.goto(origin+'/app#home');await p.locator('.silex-home__company[aria-busy=false]').waitFor();
 async function stable(){return p.evaluate(()=>new Promise(resolve=>{let prev='',n=0;function tick(){const s=[innerWidth,innerHeight,devicePixelRatio].join(':');n=s===prev?n+1:0;prev=s;if(n>=12)resolve({width:innerWidth,height:innerHeight,outer:outerWidth,dpr:devicePixelRatio,document:document.documentElement.scrollWidth,cssZoom:getComputedStyle(document.body).zoom});else requestAnimationFrame(tick)}requestAnimationFrame(tick)}))}
 key('0');let initial=await stable();key('resize',1280+initial.outer-initial.width,1000);initial=await stable();expect(initial.width).toBe(1280);steps.push({role,variant,initial});
 for(const percent of [200,400]){
  key('0');let m=await stable();for(let k=0;k<24&&m.dpr/initial.dpr<percent/100-.01;k++){key('equal');m=await stable()}
  expect(Math.abs(m.dpr/initial.dpr-percent/100)).toBeLessThan(.02);expect(m.cssZoom).toBe('1');expect(m.width).toBe(percent===200?640:320);
  for(const route of ['home','dashboard']){
   await p.goto(origin+'/app#'+route);await p.locator(route==='home'?'.silex-home__company[aria-busy=false]':'.overview-summary').waitFor();await p.evaluate(()=>document.fonts.ready);const metrics=await stable();
   const values=await p.locator('.overview-summary strong').allTextContents();rows.push({role,variant,route,percent,nativeZoomConfirmed:true,metrics,values});save();
   if(variant==='candidate')expect(metrics.document).toBeLessThanOrEqual(metrics.width+1);
   await p.screenshot({path:`${out}/screenshots/native-${variant}-${role}-${route}-${percent}.png`,fullPage:true});
   if(variant==='candidate'&&route==='home'){
    const trigger=p.getByRole('button',{name:'Abrir menu',exact:true});await trigger.focus();await p.keyboard.press('Enter');await p.getByRole('button',{name:'Fechar menu',exact:true}).waitFor();await p.keyboard.press('Escape');await expect(trigger).toBeFocused();rows.at(-1).menuKeyboardReturn=true;
   }
  }
 }
 key('0');save();
 }finally{await c.close()}
}console.log('16 native zoom samples, initial 1280 CSS px; 200%=640, 400%=320; roles and menu focus checked');
}finally{save();await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
