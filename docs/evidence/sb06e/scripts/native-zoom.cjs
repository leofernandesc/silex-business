// Actual X11 browser shortcuts to a private headed Firefox. No emulated viewport/CSS zoom.
const {execFileSync}=require('child_process'),fs=require('fs'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,out=process.env.SILEX_EVIDENCE,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright'),{inspect}=require('./surfaces.cjs'),{settled}=require('../../sb06d2/scripts/matrix.cjs');
(async()=>{const browser=await firefox.launch({headless:false,env:{...process.env,DISPLAY:':1066',MOZ_ENABLE_WAYLAND:'0'},firefoxUserPrefs:{'browser.zoom.animate':false},executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[],steps=[];
 const save=()=>fs.writeFileSync(out+'/native-zoom-attempt.json',JSON.stringify({browser:browser.version(),headed:true,privateDisplay:':1066',method:'real X11 XTest native browser shortcut; content viewport not emulated; CSS zoom stays1',rows,steps,verifiedNativeZoom:rows.some(r=>r.nativeZoomConfirmed),testedLevels:[...new Set(rows.filter(r=>r.nativeZoomConfirmed).map(r=>r.percent))],screenReaderTested:false},null,2));
 try{const context=await browser.newContext({viewport:null,locale:'pt-BR'}),page=await context.newPage();await page.goto(process.env.SILEX_CANDIDATE+'/');await page.locator('h1').waitFor();
 async function stable(){return page.evaluate(()=>new Promise(resolve=>{let previous='',count=0;function tick(){const current=[innerWidth,innerHeight,devicePixelRatio].join(':');count=current===previous?count+1:0;previous=current;if(count>=12)resolve({innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,scale:visualViewport?.scale,document:document.documentElement.scrollWidth,cssZoom:getComputedStyle(document.body).zoom});else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));}
 function key(name){execFileSync('python3',[__dirname+'/native-keys.py',':1066',name]);}
 key('0');const initial=await stable();steps.push({label:'reset',...initial});
 for(const percent of [200,400]){
  key('0');await stable();let measured=initial;
  for(let i=1;i<=24&&measured.dpr/initial.dpr<percent/100-0.01;i++){key('equal');measured=await stable();steps.push({percent,shortcut:i,...measured});}
  const confirmed=Math.abs(measured.dpr/initial.dpr-percent/100)<0.02&&Math.abs(measured.innerWidth*measured.dpr-initial.innerWidth*initial.dpr)<3&&measured.cssZoom==='1';
  if(!confirmed)throw Error('Native target not verified '+JSON.stringify({percent,measured,initial}));
  await page.goto(process.env.SILEX_CANDIDATE+'/');await page.locator('h1').waitFor();await settled(page);rows.push({route:'public',percent,nativeZoomConfirmed:true,metrics:await stable(),layout:await page.evaluate(inspect,{limit:300})});
  // Fresh context is not needed: login uses a real same-origin cookie in this synthetic account.
  await page.request.post(process.env.SILEX_CANDIDATE+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});
  for(const route of ['home','dashboard','finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard']){
   await page.goto(process.env.SILEX_CANDIDATE+'/app#'+route);await page.locator('main h1').waitFor();await settled(page);const metrics=await stable();rows.push({route,percent,nativeZoomConfirmed:Math.abs(metrics.dpr/initial.dpr-percent/100)<0.02,metrics,layout:await page.evaluate(inspect,{limit:300})});
   if(['home','dashboard','finance'].includes(route))await page.screenshot({path:`${out}/screenshots/native-${percent}-${route}.png`});
   if(route==='home'){const trigger=page.getByRole('button',{name:'Abrir menu',exact:true});if(await trigger.isVisible()){await trigger.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Fechar menu',exact:true}).waitFor();await page.keyboard.press('Escape');if(!await trigger.evaluate(e=>e===document.activeElement))throw Error('Native zoom menu focus lost');rows.at(-1).keyboardMenuEscapeReturn=true;}}
   save();
  }
 }
 key('0');steps.push({label:'final-reset',...await stable()});save();console.log('Verified native zoom levels',200,400,'across',rows.length,'states');
 }finally{save();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
