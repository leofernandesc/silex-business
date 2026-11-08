import {expect,it,vi} from 'vitest';
import {reportColumn,formatReportValue} from './financePlanning';
it('a title remaining amount is pending, distinct from the available budget',()=>{
 expect(reportColumn('remaining_cents','titles-due')).toBe('Saldo pendente');
 expect(reportColumn('remaining_cents','budget-actual')).toBe('Disponível');
});
it('nested financial details preserve IDs, signed cents, civil dates and attachment metadata',()=>{
 const row=[{id:7,amount_cents:-1001,posting_date:'2026-11-01',attachments:[{id:9,original_name:'Comprovante fictício.pdf',content:null}]}];
 const output=formatReportValue('payments',row,'titles-due');
 expect(output).not.toContain('[object Object]');expect(output).toContain('ID: 7');expect(output).toContain('10,01');expect(output).toContain('01/11/2026');expect(output).toContain('Comprovante fictício.pdf');
});
it('empty nested detail is explicit absence, and primitive cents stay unchanged',()=>{
 expect(formatReportValue('payments',[],'titles-due')).toBe('—');
 expect(formatReportValue('amount_cents',12345,'titles-due')).toMatch(/123,45/);
});

it.each(['America/Manaus','UTC','Asia/Tokyo','America/Los_Angeles'])('report timestamps use Manaus while civil due dates retain their day in %s',zone=>{
 vi.stubEnv('TZ',zone);
 try{expect(formatReportValue('created_at','2027-01-01T03:30:00+00:00','titles-due')).toBe('31/12/2026, 23:30');expect(formatReportValue('due_date','2027-01-01','titles-due')).toBe('01/01/2027');}finally{vi.unstubAllEnvs();}
});
it('date-like descriptions, documents and category names keep their identity',()=>{
 for(const key of ['description','document','group'])expect(formatReportValue(key,'2027-01-01','income-category')).toBe('2027-01-01');
});
it('daily report group dates remain Brazilian civil dates',()=>{
 for(const report of ['cash-daily','settlements-daily'])expect(formatReportValue('group','2027-01-01',report)).toBe('01/01/2027');
});
