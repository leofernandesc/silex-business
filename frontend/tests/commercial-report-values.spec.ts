import {test,expect} from './integrationTest';
import {localDate} from '../src/format';

test('report screen and print preserve nested payment/attachment details and pending balance semantics',async({page,browserName})=>{
 expect((await page.request.post('/api/auth/login',{data:{username:'demo.admin',password:'DemoLocal#2026'}})).ok()).toBe(true);
 const accounts=await(await page.request.get('/api/accounts')).json(),categories=await(await page.request.get('/api/categories')).json();
 const created=await page.request.post('/api/finance',{data:{description:'Título fictício com detalhes verificáveis',direction:'expense',amount_cents:12345,account_id:accounts.find((a:any)=>a.kind==='bank').id,category_id:categories.find((c:any)=>c.name==='Despesas operacionais').id,due_date:localDate()}});expect(created.status()).toBe(201);const title=await created.json();
 const payment=await page.request.post(`/api/finance/${title.id}/settle`,{data:{method:'pix',account_id:title.account_id,principal_cents:1001,request_key:'nested-detail-synthetic-payment'}});expect(payment.status()).toBe(200);
 const attachment=await page.request.post(`/api/finance/${title.id}/attachments`,{data:{filename:'Comprovante fictício.pdf',content_type:'application/pdf',content_base64:Buffer.from('%PDF-1.4\nFictitious evidence only\n').toString('base64')}});expect(attachment.status()).toBe(201);
 await page.goto('/app#finance-reports');await page.getByLabel('Relatório',{exact:true}).selectOption('titles-due');
 const section=page.locator('.finance-report-print');const row=section.locator(':scope > .table-wrap tbody tr').filter({hasText:title.description});await expect(row).toBeVisible();
 await expect(section.getByRole('columnheader',{name:'Saldo pendente',exact:true})).toBeVisible();
 for(const text of ['10,01','113,44','Comprovante fictício.pdf'])await expect(row).toContainText(text);
 await expect(row).not.toContainText('[object Object]');
 await page.emulateMedia({media:'print'});const bands=section.locator('.finance-report-column-bands');await expect(bands).toBeVisible();
 for(const text of ['10,01','113,44','Comprovante fictício.pdf'])await expect(bands).toContainText(text);
 await expect(bands).not.toContainText('[object Object]');
 if(browserName==='chromium')await page.pdf({path:'/tmp/silex-commercial-nested-details-a4.pdf',format:'A4',printBackground:true});
 const persisted=(await(await page.request.get('/api/finance?q='+encodeURIComponent(title.description))).json()).items[0];expect(persisted.remaining_cents).toBe(11344);expect(persisted.payments[0].amount_cents).toBe(-1001);
});
