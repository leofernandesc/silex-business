// Distinguish native pointer delivery from Playwright protocol coordinates at zoom.
const fs=require('fs'),path=require('path'),{createRequire}=require('module'),{execFileSync}=require('child_process'),R=path.resolve(__dirname,'../../../..'),{firefox,expect}=createRequire(R+'/frontend/package.json')('@playwright/test'),E=R+'/docs/evidence/sb07e';
(async()=>{const b=await firefox.launch({headless:false,executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox',env:{...process.env,DISPLAY:':1071',MOZ_ENABLE_WAYLAND:'0'}}),rows=[];
const key=(...args)=>execFileSync('python3',[__dirname+'/native_keys.py',':1071',...args.map(String)]);
try{const p=await b.newPage({viewport:null,locale:'en-US'});await p.request.post('http://127.0.0.1:18095/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});await p.goto('http://127.0.0.1:18095/app#service-orders');
const stable=()=>p.evaluate(()=>new Promise(r=>{let i=0;const f=()=>++i>=15?r({dpr:devicePixelRatio,width:innerWidth,outer:outerWidth}):requestAnimationFrame(f);f()}));
key('0');let z=await stable();key('resize',1280+z.outer-z.width,1000);await stable();
for(const percent of [200,400]){
 key('0');let z=await stable();while(z.dpr<percent/100-.01){key('equal');z=await stable()}
 await p.goto('http://127.0.0.1:18095/app#service-orders');await p.getByRole('button',{name:'Novo serviço/pedido',exact:true}).click();const t=p.locator('.silex-date-trigger').first();await t.focus();await p.keyboard.press('Enter');await p.locator('.silex-date-popover').waitFor();await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');await expect(p.locator('.silex-date-popover')).toHaveCount(0);
 // Recreate initial problematic reopen without forced clicks.
 await t.scrollIntoViewIfNeeded();let row={percent,geometry:await t.evaluate(e=>{const r=e.getBoundingClientRect();return{rect:r.toJSON(),dpr:devicePixelRatio,width:innerWidth,screenX,screenY,mozInnerScreenX:window.mozInnerScreenX,mozInnerScreenY:window.mozInnerScreenY,elementAtCenter:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,120)}})};
 await p.evaluate(()=>{window.__pointerEvents=[];document.addEventListener('pointerdown',e=>window.__pointerEvents.push({x:e.clientX,y:e.clientY,target:e.target.outerHTML.slice(0,180)}),true)});
 try{await t.click({timeout:2500});row.playwrightClick='opened';}catch(e){row.playwrightClick='timeout';row.error=e.message.split('\n')[0]}
 row.protocolEvents=await p.evaluate(()=>window.__pointerEvents);if(await p.locator('.silex-date-popover').count())await p.keyboard.press('Escape');
 await t.focus();await t.scrollIntoViewIfNeeded();row.nativeGeometry=await t.evaluate(e=>{const r=e.getBoundingClientRect();return{rect:r.toJSON(),dpr:devicePixelRatio,innerX:window.mozInnerScreenX,innerY:window.mozInnerScreenY}});const g=row.nativeGeometry;
 await p.evaluate(()=>window.__pointerEvents=[]);
 key('click',Math.round((g.innerX+g.rect.x+g.rect.width/2)*g.dpr),Math.round((g.innerY+g.rect.y+g.rect.height/2)*g.dpr));
 await p.waitForFunction(()=>window.__pointerEvents.length>0);row.nativeEvents=await p.evaluate(()=>window.__pointerEvents);row.nativeOpened=await p.locator('.silex-date-popover').count()>0;await p.screenshot({path:E+'/screenshots/native-pointer-'+percent+'.png'});rows.push(row);fs.writeFileSync(E+'/pointer-diagnosis.json',JSON.stringify(rows,null,2));
 if(row.nativeOpened)await p.keyboard.press('Escape');await p.keyboard.press('Escape');
}key('0');console.log('Pointer diagnosis recorded');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
