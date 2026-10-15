const fs=require('fs'),crypto=require('crypto'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,out=process.env.SILEX_EVIDENCE,req=createRequire(root+'/frontend/package.json'),{firefox}=req('playwright'),{inspect}=require('./surfaces.cjs'),{settled}=require('../../sb06d2/scripts/matrix.cjs');
(async()=>{const browser=await firefox.launch({executablePath:'/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox'}),rows=[],candidate=JSON.parse(fs.readFileSync(out+'/surfaces.json')).rows;
try{for(const width of [1440,768,375,320]){const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR',timezoneId:'America/Manaus'});await page.request.post(process.env.SILEX_BASELINE+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}});
 for(const route of ['home','dashboard','finance']){
  await page.goto(process.env.SILEX_BASELINE+'/app#'+route);await page.locator('main h1').waitFor();await settled(page);
  const normal=await page.evaluate(inspect),c=candidate.find(r=>r.width===width&&r.route===route&&r.state==='normal');rows.push({route,width,state:'normal',baseline:normal,candidate:c,equalDocumentWidth:normal.document===c.document});
  if([1440,768,375].includes(width)&&route==='home')await page.screenshot({path:`${out}/screenshots/baseline-${route}-${width}.png`});
  await page.locator('main').evaluate(main=>{const es=[main,...main.querySelectorAll('*')].filter(e=>e instanceof HTMLElement),sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]*2+'px');});
  const measured=await page.evaluate(inspect),text=candidate.find(r=>r.width===width&&r.route===route&&r.state==='computed-text200-NOT-native-zoom');rows.push({route,width,state:'computed-text200-NOT-native-zoom',baseline:measured,candidate:text,equalDocumentWidth:measured.document===text.document});
 }await page.close();}
fs.writeFileSync(out+'/baseline-reflow-comparison.json',JSON.stringify({rows,allWidthsEqual:rows.every(r=>r.equalDocumentWidth)},null,2));if(!rows.every(r=>r.equalDocumentWidth))throw Error('Unexpected width difference');console.log(rows.length,'baseline/candidate reflow pairs equal');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
