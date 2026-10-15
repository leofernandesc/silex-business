// Real X11 Firefox zoom, private display only. No CSS scale or simulated viewport.
const {createRequire}=require('module'),fs=require('fs'),{execFileSync}=require('child_process'),path=require('path');
const root=path.resolve(__dirname,'../../../..'),out=root+'/docs/evidence/sb07c',req=createRequire(root+'/frontend/package.json'),{firefox,expect}=req('@playwright/test');
(async()=>{
const browser=await firefox.launch({headless:false,executablePath:process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox',env:{...process.env,DISPLAY:':1067',MOZ_ENABLE_WAYLAND:'0'},firefoxUserPrefs:{'browser.zoom.animate':false}}),rows=[],steps=[];
function key(k){execFileSync('python3',[__dirname+'/native_keys.py',':1067',k]);}
const save=()=>fs.writeFileSync(out+'/native-zoom.json',JSON.stringify({browser:browser.version(),method:'X11 XTest actual Firefox Ctrl+plus; viewport:null; CSS zoom1',rows,steps},null,2));
try{
 const context=await browser.newContext({viewport:null,locale:'en-US'}),page=await context.newPage(),origin='http://127.0.0.1:18085';
 expect((await page.request.post(origin+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}})).ok()).toBe(true);
 await page.goto(origin+'/app#service-orders');await page.getByRole('button',{name:'Novo serviço/pedido',exact:true}).waitFor();
 async function stable(){return page.evaluate(()=>new Promise(resolve=>{let previous='',n=0;const tick=()=>{const s=[innerWidth,innerHeight,devicePixelRatio].join(':');n=s===previous?n+1:0;previous=s;if(n>=12)resolve({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,document:document.documentElement.scrollWidth,cssZoom:getComputedStyle(document.body).zoom});else requestAnimationFrame(tick)};requestAnimationFrame(tick)}))}
 key('0');const initial=await stable();steps.push({initial});
 for(const percent of [200,400]){
  key('0');let measured=await stable();
  for(let i=0;i<24&&measured.dpr/initial.dpr<percent/100-.01;i++){key('equal');measured=await stable();steps.push({percent,...measured});}
  expect(Math.abs(measured.dpr/initial.dpr-percent/100)).toBeLessThan(.02);expect(measured.cssZoom).toBe('1');
  await page.getByRole('button',{name:'Novo serviço/pedido',exact:true}).click();
  const field=page.locator('.silex-date-field').filter({has:page.getByText('Data do serviço *',{exact:true})});
  for(const[t,v]of[['day','04'],['month','03'],['year','2026']]){const seg=field.locator(`[data-type="${t}"]`);await seg.focus();for(let i=0;i<5&&!await seg.getAttribute('data-placeholder');i++)await seg.press('Backspace');await seg.pressSequentially(v)}
  await field.locator('[data-type=year]').press('Tab');await expect(field.locator('input[type=date]')).toHaveValue('2026-03-04');
  await expect(field.locator('.silex-date-input')).toHaveText('04/03/2026');
  const trigger=field.getByRole('button');await trigger.focus();await page.keyboard.press('Enter');const popover=page.locator('.silex-date-popover');await expect(popover).toBeVisible();
  const metrics=await stable(),box=await popover.boundingBox();
  fs.writeFileSync(out+'/native-zoom-position-'+percent+'.json',JSON.stringify(await popover.evaluate(n=>({box:n.getBoundingClientRect().toJSON(),style:n.getAttribute('style'),parent:n.parentElement?.getBoundingClientRect().toJSON(),offset:n.offsetParent?.getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight})),null,2));
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(metrics.width+1);
  const row={percent,nativeZoomConfirmed:true,metrics,calendar:box,iso:await field.locator('input[type=date]').inputValue()};rows.push(row);
  await page.screenshot({path:`${out}/screenshots/native-${percent}-service-calendar.png`});
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowDown');
  const focused=await page.locator(':focus').boundingBox();expect(focused.y).toBeGreaterThanOrEqual(box.y);expect(focused.y+focused.height).toBeLessThanOrEqual(box.y+box.height+1);
  await page.screenshot({path:`${out}/screenshots/native-${percent}-calendar-keyboard-scroll.png`});
  await page.keyboard.press('Enter');await expect(field.locator('input[type=date]')).toHaveValue('2026-03-25');row.calendarKeyboardSelection='2026-03-25';
  await expect(trigger).toBeFocused();
  row.pointerHitTest=await trigger.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{rect:r.toJSON(),hit:hit?.tagName,inside:hit===n||n.contains(hit)}});
  await page.keyboard.press('Enter');await expect(popover).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('dialog:modal')).toHaveCount(0);row.focusReturned=true;save();
 }
 key('0');save();console.log('Native Firefox zoom 200/400 confirmed with date editing and modal calendar focus');
}finally{save();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
