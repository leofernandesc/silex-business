/** Presentation only: canonical keys, cents and economic policies remain server-owned. */
import {dateOnly,money} from './format';
export const dreLineNames:Record<string,string>={RB:'Receita bruta',DED:'Deduções',RL:'Receita líquida',CD:'Custos diretos / CMV / CSP',LB:'Lucro bruto',DO:'Despesas operacionais',OR:'Outras receitas operacionais',OD:'Outras despesas operacionais',DA:'Depreciação e amortização',EBIT:'Resultado operacional',EBITDA:'EBITDA gerencial',FI:'Receitas financeiras',FE:'Despesas financeiras',RF:'Resultado financeiro',TL:'Tributos sobre lucro',LL:'Lucro líquido gerencial',outside_dre:'Fora do resultado'};
export const dreStatuses:Record<string,string>={complete:'Completo',partial:'Parcial',unavailable:'Indisponível',not_applicable:'Não aplicável'};
/** Presentation only: an empty period is different from unconfigured operations. */
export function dreDisplayState(report:{facts:unknown[];issues:unknown[];excluded:unknown[];lines:{known_amount_cents:number|null;coverage_status:string}[]}):'empty'|'pending'|'partial'|'complete'{
 const known=report.lines.some(line=>line.known_amount_cents!==null);
 if(!report.facts.length&&!report.issues.length&&!report.excluded.length&&!known)return 'empty';
 if(!report.issues.length&&report.lines.length>0&&report.lines.every(line=>['complete','not_applicable'].includes(line.coverage_status)))return 'complete';
 return !report.facts.length&&!known&&!report.excluded.length?'pending':'partial';
}
export const dreIssueMessages:Record<string,string>={
 source_or_policy_changed_since_review:'A fonte ou a política mudou. Atualize os dados e confirme novamente a evidência.',
 mapping_policy_confirmation_required:'A política histórica não foi comprovada. Revise a classificação no Plano financeiro antes de confirmar.',
 cancellation_source_changed_since_review:'A fonte ou a classificação mudou. Confira uma nova prévia do ajuste.',
 restricted_sources:'Há fontes que sua conta não pode consultar. O demonstrativo permanece incompleto.',
 recognition_required:'Confirme a data e a evidência do fato econômico.',classification_required:'Classifique a operação no Plano financeiro.',unclassified:'A categoria ainda não possui classificação na DRE.',
 completion_evidence_required:'Falta comprovar a conclusão do serviço. Confira a ordem original.',
 service_not_completed:'Serviço ainda não concluído. Confirme a execução na ordem antes de reconhecer a receita.',
 sale_not_finalized:'Venda ainda não finalizada. Confira a venda original.',
 titles_required:'Gere os títulos na operação original, após conferir os dados.',
 cost_title_required:'O custo ainda não possui título. Confira sua incorrência e a geração de títulos na ordem.',
 delivery_confirmation_required:'Comprove a entrega do serviço vendido antes de reconhecer a receita.',
 source_changed_since_review:'A fonte mudou. Confira os dados e registre uma nova revisão.',
 economic_cancellation_review_required:'Confira a evidência, a data e o efeito econômico do cancelamento.',
 direction_mapping_conflict:'A rubrica não corresponde ao tipo de receita ou despesa. Revise a classificação.',
 affects_result_conflict:'A classificação conflita com a incidência no resultado. Revise a política no Plano financeiro.',
 economic_nature_confirmation_required:'Confirme a natureza econômica antes de reconhecer a operação.',
 principal_outside_result_required:'O principal de investimento ou financiamento deve ficar fora do resultado. Revise a classificação.',
 duplicate_documents:'Há títulos repetidos para a mesma operação. Confira os vínculos na origem antes de reconhecer.',
 sale_values_unreconciled:'Os itens, descontos e total da venda não conferem. Revise a venda original.',
 sale_title_mismatch:'O valor do título difere da venda. Confira os documentos vinculados.',
 service_title_mismatch:'O título difere do valor contratado do serviço. Confira a ordem e os vínculos.',
 missing_operational_cost:'O custo operacional vinculado não foi localizado. Confira a ordem original.',
 cost_title_mismatch:'O título difere do custo contratado. Confira o custo e seu vínculo na ordem.',
 supplier_kind_mismatch:'O tipo do prestador não corresponde ao custo contratado. Solicite revisão dos vínculos operacionais.'
};
export function dreIssueMessage(code:string){return dreIssueMessages[code]||'Esta operação exige conferência. Abra a origem e revise a evidência; o código está nos detalhes técnicos.'}
export type DreSourceRef={key:string;origin?:{route:string;id:number};original_source_key?:string;linked_finance_entry_id?:number|null;entry_ids?:number[]};
const validId=(s:string)=>/^[1-9]\d*$/.test(s)&&Number.isSafeInteger(Number(s))&&Number(s)<=2147483647;
export function dreOperationName(source:DreSourceRef):string{
 const parts=source.key.split(':'),[kind,id,component]=parts;
 if(!validId(id||''))return 'Operação financeira';
 if(kind==='sale')return component==='commercial_discount'?'Desconto comercial da venda #'+id:'Venda #'+id;
 if(kind==='service_order')return 'Receita do serviço #'+id;
 if(kind==='service_order_cost')return 'Custo contratado #'+id+(source.origin?.route==='service-orders'&&validId(String(source.origin.id))?' · Serviço #'+source.origin.id:'');
 if(kind==='finance_entry')return (source.origin?.route==='finance-receivable'?'Conta a receber #':source.origin?.route==='finance-payable'?'Conta a pagar #':'Lançamento financeiro #')+id;
 if(kind==='payment')return (({interest:'Juros da baixa #',fine:'Multa da baixa #',discount:'Desconto financeiro da baixa #'} as Record<string,string>)[component]||'Componente da baixa #')+id;
 if(kind==='economic_adjustment')return 'Ajuste econômico #'+id+(source.original_source_key&&!source.original_source_key.startsWith('economic_adjustment:')?' · '+dreOperationName({key:source.original_source_key,origin:source.origin}):'');
 return 'Operação financeira';
}
export function dreEvidenceLabel(value:string,sourceType?:string){
 if(value==='verified_finalization'&&sourceType==='service_order')return 'Conclusão do serviço conferida';
 if(value==='verified_finalization'&&sourceType==='service_order_cost')return 'Incorrência do custo conferida';
 return ({verified_finalization:'Venda finalizada e conferida',verified_sale_discount:'Desconto comercial conferido'} as Record<string,string>)[value]||value;
}
export function dreErrorMessage(error:unknown):string{
 const e=error as {status?:number;message?:string};const text=typeof error==='string'?error:e?.message||'';
 if(e?.status===401)return 'Sua sessão terminou. Entre novamente antes de continuar.';
 if(e?.status===403)return 'Sua conta não tem permissão para esta consulta ou ação.';
 if(e?.status===404)return 'A origem não está disponível para sua conta. Atualize a consulta e confira o registro original.';
 if(e?.status&&e.status>=500)return 'Não foi possível consultar ou gravar a DRE agora. Tente novamente; confira o resultado antes de reenviar uma confirmação.';
 if(['not found','forbidden','unauthorized','internal server error','service unavailable','unavailable','failed to fetch'].includes(text.toLowerCase())||/Cannot read|TypeError|SyntaxError|NetworkError|^[a-z]+(?:_[a-z0-9]+)+$/i.test(text))return 'Não foi possível concluir a operação. Atualize a consulta e tente novamente; confira o resultado antes de reenviar.';
 return text||'Não foi possível concluir a operação. Atualize os dados e tente novamente.';
}
type CsvReport={source_fingerprint?:string;report_fingerprint?:string;start:string;end:string;mapping_version:number;decision_version:number;cancellation_version:number;lines:{code:string;coverage_status:string;known_amount_cents:number|null;final_amount_cents:number|null}[];facts:(DreSourceRef&{dre_line_code:string;economic_date:string;amount_cents:number})[];excluded:{key:string;amount_cents:number;reason:string}[];issues:{key?:string;codes:string[]}[];margins:Record<string,{value:string|null;reason:string|null}>};
const cell=(value:unknown)=>{let s=value==null?'':String(value);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
/** A readable document; the existing technical CSV endpoint and its contracts are unchanged. */
export function dreDiagnosticCsv(report:CsvReport){
 const rows:unknown[][]=[['DRE gerencial','Competência econômica',dateOnly(report.start),dateOnly(report.end)],['Valores parciais não representam lucro final; componentes desconhecidos não são zero.'],['Rubrica','Cobertura','Valor conhecido','Valor final']];
 for(const l of report.lines)rows.push([dreLineNames[l.code]||'Rubrica a conferir',dreStatuses[l.coverage_status]||'A conferir',l.known_amount_cents===null?'Indisponível':money(l.known_amount_cents),l.final_amount_cents===null?'Indisponível':money(l.final_amount_cents)]);
 rows.push(['Fingerprint das fontes',report.source_fingerprint||''],['Fingerprint do demonstrativo',report.report_fingerprint||'']);
 rows.push(['Versão de classificação',report.mapping_version,'Versão de reconhecimento',report.decision_version,'Versão de ajustes',report.cancellation_version],['Margem','Percentual','Critério']);
 const margins:Record<string,string>={LB:'Margem bruta',EBIT:'Margem operacional',EBITDA:'Margem EBITDA',LL:'Margem líquida'};
 for(const [code,m]of Object.entries(report.margins))rows.push([margins[code]||'Margem a conferir',m.value===null?'Indisponível':m.value.replace('.',',')+'%',m.reason||'Componentes completos']);
 rows.push(['Operações fora do resultado','Valor','Justificativa','Identificador técnico (auditoria)']);for(const r of report.excluded)rows.push([dreOperationName(r),money(r.amount_cents),r.reason,r.key]);
 rows.push(['Pendências','Orientação','Identificador técnico (auditoria)']);for(const i of report.issues)rows.push([i.key?dreOperationName({key:i.key}):'Cobertura do período',i.codes.map(dreIssueMessage).join(' '),i.key||'']);
 rows.push(['Operação','Rubrica','Data econômica','Valor','Centavos','Identificador técnico (auditoria)']);for(const f of report.facts)rows.push([dreOperationName(f),dreLineNames[f.dre_line_code]||'Rubrica a conferir',dateOnly(f.economic_date),money(f.amount_cents),f.amount_cents,f.key]);
 return '\ufeff'+rows.map(r=>r.map(v=>typeof v==='number'?String(v):cell(v)).join(';')).join('\r\n')+'\r\n';
}

export function dreCommercialMessage(report:Parameters<typeof dreDisplayState>[0]){
 return ({empty:'Nenhuma operação no período selecionado.',pending:'Informações insuficientes para apresentar o demonstrativo deste período.',partial:'Resultado parcial. Os valores finais dependem de informações ainda não comprovadas.',complete:'Demonstrativo completo para o período.'})[dreDisplayState(report)];
}
/** Commercial allowlist: never serialize sources, evidence, free-form reasons or audit metadata. */
export function dreReadableCsv(report:CsvReport){
 const rows:unknown[][]=[['DRE gerencial','Competência econômica',dateOnly(report.start),dateOnly(report.end)],[dreCommercialMessage(report)],['Rubrica','Situação','Valor conhecido','Valor final']];
 for(const l of report.lines)rows.push([dreLineNames[l.code]||'Rubrica',dreStatuses[l.coverage_status]||'Indisponível',l.known_amount_cents===null?'Indisponível':money(l.known_amount_cents),l.final_amount_cents===null?'Indisponível':money(l.final_amount_cents)]);
 rows.push(['Margem','Percentual']);
 for(const [code,m] of Object.entries(report.margins))rows.push([({LB:'Margem bruta',EBIT:'Margem operacional',EBITDA:'Margem EBITDA',LL:'Margem líquida'} as Record<string,string>)[code]||'Margem',m.value===null?'Indisponível':m.value.replace('.',',')+'%']);
 return '\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')+'\r\n';
}
