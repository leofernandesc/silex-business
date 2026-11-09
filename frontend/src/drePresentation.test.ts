import {describe,it,expect} from 'vitest';
import {dreOperationName,dreDisplayState,dreIssueMessages,dreIssueMessage,dreEvidenceLabel,dreErrorMessage,dreDiagnosticCsv} from './drePresentation';
describe('DRE presentation without changing economic data',()=>{
 it.each([
  [{key:'finance_entry:12:principal',origin:{route:'finance-receivable',id:12}},'Conta a receber #12'],
  [{key:'finance_entry:12:principal',origin:{route:'finance-payable',id:12}},'Conta a pagar #12'],
  [{key:'sale:7:principal'},'Venda #7'],[{key:'sale:7:commercial_discount'},'Desconto comercial da venda #7'],
  [{key:'service_order:4:revenue'},'Receita do serviço #4'],
  [{key:'service_order_cost:9:principal',origin:{route:'service-orders',id:4}},'Custo contratado #9 · Serviço #4'],
  [{key:'payment:3:interest'},'Juros da baixa #3'],[{key:'payment:3:fine'},'Multa da baixa #3'],[{key:'payment:3:discount'},'Desconto financeiro da baixa #3'],
  [{key:'economic_adjustment:2:0',original_source_key:'sale:7:principal'},'Ajuste econômico #2 · Venda #7'],
  [{key:'unknown:4:principal'},'Operação financeira'],[{key:'finance_entry:9007199254740992:principal'},'Operação financeira']
 ])('uses business labels for %j',(source,expected)=>expect(dreOperationName(source)).toBe(expected));
 it('translates every economic issue emitted by the current engine',()=>{
  for(const code of ['service_not_completed','sale_not_finalized','completion_evidence_required','cost_title_required','duplicate_documents','sale_values_unreconciled','sale_title_mismatch','service_title_mismatch','cost_title_mismatch','supplier_kind_mismatch','missing_operational_cost','recognition_required','classification_required','unclassified','affects_result_conflict','direction_mapping_conflict','economic_nature_confirmation_required','principal_outside_result_required','restricted_sources','source_or_policy_changed_since_review','mapping_policy_confirmation_required','cancellation_source_changed_since_review','economic_cancellation_review_required','titles_required','delivery_confirmation_required'])expect(dreIssueMessages[code],code).toBeTruthy();
  expect(dreIssueMessage('service_not_completed')).toContain('Serviço ainda não concluído');expect(dreIssueMessage('secret_unknown_code')).not.toContain('secret_unknown_code');
 });
 it('distinguishes system evidence codes from unchanged user evidence',()=>{expect(dreEvidenceLabel('verified_finalization')).toBe('Venda finalizada e conferida');expect(dreEvidenceLabel('Nota de prestação nº 123')).toBe('Nota de prestação nº 123')});
 it.each([['service_order','Conclusão do serviço conferida'],['service_order_cost','Incorrência do custo conferida']])('uses the actual source for evidence %s',(source,label)=>expect(dreEvidenceLabel('verified_finalization',source)).toBe(label));
 it('gives actionable Portuguese errors without exposing internal server text',()=>{
  expect(dreErrorMessage({status:503,message:'INTERNAL_DETAILS'})).not.toContain('INTERNAL');expect(dreErrorMessage({status:403,message:'Forbidden'})).toContain('permissão');expect(dreErrorMessage('Internal Server Error')).toContain('Atualize');expect(dreErrorMessage('unavailable')).toContain('Atualize');expect(dreErrorMessage(new TypeError('Cannot read properties of undefined'))).not.toContain('Cannot read');expect(dreErrorMessage({status:409,message:'Mapeamento alterado; refaça a prévia'})).toBe('Mapeamento alterado; refaça a prévia');
 });
 it('exports readable values and coverage with a separate audit column, preventing formula injection',()=>{
  const r={start:'2026-11-01',end:'2026-11-09',mapping_version:1,decision_version:1,cancellation_version:1,lines:[{code:'RB',coverage_status:'complete',known_amount_cents:0,final_amount_cents:0},{code:'LL',coverage_status:'unavailable',known_amount_cents:null,final_amount_cents:null}],facts:[{key:'finance_entry:12:principal',origin:{route:'finance-receivable',id:12},dre_line_code:'RB',economic_date:'2026-11-09',amount_cents:10001},{key:'economic_adjustment:1:0',original_source_key:'finance_entry:12:principal',dre_line_code:'RB',economic_date:'2026-11-09',amount_cents:-10001}],excluded:[{key:'finance_entry:15:principal',amount_cents:20001,reason:'=UNTRUSTED()'}],issues:[{key:'service_order:2:revenue',codes:['service_not_completed']}],margins:{LL:{value:null,reason:'Resultado incompleto'}}};
  const before=JSON.stringify(r),csv=dreDiagnosticCsv(r);expect(JSON.stringify(r)).toBe(before);expect(csv).toContain('Conta a receber #12');expect(csv).toContain('Serviço ainda não concluído');expect(csv).not.toContain('service not completed');expect(csv).toContain('Identificador técnico (auditoria)');expect(csv).toContain(';10001;');expect(csv).toContain(';-10001;');expect(csv).toContain("'=UNTRUSTED()");expect(csv).toContain('Indisponível');expect(csv).toContain('09/11/2026');expect(csv).toContain('finance_entry:12:principal');
 });
});

describe('DRE presentation states without inventing financial values',()=>{
 const empty={facts:[],issues:[],excluded:[],lines:[{known_amount_cents:null,coverage_status:'unavailable'}]};
 it('distinguishes no eligible operations from unconfigured operations',()=>{expect(dreDisplayState(empty)).toBe('empty');expect(dreDisplayState({...empty,issues:[{codes:['unclassified']}]})).toBe('pending')});
 it('preserves known values and legitimate zero while final coverage is incomplete',()=>{for(const cents of [0,500001])expect(dreDisplayState({...empty,lines:[{known_amount_cents:cents,coverage_status:'partial'}]})).toBe('partial')});
 it('treats traceable exclusions as partial coverage rather than no operations',()=>expect(dreDisplayState({...empty,excluded:[{key:'finance_entry:1:principal'}]})).toBe('partial'));
 it('only declares coverage confirmed when all components are confirmed without issues',()=>{const report={...empty,lines:[{known_amount_cents:0,coverage_status:'complete'}]};expect(dreDisplayState(report)).toBe('complete');expect(dreDisplayState({...report,issues:[{}]})).toBe('partial')});
});
