const fs=require('fs'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright');
const {reportReady,settled,measure,selectors,properties}=require('./matrix.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[],early=[],prints=[];
try{for(const [variant,origin] of [['historical-aa',process.env.SILEX_HISTORICAL],['baseline',process.env.SILEX_BASELINE],['candidate',process.env.SILEX_CANDIDATE]]){
 process.env.SILEX_VARIANT=variant;
 for(const width of [1440,768,375]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR',timezoneId:'America/Manaus'});
  await page.goto(origin+'/app#finance-reports');await page.getByLabel('Usuário',{exact:true}).fill('demo.admin');await page.getByLabel('Senha',{exact:true}).fill(process.env.SILEX_TEST_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/app#finance-reports');await page.getByRole('heading',{name:'Relatórios Financeiros',exact:true}).waitFor();await settled(page);
  const cash=await reportReady(page,'cash-monthly',()=>page.reload());await page.mouse.move(0,0);await page.screenshot({path:`${process.env.SILEX_EVIDENCE}/screenshots/supplement-${variant}-cash-monthly-${width}.png`,fullPage:true});rows.push({variant,width,...cash});
  const result=await reportReady(page,'result-monthly',async()=>{
   await page.getByLabel('Relatório',{exact:true}).selectOption('result-monthly');await page.waitForLoadState('networkidle');
   const observation=await page.evaluate(()=>({selected:document.querySelector('.report-filters select')?.value,title:document.querySelector('.finance-report-print h2')?.textContent,loading:/Carregando/.test(document.querySelector('.finance-report-print tbody')?.textContent||'')}));early.push({variant,width,...observation});
  });
  await page.mouse.move(0,0);await page.screenshot({path:`${process.env.SILEX_EVIDENCE}/screenshots/supplement-${variant}-result-monthly-${width}.png`,fullPage:true});rows.push({variant,width,...result});
  if(width===1440&&variant!=='historical-aa'){
   await page.emulateMedia({media:'print'});await settled(page);prints.push({variant,route:'finance-reports',...await page.evaluate(measure,{selectors,properties})});
   await page.emulateMedia({media:'screen'});const loaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/finance/movements'&&r.status()===200);await page.goto(origin+'/app#finance');await loaded;await page.getByRole('heading',{name:'Lançamentos (Despesa/Receita)',exact:true}).waitFor();await settled(page);await page.emulateMedia({media:'print'});await settled(page);prints.push({variant,route:'finance',...await page.evaluate(measure,{selectors,properties})});
  }
  await page.close();console.log(variant,width,'reports ready');
 }
}
fs.writeFileSync(process.env.SILEX_EVIDENCE+'/report-supplement.json',JSON.stringify({rows,early,product_changed:false,historical_evidence_untouched:true},null,2));fs.writeFileSync(process.env.SILEX_EVIDENCE+'/print-comparison.json',JSON.stringify(prints));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
