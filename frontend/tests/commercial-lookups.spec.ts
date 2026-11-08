import {test,expect} from './integrationTest';
for(const [route,button] of [['finance-reports','Nova meta'],['finance-subcategories','Nova subcategoria'],['finance','Nova receita']] as const)test(`${route} auxiliary categories failure is visible in its form and retry restores choices`,async({page})=>{
 expect((await page.request.post('/api/auth/login',{data:{username:'demo.admin',password:'DemoLocal#2026'}})).ok()).toBe(true);
 await page.route('**/api/categories',r=>r.fulfill({status:503,json:{detail:'Categorias indisponíveis (fixture).'}}));await page.goto('/app#'+route);await page.getByRole('button',{name:button,exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('alert').first()).toContainText('Categorias indisponíveis');
 await page.unroute('**/api/categories');await dialog.getByRole('button',{name:'Tentar novamente: categorias',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveCount(0);
 const control=route==='finance'?'Subcategoria *':'Categoria *';await expect.poll(()=>dialog.getByLabel(control,{exact:true}).locator('option').count()).toBeGreaterThan(1);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});
