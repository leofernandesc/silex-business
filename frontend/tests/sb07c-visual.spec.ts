import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dateField, enterDate, expectDate } from './dateHelpers';
const out='../docs/evidence/sb07c';
for(const width of [1440,768,375,320]) test(`visual: service dates, calendar, focus and text 200 percent ${width}`,async({browser},info)=>{
 const rows:unknown[]=[];
 for(const variant of ['baseline','candidate']){
  const origin='http://127.0.0.1:'+(variant==='baseline'?'18084':'18085');
  const context=await browser.newContext({locale:'en-US',viewport:{width,height:900}});
  try{
   const page=await context.newPage(); const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   expect((await page.request.post(origin+'/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}})).ok()).toBe(true);
   await page.goto(origin+'/app#service-orders');await page.getByRole('button',{name:'Novo serviço/pedido',exact:true}).click();
   const dialog=page.locator('dialog:modal');await expect(dialog).toBeVisible();
   if(variant==='baseline')await page.getByLabel('Data do serviço *',{exact:true}).fill('2026-03-04');
   else{await enterDate(page,'Data do serviço *','2026-03-04');await expectDate(page,'Data do serviço *','2026-03-04');}
   await page.screenshot({path:`${out}/screenshots/${variant}-service-${info.project.name}-en-US-${width}.png`});
   rows.push({variant,state:'normal',viewport:width,document:await page.evaluate(()=>document.documentElement.scrollWidth)});
   if(variant==='baseline')continue;
   const trigger=dateField(page,'Data do serviço *').getByRole('button');await trigger.focus();await page.keyboard.press('Enter');
   const popover=page.locator('.silex-date-popover');await expect(popover).toBeVisible();
   const box=await popover.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   await page.screenshot({path:`${out}/screenshots/calendar-${info.project.name}-${width}.png`});
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
   await trigger.click();
   await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll<HTMLElement>('dialog:modal, dialog:modal *')];
    const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));
    nodes.forEach((n,i)=>{n.style.fontSize=sizes[i]*2+'px'});
   });
   const large=await popover.boundingBox();expect(large!.x).toBeGreaterThanOrEqual(0);expect(large!.x+large!.width).toBeLessThanOrEqual(width+1);
   const headers=await popover.locator('th').evaluateAll(nodes=>nodes.map(n=>{const range=document.createRange();range.selectNodeContents(n);return{cell:n.getBoundingClientRect().toJSON(),text:range.getBoundingClientRect().toJSON()}}));
   for(const h of headers){expect(h.text.left).toBeGreaterThanOrEqual(h.cell.left-1);expect(h.text.right).toBeLessThanOrEqual(h.cell.right+1);}
   for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
   const selected=await page.locator(':focus').boundingBox();expect(selected!.x).toBeGreaterThanOrEqual(large!.x);expect(selected!.x+selected!.width).toBeLessThanOrEqual(large!.x+large!.width+1);
   const measurements=await popover.evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,height:n.clientHeight,scrollHeight:n.scrollHeight}));
   expect(measurements.scroll).toBeLessThanOrEqual(measurements.width+1);
   // The calendar may scroll internally with enlarged text; its full grid stays available.
   rows.push({variant,state:'text200',viewport:width,popover:large,measurements,document:await page.evaluate(()=>document.documentElement.scrollWidth)});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   await page.screenshot({path:`${out}/screenshots/calendar-text200-${info.project.name}-${width}.png`});
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
   await expectDate(page,'Data do serviço *','2026-03-04');
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
 writeFileSync(`${out}/visual-${info.project.name}-${width}.json`,JSON.stringify(rows,null,2));
});

test('visual: incomplete civil date reports an accessible error without publishing partial ISO',async({page},info)=>{
 await page.setViewportSize({width:375,height:900});
 expect((await page.request.post('/api/auth/login',{data:{username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD}})).ok()).toBe(true);
 await page.goto('/app#service-orders');await page.getByRole('button',{name:'Novo serviço/pedido',exact:true}).click();
 await enterDate(page,'Data do serviço *','2026-03-04');const field=dateField(page,'Data do serviço *');
 await field.locator('[data-type=day]').focus();await page.keyboard.press('Backspace');
 for(let i=0;i<3;i++)await page.keyboard.press('Tab');
 await expect(field).toContainText('O valor anterior foi mantido.');
 await expect(field.locator('input[type=date]')).toHaveValue('2026-03-04');
 await expect(field.getByRole('spinbutton').first()).toHaveAttribute('aria-invalid','true');
 await page.screenshot({path:`${out}/screenshots/invalid-service-${info.project.name}-375.png`});
});
