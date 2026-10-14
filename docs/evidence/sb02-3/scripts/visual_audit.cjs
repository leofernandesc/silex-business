const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const requireFrontend = createRequire('/home/leofernandesc/controlmax-inspired/frontend/package.json');
const { firefox } = requireFrontend('playwright');
const evidence = path.resolve(__dirname, '..');
const phase = process.argv[2] || 'initial';
const variants = phase === 'initial' ? ['baseline', 'candidate'] : ['candidate'];
const screens = [
  ['dashboard', 'Visão geral'], ['customers', 'Clientes'], ['products', 'Produtos ou Serviços'],
  ['suppliers', 'Fornecedores'], ['day-workers', 'Diaristas'], ['subcontracted-freight', 'Frete Subcontratado'],
  ['stock', 'Movimentações de estoque'], ['pos', 'Frente de Caixa'], ['sales', 'Vendas'],
  ['service-orders', 'Serviços e pedidos'], ['cash', 'Controle de caixa'],
  ['finance', 'Lançamentos (Despesa/Receita)'], ['finance-dashboard', 'Dashboard financeiro'],
  ['finance-reconcile', 'Conciliação Bancária'], ['finance-payable', 'Contas a Pagar'],
  ['finance-receivable', 'Contas a Receber'], ['finance-accounts', 'Cadastro de Contas'],
  ['finance-categories', 'Categorias'], ['finance-subcategories', 'SubCategorias'],
  ['finance-reports', 'Relatórios Financeiros'], ['users', 'Usuários'],
  ['audit', 'Histórico de operações'], ['company-settings', 'Empresa e identidade']
];
const openers = {
  customers: 'Novo cliente', products: 'Novo item', suppliers: 'Novo fornecedor',
  'day-workers': 'Novo diarista', 'subcontracted-freight': 'Novo prestador de frete',
  stock: 'Novo lançamento', 'service-orders': 'Novo serviço/pedido',
  finance: 'Nova despesa', 'finance-payable': 'Nova despesa', 'finance-receivable': 'Nova receita',
  'finance-accounts': 'Nova conta', 'finance-categories': 'Nova categoria',
  'finance-subcategories': 'Nova subcategoria', users: 'Novo usuário'
};
const widths = [1440, 768, 375];
function browserMetrics() {
  function visible(el) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && s.visibility !== 'hidden' && s.display !== 'none';
  }
  function rgb(s) {
    const a = s.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
    return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1];
  }
  function blend(a, b) { return a.slice(0, 3).map((c, i) => c * a[3] + b[i] * (1 - a[3])); }
  function bg(el) {
    const chain = []; for (let e = el; e; e = e.parentElement) chain.unshift(e);
    let color = [255, 255, 255], gradient = false;
    for (const e of chain) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') gradient = true;
      color = blend(rgb(s.backgroundColor), color);
    }
    return {color, gradient};
  }
  function lum(c) { const a = c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
  function ratio(a, b) { const x = lum(a), y = lum(b); return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(3); }
  function descriptor(e) { return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().replace(/\s+/g, '.') : ''); }
  function name(e) {
    const ids = e.getAttribute('aria-labelledby');
    return (e.getAttribute('aria-label') || (ids && ids.split(' ').map(id => document.getElementById(id)?.textContent || '').join(' ')) ||
      (e.labels && [...e.labels].map(l => l.textContent).join(' ')) || (e.tagName === 'BUTTON' || e.tagName === 'A' ? e.textContent : '') || e.title || '').trim();
  }
  const text = [], controls = [], tables = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'OPTION'].includes(e.tagName)) continue;
    const direct = [...e.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ').trim();
    if (direct && !e.closest('button:disabled, fieldset:disabled')) {
      const s = getComputedStyle(e), background = bg(e);
      const fg = blend(rgb(s.color), background.color);
      const fontSize = parseFloat(s.fontSize), weight = parseInt(s.fontWeight);
      const threshold = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700) ? 3 : 4.5;
      const value = ratio(fg, background.color);
      text.push({element: descriptor(e), text: direct.slice(0, 110), color: s.color, background: background.color, ratio: value, threshold, fails: value < threshold, gradient: background.gradient, fontSize, weight});
    }
  }
  for (const e of document.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href]')) {
    if (!visible(e)) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e), background = bg(e);
    controls.push({element: descriptor(e), name: name(e), color: s.color, background: s.backgroundColor, border: s.borderColor,
      font: s.fontFamily, radius: s.borderRadius, width: +r.width.toFixed(2), height: +r.height.toFixed(2), left:+r.left.toFixed(2), right:+r.right.toFixed(2), disabled: e.disabled || !!e.closest('fieldset:disabled'), unlabeled: !name(e),
      role: e.getAttribute('role') || e.tagName.toLowerCase(), type: e.type, textRatio: ratio(blend(rgb(s.color), background.color), background.color)});
  }
  for (const e of document.querySelectorAll('.table-wrap')) {
    if (!visible(e)) continue;
    tables.push({width: e.clientWidth, scrollWidth: e.scrollWidth, overflow: e.scrollWidth > e.clientWidth + 1, tabindex: e.tabIndex, ariaLabel: e.getAttribute('aria-label'), font: getComputedStyle(e.querySelector('table')).fontFamily});
  }
  const active = document.activeElement;
  const focused = active && visible(active) ? (() => { const s = getComputedStyle(active), parent = bg(active.parentElement); return {element: descriptor(active), name: name(active), color: s.outlineColor, style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, matchesFocusVisible: active.matches(':focus-visible'), outlineRatio: ratio(rgb(s.outlineColor).slice(0,3), parent.color), background: parent.color}; })() : null;
  return {
    viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    documentHeight: document.documentElement.scrollHeight, bodyFont: getComputedStyle(document.body).fontFamily,
    font400: document.fonts.check('400 14px "Silex Inter Local"'), font600: document.fonts.check('600 14px "Silex Inter Local"'),
    title: document.title, heading: document.querySelector('main h1')?.textContent || document.querySelector('.login-card h2')?.textContent,
    text, controls, tables, focused,
    notices: [...document.querySelectorAll('.notice')].map(e => ({text: e.textContent, class: e.className, role: e.getAttribute('role')})),
    dialogs: [...document.querySelectorAll('dialog[open]')].map(e => {const r=e.getBoundingClientRect(); return {title: e.querySelector('h2')?.textContent, left:r.left,right:r.right,width:r.width,height:r.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,labels:e.getAttribute('aria-labelledby')};})
  };
}
async function ready(page) {
  await page.waitForTimeout(120);
  const started=Date.now();
  while(page._pendingAPI?.size || Date.now()-(page._lastAPIChange||0)<250){
    if(Date.now()-started>20000)throw new Error('API failed to settle');
    await page.waitForTimeout(50);
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(()=>![...document.querySelectorAll('main .empty')].some(e=>/Carregando/.test(e.textContent||'')));
}
async function audit(page, route, width, variant, dir) {
  await page.mouse.move(width-3,3);
  const before = await page.evaluate(browserMetrics);
  const screenshot = path.join(dir, `${route}-${width}.png`);
  await page.screenshot({path: screenshot, fullPage: true});
  const main = route === 'login' ? '.login-card' : 'main';
  const target = page.locator(`${main} button.primary`).first();
  let focus = null, hover = null;
  if (await target.isVisible()) {
    await page.keyboard.press('Tab');
    await target.focus();
    focus = (await page.evaluate(browserMetrics)).focused;
    await target.hover();
    hover = await target.evaluate(e => {const s=getComputedStyle(e); return {name:e.textContent,color:s.color,background:s.backgroundColor,border:s.borderColor};});
    if (['customers','company-settings','login','finance'].includes(route)) await page.screenshot({path:path.join(dir, `${route}-focus-${width}.png`),fullPage:true});
  }
  const tableChecks=[];
  for (let n=0;n<before.tables.length;n++) {
    const wrap=page.locator('.table-wrap').nth(n);
    if (!before.tables[n].overflow) continue;
    await wrap.evaluate(e => {e.scrollLeft=0;}); await wrap.focus();
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(180);
    tableChecks.push({table:n,scrollLeftAfterArrow:await wrap.evaluate(e=>e.scrollLeft),tabindex:before.tables[n].tabindex});
  }
  const fieldFocus=[];
  if(phase==='final'){
    const fields=page.locator(`${main} input:not([type=hidden]), ${main} select, ${main} textarea`);
    for(let n=0;n<await fields.count();n++){
      const field=fields.nth(n);if(!await field.isVisible()||!await field.isEnabled())continue;
      const prior=await field.evaluate(e=>getComputedStyle(e).borderColor);
      await page.keyboard.press('Tab');await field.focus();
      const f=await field.evaluate(e=>{const s=getComputedStyle(e),w=e.closest('.search,.input-with-icon'),ws=w&&getComputedStyle(w);return {name:e.getAttribute('aria-label')||[...e.labels||[]].map(l=>l.textContent).join(' '),type:e.type,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,borderColor:s.borderColor,borderWidth:s.borderWidth,focusVisible:e.matches(':focus-visible'),wrapperOutline:ws?{style:ws.outlineStyle,width:ws.outlineWidth,color:ws.outlineColor}:null};});
      f.visibleIndicator=(f.outlineStyle!=='none'&&parseFloat(f.outlineWidth)>0)||(parseFloat(f.borderWidth)>0&&f.borderColor!==prior)||!!(f.wrapperOutline&&f.wrapperOutline.style!=='none'&&parseFloat(f.wrapperOutline.width)>0);
      fieldFocus.push(f);
    }
  }
  let modal=null;
  if (openers[route]) {
    const opener=page.getByRole('button',{name:openers[route],exact:true});
    if (await opener.count() && await opener.isVisible()) {
      await opener.focus(); await page.keyboard.press('Enter');
      await page.getByRole('dialog').waitFor(); await ready(page);
      const measures=await page.evaluate(browserMetrics);
      const focusInside=await page.locator('dialog').evaluate(e=>e.contains(document.activeElement));
      let trapped=true;
      for(let n=0;n<12;n++){await page.keyboard.press('Tab'); trapped=trapped && await page.locator('dialog').evaluate(e=>e.contains(document.activeElement));}
      await page.screenshot({path:path.join(dir,`${route}-dialog-${width}.png`)});
      await page.keyboard.press('Escape');
      const closed=await page.locator('dialog').count()===0;
      const returnsToOpener=await opener.evaluate(e=>e===document.activeElement);
      modal={...measures,focusInsideOnOpen:focusInside,focusTrapped:trapped,escapeCloses:closed,returnsToOpener};
    }
  }
  return {variant, route, width, screenshot:path.relative(evidence,screenshot), ...before, focus, hover, fieldFocus, tableKeyboard:tableChecks, modal};
}
(async()=>{
  const browser=await firefox.launch({headless:true,executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'});
  const results=[]; const fatal=[];
  try {
    for(const variant of variants) {
      const base=`http://127.0.0.1:${variant==='baseline'?18024:18023}`;
      const dir=path.join(evidence,phase,variant);fs.mkdirSync(dir,{recursive:true});
      for(const width of widths){
        const context=await browser.newContext({viewport:{width,height:width===1440?900:width===768?1024:812},locale:'pt-BR',timezoneId:'America/Manaus'});
        const page=await context.newPage();const errors=[],external=[],failures=[];
        page._pendingAPI=new Set();page._lastAPIChange=0;
        page.on('request',r=>{if(r.url().includes('/api/')){page._pendingAPI.add(r);page._lastAPIChange=Date.now();}});
        const finish=r=>{if(page._pendingAPI.delete(r))page._lastAPIChange=Date.now();};
        page.on('requestfinished',finish);page.on('requestfailed',finish);
        page.on('pageerror',e=>errors.push(e.message));
        page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith(base+'/'))external.push(r.url());});
        page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
        await page.goto(base);await page.locator('.login-card').waitFor();await ready(page);
        results.push(await audit(page,'login',width,variant,dir));
        await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill('DemoLocal#2026');
        await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('main h1').waitFor();
        for(const [route,label] of screens){
          try {
            await page.goto(base+'/#'+route);await page.locator('main h1').waitFor();await ready(page);
            const result=await audit(page,route,width,variant,dir); result.inventoryLabel=label;
            results.push(result);
            console.log(`${phase} ${variant} ${width} ${route}: overflow=${result.pageOverflow}, unlabeled=${result.controls.filter(c=>c.unlabeled).length}, lowTextContrast=${result.text.filter(t=>t.fails&&!t.gradient).length}, focusContrast=${result.focus?.outlineRatio}`);
          } catch(e){fatal.push({variant,width,route,error:String(e)});console.log('AUDIT ERROR',variant,width,route,String(e));}
        }
        // Alias remains an existing route; confirm it still renders without changing navigation.
        await page.goto(base+'/#finance-suppliers'); await ready(page);
        results.push({variant,width,route:'finance-suppliers',alias:true,heading:await page.locator('main h1').textContent()});
        if(width<901){
          await page.getByRole('button',{name:'Abrir menu',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(300);
          const menu=await page.locator('.sidebar').evaluate(e=>{const r=e.getBoundingClientRect();return {visible:e.classList.contains('visible'),left:r.left,right:r.right,font:getComputedStyle(e).fontFamily,background:getComputedStyle(e).backgroundColor};});
          await page.screenshot({path:path.join(dir,`menu-${width}.png`)});
          const focusOpen=await page.evaluate(()=>({text:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent,inSidebar:!!document.activeElement?.closest('.sidebar')}));
          await page.keyboard.press('Tab');const focusNext=await page.evaluate(()=>({text:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent,inSidebar:!!document.activeElement?.closest('.sidebar')}));
          await page.getByRole('button',{name:'Fechar menu',exact:true}).last().click();
          results.push({variant,width,route:'menu',menu,focusOpen,focusNext});
        }
        results.push({variant,width,route:'runtime',pageErrors:errors,externalRequests:external,httpFailures:failures});
        await context.close();
        fs.writeFileSync(path.join(evidence,`${phase}-audit.json`),JSON.stringify({phase,results,fatal},null,2));
      }
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(evidence,`${phase}-audit.json`),JSON.stringify({phase,results,fatal},null,2));
  console.log(JSON.stringify({phase,screens:screens.length,widths,results:results.length,fatal}));
  if(fatal.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
