// Measures actual rendered styles; no authenticated data from persistent databases.
const fs = require('fs'), path = require('path'), {createRequire} = require('module');
const req = createRequire(process.env.SILEX_FRONTEND + '/package.json');
const {firefox} = req('playwright');
const screens = ['home','dashboard','customers','products','suppliers','day-workers','subcontracted-freight','stock','pos','sales','service-orders','cash','finance','finance-dashboard','finance-reconcile','finance-payable','finance-receivable','finance-accounts','finance-categories','finance-subcategories','finance-reports','users','audit','company-settings'];
const openers = {customers:'Novo cliente',products:'Novo item',suppliers:'Novo fornecedor','day-workers':'Novo diarista','subcontracted-freight':'Novo prestador de frete',stock:'Novo lançamento','service-orders':'Novo serviço/pedido',finance:'Nova despesa','finance-payable':'Nova despesa','finance-receivable':'Nova receita','finance-accounts':'Nova conta','finance-categories':'Nova categoria','finance-subcategories':'Nova subcategoria',users:'Novo usuário','finance-reports':'Nova meta'};
function measure() {
  const rgb=s=>{const a=s.match(/[\d.]+/g)?.map(Number)||[0,0,0];const scale=s.startsWith('color(srgb ')?255:1;return [...a.slice(0,3).map(v=>v*scale),a[3]??1];};
  const blend=(a,b)=>a.slice(0,3).map((c,i)=>c*a[3]+b[i]*(1-a[3]));
  const lum=c=>{const a=c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const bg=e=>{const chain=[];for(;e;e=e.parentElement)chain.unshift(e);let c=[255,255,255],uncertain=false;for(const n of chain){const s=getComputedStyle(n);c=blend(rgb(s.backgroundColor),c);uncertain ||= s.backgroundImage!=='none'||Number(s.opacity)<1;}return {c,uncertain};};
  const desc=e=>e.tagName.toLowerCase()+(typeof e.className==='string'?'.'+e.className.trim().replace(/\s+/g,'.'):'');
  const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]')&&(!document.querySelector('dialog[open]')||e.closest('dialog[open]'));};
  const named=e=>(e.getAttribute('aria-label')||e.title||e.textContent||e.labels?.[0]?.textContent||'').trim().slice(0,100);
  const texts=[],controls=[];
  for(const e of document.querySelectorAll('body *')){
    if(!visible(e)||['SCRIPT','STYLE','SVG','PATH','OPTION','TITLE'].includes(e.tagName.toUpperCase()))continue;
    const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
    const s=getComputedStyle(e),b=bg(e),disabled=!!e.closest(':disabled,[aria-disabled=true]');
    if(text){const size=parseFloat(s.fontSize),threshold=size>=24||(size>=18.6667&&parseInt(s.fontWeight)>=700)?3:4.5;const value=ratio(blend(rgb(s.color),b.c),b.c);texts.push({selector:desc(e),text:text.slice(0,120),foreground:s.color,background:b.c,ratio:value,threshold,size,disabled,uncertain:b.uncertain,fail:!disabled&&!b.uncertain&&value<threshold});}
    if(e.matches('button,input:not([type=hidden]),select,textarea,a[href],summary')){
      const r=e.getBoundingClientRect(),p=bg(e.parentElement),placeholder=e.matches('input[placeholder],textarea[placeholder]')?getComputedStyle(e,'::placeholder'):null;
      const svg=e.querySelector('svg'),icon=svg&&getComputedStyle(svg);
      const wrapper=e.closest('.search,.input-with-icon');
      const ws=wrapper&&getComputedStyle(wrapper);
      controls.push({selector:desc(e),name:named(e),type:e.type,rect:{x:r.x,y:r.y,width:r.width,height:r.height},disabled,uncertain:b.uncertain,color:s.color,background:b.c,borderColor:s.borderColor,borderRatio:ratio(blend(rgb(s.borderTopColor),p.c),p.c),borderWidth:s.borderTopWidth,placeholder:placeholder?{color:placeholder.color,opacity:placeholder.opacity,ratio:ratio(blend([...rgb(placeholder.color).slice(0,3),Number(placeholder.opacity)*rgb(placeholder.color)[3]],b.c),b.c)}:null,iconRatio:icon?ratio(blend(rgb(icon.color),b.c),b.c):null,focusVisible:e.matches(':focus-visible'),outline:s.outlineStyle,outlineWidth:s.outlineWidth,outlineRatio:ratio(blend(rgb(s.outlineColor),p.c),p.c),wrapper:ws?{selector:desc(wrapper),borderRatio:ratio(blend(rgb(ws.borderTopColor),bg(wrapper.parentElement).c),bg(wrapper.parentElement).c),outline:ws.outlineStyle,outlineWidth:ws.outlineWidth}:null});
    }
  }
  for(const c of controls){const a=c.rect;c.below24=!c.disabled&&(a.width<24||a.height<24);c.below44=!c.disabled&&(a.width<44||a.height<44);const cx=a.x+a.width/2,cy=a.y+a.height/2;c.spacingCollisions=c.below24?controls.filter(d=>d!==c&&!d.disabled).filter(d=>{const b=d.rect;const dx=Math.max(b.x-cx,0,cx-b.x-b.width),dy=Math.max(b.y-cy,0,cy-b.y-b.height);return Math.hypot(dx,dy)<12;}).map(d=>d.name):[];}
  return {viewport:innerWidth,document:document.documentElement.scrollWidth,texts,controls,tableColumns:[...document.querySelectorAll('thead')].map(t=>t.textContent),active:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.slice(0,80)};
}
async function ready(page){await page.waitForFunction(()=>document.querySelector('.app-shell main h1,.login-card h2,.silex-public h1'));await page.waitForFunction(()=>![...document.querySelectorAll('.empty')].some(e=>/Carregando/.test(e.textContent||'')));await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);}
module.exports={measure};
if(require.main===module)(async()=>{
 const browser=await firefox.launch({executablePath:process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});
 const out=process.env.SILEX_EVIDENCE,variant=process.env.SILEX_VARIANT,origin=process.env.SILEX_ORIGIN;fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});const results=[],errors=[];
 try {for(const width of [1440,768,375,320]){
  const page=await browser.newPage({viewport:{width,height:width===768?1024:900},locale:'pt-BR'});page.on('pageerror',e=>errors.push({width,error:e.message}));
  for(const route of ['public','login',...screens]){
   await page.goto(origin+(route==='public'?'/':route==='login'?'/entrar':'/app#'+route));
   // A hash navigation may inherit an already idle document while React starts
   // its requests. Reload the same destination for comparable settled captures.
   if(route!=='home')await page.reload();
   if(route==='home'){await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();}
   await ready(page);await page.mouse.move(0,0);const base=await page.evaluate(measure);results.push({route,width,state:'default',...base});
   if(width!==320)await page.screenshot({path:path.join(out,'screenshots',`${variant}-${route}-${width}.png`),fullPage:true});
   // One representative per concrete class/type: actual hover and keyboard focus styles.
   if(width!==320&&!process.env.SILEX_SETTLED_ONLY){const controls=page.locator('main button,main input,main select,.login-card button,.login-card input,.silex-public button,.silex-public a');const seen=new Set();for(let i=0;i<await controls.count();i++){
    const e=controls.nth(i);if(!await e.isVisible()||!await e.isEnabled())continue;const box=await e.boundingBox();if(!box||box.x+box.width<0||box.x>width||box.y+box.height<0)continue;const sig=await e.evaluate(n=>n.tagName+'.'+n.className+'.'+n.type);if(seen.has(sig))continue;seen.add(sig);
    await e.hover();results.push({route,width,state:'hover',target:sig,...await page.evaluate(measure)});await page.mouse.move(0,0);await page.keyboard.press('Tab');await e.focus();results.push({route,width,state:'focus',target:sig,...await page.evaluate(measure)});
   }}
   if(openers[route]&&width!==320){const opener=page.getByRole('button',{name:openers[route],exact:true});await opener.click();await page.locator('dialog[open]').waitFor();await ready(page);results.push({route,width,state:'dialog',...await page.evaluate(measure)});if(['customers','finance-payable','products','users'].includes(route))await page.screenshot({path:path.join(out,'screenshots',`${variant}-${route}-dialog-${width}.png`)});await page.keyboard.press('Escape');}
   console.log(variant,width,route,'text',base.texts.filter(t=>t.fail).length,'targets',base.controls.filter(c=>c.below24&&c.spacingCollisions.length).length);
   fs.writeFileSync(path.join(out,variant+'-audit.json'),JSON.stringify({variant,results,errors},null,2));
  }await page.close();}
 }finally{await browser.close();}
 console.log('DONE',results.length,'states',errors.length,'page errors');
})().catch(e=>{console.error(e);process.exitCode=1;});
