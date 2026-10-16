import {test,expect,type Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const out='../docs/evidence/sb07d';
const names={short:'Empresa Fictícia',long:'Empresa Fictícia de Comércio e Serviços com Identificação Empresarial Extensa para Verificação de Responsividade',unbroken:'EmpresaFicticiaSemEspacos'.repeat(6)};
const historical='Pessoa Ilustrativa com NomeExtensoSemEspaçosParaRobustez — Dados Fictícios';
function measurement(){
 const grid=document.querySelector<HTMLElement>('.overview-summary'),header=document.querySelector<HTMLElement>('.topbar')!;
 return{viewport:innerWidth,document:document.documentElement.scrollWidth,headerRight:header.getBoundingClientRect().right,mainText:document.querySelector('main')!.textContent!.replace(/Se necessário, deslize ou use as setas para conferir os valores completos\./,'').replace(/\s+/g,' ').trim(),
 links:[...document.querySelectorAll<HTMLAnchorElement>('main a')].map(a=>({href:a.getAttribute('href'),text:a.textContent})),
 actions:[...document.querySelectorAll<HTMLButtonElement>('main button')].map(b=>({name:b.textContent,disabled:b.disabled})),
 grid:grid?{width:grid.clientWidth,scroll:grid.scrollWidth}:null,
 values:[...document.querySelectorAll<HTMLElement>('.overview-summary strong')].map(n=>{const r=document.createRange();r.selectNodeContents(n);return{text:n.textContent,font:getComputedStyle(n).fontSize,lines:r.getClientRects().length,textRight:r.getBoundingClientRect().right,cardRight:n.closest('.summary-card')!.getBoundingClientRect().right}})};
}
async function ready(page:Page,route:string){await page.locator('main h1').waitFor();await page.locator(route==='home'?'.silex-home__company[aria-busy=false]':'.overview-summary').waitFor();await page.evaluate(()=>document.fonts.ready);}
for(const role of ['admin','operator'])test(`C02 ${role}: preserved names, actions and complete amounts at seven widths`,async({browser},info)=>{
 test.setTimeout(180000);const rows:any[]=[];
 try{for(const scenario of ['short','long','unbroken'] as const){
  const contexts=await Promise.all([browser.newContext({locale:'pt-BR',timezoneId:'America/Manaus'}),browser.newContext({locale:'pt-BR',timezoneId:'America/Manaus'})]);
  try{
   const pages=await Promise.all(contexts.map(c=>c.newPage()));
   for(const [i,page]of pages.entries()){
    await page.addInitScript(({name,person})=>{const original=window.fetch.bind(window);window.fetch=async(...args)=>{const response=await original(...args),arg=args[0],path=new URL(typeof arg==='string'?arg:arg instanceof URL?arg.href:arg.url,location.href).pathname;
     if(response.ok&&['/api/auth/me','/api/company-settings','/api/dashboard'].includes(path)){
      const d=await response.clone().json();
      if(path==='/api/auth/me')d.name=person;
      if(path==='/api/company-settings')d.company_name=name;
      // Explicit synthetic PRESENTATION fixture, identical in both versions.
      // Raw backend responses are compared separately without these overrides.
      if(path==='/api/dashboard'){
       d.sales_today_cents=123456789;d.sales_month_cents=987654321;d.receivable_cents=123456789;d.overdue_cents=123456789;
       d.cash={...(d.cash||{}),expected_cents:-123456789};
       if(d.low_stock[0])d.low_stock[0].description='DescriçãoFictíciaExtensaSemEspaços'.repeat(5);
      }
      const headers=new Headers(response.headers);headers.delete('content-length');return new Response(JSON.stringify(d),{status:response.status,headers});
     }return response;};},{name:names[scenario],person:scenario==='short'?'Pessoa Fictícia':historical});
    const origin=i===0?'http://127.0.0.1:18094':'http://127.0.0.1:18095';
    expect((await page.request.post(origin+'/api/auth/login',{data:{username:role==='admin'?'demo.admin':'demo.operador',password:process.env.SILEX_TEST_PASSWORD}})).ok()).toBe(true);
   }
   for(const route of ['home','dashboard'])for(const width of [1440,1024,768,375,320,256,187]){
    const pair:any[]=[];
    for(const [i,page]of pages.entries()){
     const variant=i===0?'baseline':'candidate',origin=i===0?'http://127.0.0.1:18094':'http://127.0.0.1:18095';
     await page.setViewportSize({width,height:900});await page.goto(origin+'/app#'+route);await page.reload();await ready(page,route);
     for(const state of ['normal','text200']){
      if(state==='text200')await page.locator('main').evaluate(m=>{const es=[m,...m.querySelectorAll('*')].filter(n=>n instanceof HTMLElement),sizes=es.map(n=>parseFloat(getComputedStyle(n).fontSize));es.forEach((n,i)=>n.style.fontSize=sizes[i]*2+'px')});
      const result=await page.evaluate(measurement);rows.push({variant,role,scenario,route,width,state,...result});pair.push(result);
      if(i===1){
       expect(result.document,JSON.stringify({role,scenario,route,width,state,result})).toBeLessThanOrEqual(width+1);expect(result.headerRight).toBeLessThanOrEqual(width+1);
       if(route==='home')await expect(page.locator('#home-company-title')).toHaveText(names[scenario]);
       for(const value of result.values){expect(value.lines).toBe(1);expect(value.textRight,value.text||'amount').toBeLessThanOrEqual(value.cardRight+1);}
      }
      if((role==='admin'&&scenario==='unbroken')||(role==='operator'&&scenario==='short'&&[375,187].includes(width)))await page.screenshot({path:`${out}/screenshots/${variant}-${role}-${route}-${state}-${width}.png`,fullPage:true});
      if(i===1&&result.grid&&result.grid.scroll>result.grid.width+1){
       const grid=page.getByRole('region',{name:'Indicadores da Visão Geral',exact:true});await grid.focus();for(let k=0;k<8;k++)await page.keyboard.press('ArrowRight');
       await expect.poll(()=>grid.evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollLeft)).toBe(0);
       const last=grid.locator('strong').last();await last.scrollIntoViewIfNeeded();await expect(last).toBeInViewport();
      }
     }
    }
    expect(pair[2].mainText).toBe(pair[0].mainText);expect(pair[3].mainText).toBe(pair[1].mainText);expect(pair[2].links).toEqual(pair[0].links);expect(pair[2].actions).toEqual(pair[0].actions);
    expect(pair[3].values.map((v:any)=>[v.text,v.font])).toEqual(pair[1].values.map((v:any)=>[v.text,v.font]));
   }
  }finally{await Promise.all(contexts.map(c=>c.close()));}
 }}finally{writeFileSync(`${out}/c02-${role}-${info.project.name}.json`,JSON.stringify({syntheticPresentationFixture:true,rawApiComparisonSeparate:true,rows},null,2));}
});

test('Overview sale receipt and print presentation remain available',async({browser})=>{
 const results:string[]=[];
 for(const origin of ['http://127.0.0.1:18094','http://127.0.0.1:18095']){
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:'pt-BR'});
  try{const p=await context.newPage();expect((await p.request.post(origin+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}})).ok()).toBe(true);
   await p.goto(origin+'/app#dashboard');await ready(p,'dashboard');
   await p.locator('.dashboard-grid .table-wrap tbody button').first().click();
   const receipt=p.locator('.receipt');await expect(receipt).toBeVisible();results.push((await receipt.innerText()).replace(/\s+/g,' '));
   await p.emulateMedia({media:'print'});await expect(receipt).toBeVisible();expect(await receipt.evaluate(n=>getComputedStyle(n).display)).not.toBe('none');
   await p.screenshot({path:`${out}/screenshots/print-${results.length===1?'baseline':'candidate'}.png`,fullPage:true});
  }finally{await context.close()}
 }
 expect(results[1]).toBe(results[0]);
});
