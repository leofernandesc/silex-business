/* Run against two isolated servers cloned from the SAME synthetic database. */
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync,existsSync}=require('node:fs');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../../..');
const {firefox,chromium}=require(join(root,'frontend/node_modules/@playwright/test'));
const out=process.env.SILEX_PRINT_EVIDENCE||join(root,'docs/evidence/financial-print-ptbr');
mkdirSync(out,{recursive:true});mkdirSync(join(out,'screenshots'),{recursive:true});mkdirSync(join(out,'pdf'),{recursive:true});
const origins={baseline:process.env.SILEX_BASELINE||'http://127.0.0.1:18096',candidate:process.env.SILEX_CANDIDATE||'http://127.0.0.1:18097'};
for(const origin of Object.values(origins))assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
assert(process.env.SILEX_TEST_PASSWORD,'Provide the synthetic fixture password through SILEX_TEST_PASSWORD');
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100).replace(/\s/g,' ');
const date=iso=>iso.split('-').reverse().join('/');
const norm=s=>s.replace(/\s+/g,' ').trim();
async function read(context,path){const r=await context.request.get(path);assert(r.ok(),`${path}: ${r.status()}`);return r.json();}
async function rows(locator){return locator.locator('tbody tr').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('td')].map(td=>td.innerText.replace(/\s+/g,' ').trim())));}
const result={syntheticOnly:true,documents:[],comparisons:[],errors:[]};
(async()=>{
 for(const engine of ['firefox','chromium']){
  const executablePath=engine==='firefox'?process.env.GESTAO_FIREFOX_PATH||'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox':process.env.SILEX_CHROMIUM_PATH||'/snap/brave/current/opt/brave.com/brave/brave';
  if(!existsSync(executablePath))throw new Error(`${engine} unavailable: specify its installed executable; no installation attempted`);
  const browser=await (engine==='firefox'?firefox:chromium).launch({executablePath,args:engine==='chromium'?['--disable-brave-update','--disable-background-networking']:[]});
  const snapshots=[];
  try{for(const [variant,baseURL] of Object.entries(origins)){
   const context=await browser.newContext({baseURL,locale:engine==='firefox'?'pt-BR':'en-US',timezoneId:engine==='firefox'?'America/Manaus':'UTC',viewport:{width:794,height:1123}});
   try{
    const login=await context.request.post('/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});assert(login.ok());
    const query='?start=2020-01-01&end=2030-12-31&page_size=100';
    const ledger=await read(context,'/api/finance/movements'+query),titles=await read(context,'/api/finance'+query),sales=await read(context,'/api/sales?page_size=100'),catalog=await read(context,'/api/finance/reports/catalog');
    const snapshot={raw:{ledger,titles,sales,accounts:await read(context,'/api/accounts'),company:await read(context,'/api/company-settings')},csv:{},printed:{}};
    const csvPaths=['/api/finance/movements.csv','/api/reports/finance.csv','/api/reports/sales.csv','/api/reports/stock.csv',...catalog.map(r=>`/api/finance/reports/${r.id}.csv`)];
    for(const path of csvPaths){const r=await context.request.get(path+query);assert(r.ok());snapshot.csv[path]=Buffer.from(await r.body()).toString('base64');}
    for(const report of catalog)snapshot.raw[report.id]=await read(context,`/api/finance/reports/${report.id}`+query);
    const page=await context.newPage();page.on('pageerror',e=>result.errors.push({engine,variant,error:e.message}));
    async function record(name,target){
     await page.evaluate(()=>document.fonts.ready);
     const metrics=await target.evaluate(n=>({text:n.innerText,width:n.getBoundingClientRect().width,scroll:n.scrollWidth,display:getComputedStyle(n).display}));
     assert.notEqual(metrics.display,'none',`${name}: hidden in print media`);
     if(engine==='firefox')await page.screenshot({path:join(out,'screenshots',`${variant}-${name}.png`),fullPage:true});
     if(engine==='chromium')await page.pdf({path:join(out,'pdf',`${variant}-${name}.pdf`),format:'A4',printBackground:true,margin:{top:'10mm',bottom:'10mm',left:'10mm',right:'10mm'}});
     result.documents.push({engine,variant,name,rows:await rows(target),...metrics});
    }
    await page.goto('/app#finance');await page.getByRole('heading',{name:'Lançamentos (Despesa/Receita)',exact:true}).waitFor();
    const readyLedger=page.waitForResponse(r=>r.url().includes('/api/finance/movements?')&&!new URL(r.url()).searchParams.has('start'));
    await page.getByRole('button',{name:'Tudo',exact:true}).click();await readyLedger;
    await page.evaluate(()=>{window.__printed=0;window.print=()=>window.__printed++});
    await page.getByRole('button',{name:'Imprimir',exact:true}).click();
    await page.waitForFunction(()=>window.__printed===1);await page.emulateMedia({media:'print'});
    const ledgerPrint=page.locator('.ledger-print');assert.equal(await ledgerPrint.locator('h1').innerText(),`Livro caixa · ${variant==='baseline'?'Gestão':'Silex Business'}`);
    const ledgerRows=await rows(ledgerPrint);assert.equal(ledgerRows.length,ledger.total);
    assert.deepEqual(ledgerRows.map(r=>[r[0],r[1],r[4]]),ledger.items.map(r=>[date(r.posting_date),date(r.competence_date),money(r.amount_cents)]));
    snapshot.printed.ledger=norm(await ledgerPrint.innerText()).replace(`Livro caixa · ${variant==='baseline'?'Gestão':'Silex Business'}`,'Livro caixa');
    await record('ledger',ledgerPrint);await page.emulateMedia({media:'screen'});
    for(const direction of ['expense','income']){
     await page.goto('/app#finance-'+(direction==='expense'?'payable':'receivable'));await page.locator('.silex-accounts').waitFor();
     const ready=page.waitForResponse(r=>r.url().includes('/api/finance?')&&!new URL(r.url()).searchParams.has('start'));
     await page.getByRole('button',{name:'Tudo',exact:true}).click();await ready;
     const opened=page.waitForEvent('popup');await page.getByRole('button',{name:'Imprimir',exact:true}).click();const popup=await opened;
     await popup.locator('tbody tr').first().waitFor();assert.equal(await popup.locator('h1').innerText(),`${variant==='baseline'?'Gestão':'Silex Business'} · Lançamentos financeiros`);
     assert.equal(new URL(popup.url()).searchParams.get('direction'),direction);
     const cells=await rows(popup.locator('table'));const expected=titles.items.filter(r=>r.direction===direction);
     assert.deepEqual(cells,expected.map(r=>[String(r.id),r.description,direction==='income'?'Receita':'Despesa',variant==='baseline'?r.due_date:date(r.due_date),r.status,money(r.amount_cents)]));
     snapshot.printed[direction]=cells.map(r=>[...r.slice(0,3),r[3].includes('/')?r[3].split('/').reverse().join('-'):r[3],...r.slice(4)]);
     await popup.emulateMedia({media:'print'});await popup.evaluate(()=>document.fonts.ready);
     if(engine==='firefox')await popup.screenshot({path:join(out,'screenshots',`${variant}-${direction}.png`),fullPage:true});
     if(engine==='chromium')await popup.pdf({path:join(out,'pdf',`${variant}-${direction}.pdf`),format:'A4',printBackground:true,margin:{top:'10mm',bottom:'10mm',left:'10mm',right:'10mm'}});
     result.documents.push({engine,variant,name:direction,rows:cells});await popup.close();
    }
    const sale=sales.items.find(r=>r.status==='finalized');assert(sale,'Fixture needs one finalized sale');
    const detail=await read(context,`/api/sales/${sale.id}`);snapshot.raw.saleDetail=detail;
    await page.goto('/app#sales');await page.getByRole('button',{name:`Ver venda ${sale.id}`,exact:true}).click();const receipt=page.locator('.receipt');await receipt.waitFor();
    assert.equal(await receipt.locator('h2').innerText(),variant==='baseline'?'Gestão':'Silex Business');
    assert.equal((await rows(receipt)).length,detail.items.length);
    assert.deepEqual((await rows(receipt)).map(r=>r.slice(2)),detail.items.map(r=>[money(r.unit_price_cents),money(r.total_cents)]));
    assert(norm(await receipt.innerText()).includes(money(detail.total_cents)));assert(norm(await receipt.innerText()).includes(money(detail.discount_cents)));
    if(detail.due_date)assert((await receipt.innerText()).includes(date(detail.due_date)));
    snapshot.printed.receipt=norm(await receipt.innerText()).replace(variant==='baseline'?'Gestão':'Silex Business','ERP');
    await page.emulateMedia({media:'print'});await record('receipt',receipt);
    snapshots.push(snapshot);
   }finally{await context.close();}
  }
  assert.deepEqual(snapshots[1],snapshots[0],`${engine}: only print brand/date may change`);
  result.comparisons.push({engine,apiEquivalence:true,csvByteEquivalence:true,csvCount:Object.keys(snapshots[0].csv).length,printValuesDatesStatusAndIdentifiersEquivalent:true});
  }finally{await browser.close();}
 }
 assert.deepEqual(result.errors,[]);result.passed=true;
})().catch(e=>{result.failure=e.stack;process.exitCode=1;console.error(e.message)}).finally(()=>{writeFileSync(join(out,'browser-comparison.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,comparisons:result.comparisons,documents:result.documents.length,errors:result.errors}));});
