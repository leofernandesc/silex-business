const fs=require('fs'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright');
const {measure,settled,selectors,properties}=require('./matrix.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[];try{
 for(const [variant,origin] of [['baseline',process.env.SILEX_BASELINE],['candidate',process.env.SILEX_CANDIDATE]])for(const width of [1440,768,375,320]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'});await page.goto(origin+'/app#home');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/app#home');await page.getByRole('heading',{name:'Página inicial',exact:true}).waitFor();await settled(page);
  const link=page.locator('.silex-home a[href]').first(),snap=async state=>{await settled(page);rows.push({variant,width,state,...await page.evaluate(measure,{selectors:[...selectors,'.silex-home','.silex-home a'],properties})});};
  await page.mouse.move(0,0);await snap('normal');await link.hover();await snap('hover');await page.mouse.move(0,0);
  for(let i=0;i<240;i++){if(await link.evaluate(e=>e===document.activeElement))break;const reverse=await link.evaluate(e=>!!(document.activeElement&&e.compareDocumentPosition(document.activeElement)&Node.DOCUMENT_POSITION_FOLLOWING));await page.keyboard.press(reverse?'Shift+Tab':'Tab');}
  if(!await link.evaluate(e=>e.matches(':focus-visible')))throw Error('Home link not reached by keyboard');await snap('focus');await page.close();
 }
 const a=rows.filter(r=>r.variant==='baseline'),b=rows.filter(r=>r.variant==='candidate');for(const x of a){const y=b.find(y=>y.width===x.width&&y.state===x.state);if(JSON.stringify(x.nodes)!==JSON.stringify(y.nodes)||x.document!==y.document)throw Error('Home computed difference');}
 fs.writeFileSync(process.env.SILEX_EVIDENCE+'/home-state-comparison.json',JSON.stringify({rows,paired_probes:a.length,all_equal:true}));console.log(a.length,'supplementary Home comparisons equal');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
