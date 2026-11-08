import {sourceHref} from "./sourceNavigation";
import "./dre.css";
import { useRef, useState } from 'react';
import { api, downloadCsv, query } from './api';
import { dateOnly, localDate, money } from './format';
import { SilexDatePicker } from './SilexDatePicker';
import { ExportButton, Field, Form, LoadFeedback, Modal, Notice, PageTitle, Pagination, Table, useLoad } from './ui';

type Period={start:string;end:string};
type Line={code:string;known_amount_cents:number|null;final_amount_cents:number|null;coverage_status:string};
type Issue={origin?:{route:string;id:number};category_id?:number;subcategory_id?:number|null;key?:string;codes:string[];source_type?:string;source_id?:number;amount_cents?:number;source_fingerprint?:string;recognition_revision?:number;entry_ids?:number[]};
type Fact={origin?:{route:string;id:number};key:string;source_type:string;source_id:number;dre_line_code:string;amount_cents:number;economic_date:string;recognition_basis:string};
type Report={excluded:{key:string;amount_cents:number;reason:string}[];report_fingerprint:string;margins:Record<string,{value:string|null;reason:string|null}>;lines:Line[];facts:Fact[];issues:Issue[];start:string;end:string;source_fingerprint:string;mapping_version:number;decision_version:number};
const names:Record<string,string>={RB:'Receita bruta',DED:'Deduções',RL:'Receita líquida',CD:'Custos diretos / CMV / CSP',LB:'Lucro bruto',DO:'Despesas operacionais',OR:'Outras receitas operacionais',OD:'Outras despesas operacionais',DA:'Depreciação e amortização',EBIT:'Resultado operacional',EBITDA:'EBITDA gerencial',FI:'Receitas financeiras',FE:'Despesas financeiras',RF:'Resultado financeiro',TL:'Tributos sobre lucro',LL:'Lucro líquido gerencial'};
const statuses:Record<string,string>={complete:'Completo',partial:'Parcial',unavailable:'Indisponível',not_applicable:'Não aplicável'};
const base=['RB','DED','CD','DO','OR','OD','DA','FI','FE','TL'];
const issueLabels:Record<string,string>={restricted_sources:'Fontes restritas à identidade autorizada',recognition_required:'Reconhecimento econômico não confirmado',classification_required:'Classificação pendente',unclassified:'Categoria sem mapeamento',completion_evidence_required:'Conclusão não comprovada',titles_required:'Títulos ainda não gerados',cost_title_required:'Custo sem título e sem confirmação',delivery_confirmation_required:'Entrega do serviço não comprovada',source_changed_since_review:'Fonte alterada após revisão',economic_cancellation_review_required:'Cancelamento econômico exige revisão',direction_mapping_conflict:'Rubrica incompatível com a natureza do título',affects_result_conflict:'Conflito com a exclusão do resultado'};
export function DreReport({period,onPeriod,onLegacy}:{period:Period;onPeriod:(p:Period)=>void;onLegacy:(id:string)=>void}){
 const [from,setFrom]=useState(period.start),[to,setTo]=useState(period.end),[version,setVersion]=useState(0),[issue,setIssue]=useState<Issue|null>(null),[coverage,setCoverage]=useState<string|null>(null),[review,setReview]=useState(false),[detail,setDetail]=useState<string|null>(null);
 const result=useLoad<Report>('/finance/dre?'+query(period),version),catalog=useLoad<{id:string;name:string}[]>('/finance/reports/catalog');
 const data=!result.loading&&!result.error?result.data:null;
 const refresh=()=>{setIssue(null);setCoverage(null);setReview(false);setVersion(v=>v+1)};
 return <><PageTitle title="Relatórios Financeiros" subtitle="DRE gerencial por competência econômica, integrada aos relatórios existentes."/>
 <form className="panel toolbar report-filters" onSubmit={e=>{e.preventDefault();onPeriod({start:from,end:to});setVersion(v=>v+1)}}>
 <Field label="Relatório"><select value="dre" onChange={e=>onLegacy(e.target.value)}><option value="dre">DRE gerencial</option>{catalog.data?.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
 <SilexDatePicker label="De" value={from} onChange={setFrom}/><SilexDatePicker label="Até" value={to} onChange={setTo}/><button className="primary">Gerar relatório</button></form>
 <LoadFeedback resource={result} label="DRE gerencial"/>
 <section className="panel finance-report-print dre-report"><div className="panel-heading"><div><h2>DRE gerencial</h2><p>{dateOnly(period.start)} a {dateOnly(period.end)} · Competência econômica · Silex Business</p></div><ExportButton onClick={()=>downloadCsv('/finance/dre.csv?'+query(period),'dre.csv')}/><button disabled={!data} onClick={()=>window.print()}>Imprimir</button></div>
 <p>Período completo conforme as permissões. Filtros de conta e beneficiário dos relatórios por baixa não se aplicam à DRE. Valores parciais não representam lucro final. CMV, tributos e depreciação desconhecidos não são considerados zero.</p>
 {data&&<><p>Mapeamento: versão {data.mapping_version} · Reconhecimento: versão {data.decision_version} · Demonstrativo integral do período.</p>
 <div className="dre-lines"><Table headers={['Rubrica','Cobertura','Valor conhecido','Valor final','Revisão']} empty={false} loading={false}>
 {data.lines.map(line=><tr key={line.code}><th scope="row">{names[line.code]||line.code} <button type="button" onClick={()=>setDetail(detail===line.code?null:line.code)}>Detalhar {line.code}</button></th><td>{statuses[line.coverage_status]}</td><td>{line.known_amount_cents===null?'—':money(line.known_amount_cents)}</td><td>{line.final_amount_cents===null?'—':money(line.final_amount_cents)}</td><td>{base.includes(line.code)&&<button type="button" disabled={data.issues.length>0} onClick={()=>setCoverage(line.code)}>Revisar cobertura de {line.code}</button>}</td></tr>)}
 </Table></div>
 {detail&&<DreDetails key={detail} line={detail} period={period}/>}
 <Table headers={['Margem','Resultado','Critério']} loading={false} empty={false}>{Object.entries(data.margins).map(([code,margin])=><tr key={code}><th scope="row">{({LB:'Margem bruta',EBIT:'Margem operacional',EBITDA:'Margem EBITDA',LL:'Margem líquida'} as Record<string,string>)[code]}</th><td>{margin.value===null?'—':margin.value.replace('.',',')+'%'}</td><td>{margin.reason||'Componentes completos e receita líquida positiva'}</td></tr>)}</Table>
 <p className="dre-budget-link"><button type="button" onClick={()=>onLegacy('budget-actual')}>Consultar orçamento e realizado por baixas</button> · O orçamento existente possui regime distinto da competência econômica.</p>
 <section className="dre-print-facts"><h3>Fontes reconhecidas no período completo</h3><Table headers={['Origem','Rubrica','Data econômica','Valor (R$)']} empty={!data.facts.length} loading={false}>{data.facts.map(f=><tr key={f.key}><td>{f.origin?<a href={sourceHref(f.origin)}>{f.key}</a>:f.key}</td><td>{names[f.dre_line_code]}</td><td>{dateOnly(f.economic_date)}</td><td>{money(f.amount_cents)}</td></tr>)}</Table></section>
 {data.excluded.length>0&&<section><h3>Fatos fora da DRE</h3><Table headers={['Origem','Valor excluído','Justificativa']} loading={false} empty={false}>{data.excluded.map(row=><tr key={row.key}><td>{row.key}</td><td>{money(row.amount_cents)}</td><td>{row.reason}</td></tr>)}</Table></section>}
 <section><h3>Pendências econômicas</h3>{!data.issues.length?<p>Sem pendências identificadas nas fontes; revise a cobertura de cada componente.</p>:<ul>{data.issues.map((item,index)=><li key={item.key||index}>{item.key&&<strong>{item.key} · </strong>}{item.codes.map(c=>issueLabels[c]||c.replaceAll('_',' ')).join('; ')} {item.key&&item.source_fingerprint&&<><button type="button" onClick={()=>setIssue(item)}>Revisar reconhecimento de {item.key}</button> <a href={item.origin?sourceHref(item.origin):'/app#finance-plan'}>Abrir origem #{item.source_id}</a> {item.category_id&&<a href={sourceHref({route:'finance-plan',id:item.category_id})}>Revisar classificação da categoria #{item.category_id}</a>}</>}</li>)}</ul>}</section>
 <button type="button" onClick={()=>setReview(true)}>Registrar revisão deste período</button>
 </>}
 </section>
 <DreReviewHistory period={period} version={version}/>
 {issue&&data&&<RecognitionReview issue={issue} close={()=>setIssue(null)} done={refresh}/>}
 {(coverage||review)&&data&&<EvidenceReview line={coverage} data={data} close={()=>{setCoverage(null);setReview(false)}} done={refresh}/>}
 </>;
}
function RecognitionReview({issue,close,done}:{issue:Issue;close:()=>void;done:()=>void}){
 const [economicDate,setEconomicDate]=useState(localDate()),[reason,setReason]=useState(''),[evidence,setEvidence]=useState(''),[line,setLine]=useState(''),[decision,setDecision]=useState('recognize');
 const key=useRef(crypto.randomUUID());
 return <Modal title="Revisar fato econômico existente" close={close}><p>{issue.key} · {issue.amount_cents===undefined?'—':money(issue.amount_cents)}. Esta revisão não cria receita ou despesa.</p><Form cancel={close} submit="Confirmar revisão" onSubmit={async()=>{await api('/finance/dre/recognition-review','POST',{source_key:issue.key,decision,economic_date:economicDate||null,evidence_kind:evidence,line_code:line||null,expected_revision:issue.recognition_revision||0,source_fingerprint:issue.source_fingerprint,request_key:key.current,reason});done()}}>
 <Field label="Decisão"><select value={decision} onChange={e=>setDecision(e.target.value)}><option value="recognize">Reconhecimento comprovado</option><option value="pending">Manter pendente</option><option value="not_applicable">Fora do resultado, com justificativa</option></select></Field>
 <SilexDatePicker label="Data econômica comprovada" value={economicDate} onChange={setEconomicDate} required/>
 <Field label="Tipo de evidência *"><input required minLength={3} maxLength={100} value={evidence} onChange={e=>setEvidence(e.target.value)}/></Field>
 {issue.source_type==='payment'&&<Field label="Natureza econômica do encargo *"><select required value={line} onChange={e=>setLine(e.target.value)}><option value="">Selecione</option>{base.map(c=><option key={c} value={c}>{names[c]}</option>)}</select></Field>}
 <Field label="Justificativa e evidência *"><textarea required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></Field></Form></Modal>;
}
function EvidenceReview({line,data,close,done}:{line:string|null;data:Report;close:()=>void;done:()=>void}){
 const [reason,setReason]=useState(''),[kind,setKind]=useState('complete');
 return <Modal title={line?'Revisar cobertura de '+line:'Registrar revisão do período'} close={close}><Notice tone="info">Confirme somente com evidência. Ausência de cadastro não comprova que um custo ou tributo seja zero. A revisão fica vinculada à versão atual das fontes.</Notice><Form cancel={close} submit="Confirmar evidência" onSubmit={async()=>{await api(line?'/finance/dre/component-assertions':'/finance/dre/period-reviews','POST',{start:data.start,end:data.end,source_fingerprint:data.source_fingerprint,report_fingerprint:data.report_fingerprint,reason,...(line?{line_code:line,assertion_kind:kind}:{})});done()}}>{line&&<Field label="Situação comprovada do componente"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="complete">Componente completo, inclusive zero comprovado</option><option value="not_applicable">Não aplicável, com justificativa</option></select></Field>}<Field label="Motivo e evidência *"><textarea required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></Field><Field label="Confirmo a revisão das fontes e a responsabilidade pela declaração"><input type="checkbox" required/></Field></Form></Modal>;
}

type Mapping={id:number;category_id:number;subcategory_id:number|null;line_code:string;valid_from:string;valid_to:string;revision:number;reason:string};
export function DreMappingEditor({categoryId,subcategoryId}:{categoryId:number;subcategoryId?:number}){
 const [version,setVersion]=useState(0),[line,setLine]=useState('RB'),[from,setFrom]=useState(localDate()),[to,setTo]=useState('2099-12-31'),[reason,setReason]=useState(''),[prior,setPrior]=useState<Mapping|null>(null),[preview,setPreview]=useState<{preview_token:string;affected_sources:number;affected_principal_cents:number;periods:string[];previous:Mapping|null;proposed:{line_code:string}}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 const pending=useRef(false), mappings=useLoad<Mapping[]>('/finance/dre/mappings',version);
 const targetRows=mappings.data?.filter(r=>r.category_id===categoryId&&r.subcategory_id===(subcategoryId||null))||[];
 const values={category_id:categoryId,subcategory_id:subcategoryId||null,line_code:line,valid_from:from,valid_to:to,reason,expected_revision:Math.max(0,...targetRows.map(r=>r.revision)),supersedes_id:prior?.id||null};
 const changed=()=>{setPreview(null);setSaved(false)};
 async function act(confirm=false){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{if(!reason.trim()||reason.trim().length<5)throw new Error('Informe motivo e evidência com ao menos cinco caracteres.');if(confirm){await api('/finance/dre/mappings','POST',{...values,preview_token:preview?.preview_token});setPreview(null);setPrior(null);setSaved(true);setVersion(v=>v+1)}else setPreview(await api('/finance/dre/mappings/preview','POST',values))}catch(e){setError((e as Error).message)}finally{pending.current=false;setBusy(false)}}
 return <><LoadFeedback resource={mappings} label="mapeamentos DRE"/><fieldset disabled={busy||mappings.loading||!!mappings.error}><legend>Classificação DRE versionada</legend>{error&&<Notice>{error}</Notice>}{saved&&<p role="status">Classificação registrada com histórico.</p>}
 <Field label="Revisão a substituir"><select value={prior?.id||''} onChange={e=>{const row=targetRows.find(r=>r.id===Number(e.target.value))||null;setPrior(row);if(row){setFrom(row.valid_from);setTo(row.valid_to);setLine(row.line_code)}changed()}}><option value="">Nova vigência sem sobreposição</option>{targetRows.map(r=><option key={r.id} value={r.id}>Versão {r.revision}: {dateOnly(r.valid_from)} a {dateOnly(r.valid_to)}</option>)}</select></Field>
 <div className="form-grid"><Field label="Rubrica DRE"><select value={line} onChange={e=>{setLine(e.target.value);changed()}}>{base.map(c=><option key={c} value={c}>{names[c]}</option>)}<option value="outside_dre">Fora da DRE, com justificativa</option></select></Field><SilexDatePicker label="Vigência inicial da DRE" value={from} onChange={v=>{setFrom(v);changed()}}/><SilexDatePicker label="Vigência final da DRE" value={to} onChange={v=>{setTo(v);changed()}}/></div>
 <Field label="Motivo da classificação DRE"><textarea minLength={5} maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);changed()}}/></Field>
 <button type="button" onClick={()=>void act()}>Prévia do impacto</button>{preview&&<><p role="status">{preview.previous?.line_code||'Sem mapeamento'} → {preview.proposed.line_code} · {preview.affected_sources} fontes potencialmente afetadas · {money(preview.affected_principal_cents)} de principal · períodos: {preview.periods.join(', ')||'nenhum'}. Registros originais não serão reescritos.</p><button type="button" onClick={()=>void act(true)}>Confirmar classificação revisada</button></>}
 </fieldset></>;
}

function DreDetails({line,period}:{line:string;period:Period}){
 const [page,setPage]=useState(1);
 const result=useLoad<{items:Fact[];total:number;page:number;page_size:number}>('/finance/dre/items?'+query({...period,line,page}));
 return <section className="dre-screen-detail"><h3>Fontes de {names[line]}</h3><Table headers={['Origem','Rubrica','Data econômica','Valor','Evidência']} loading={result.loading} error={result.error} onRetry={result.reload} empty={!!result.data&&!result.data.items.length}>{result.data?.items.map(f=><tr key={f.key}><td>{f.origin?<a href={sourceHref(f.origin)}>{f.key}</a>:f.key}</td><td>{names[f.dre_line_code]}</td><td>{dateOnly(f.economic_date)}</td><td>{money(f.amount_cents)}</td><td>{f.recognition_basis}</td></tr>)}</Table><Pagination data={result.data} onPage={setPage}/></section>;
}

function DreReviewHistory({period,version}:{period:Period;version:number}){
 const reviews=useLoad<{id:number;recorded_at:string;reason:string}[]>('/finance/dre/period-reviews?'+query(period),version),[selected,setSelected]=useState<number|null>(null);
 return <section className="panel"><h2>Revisões documentadas do período</h2><LoadFeedback resource={reviews} label="revisões DRE"/>{reviews.data?.map(r=><p key={r.id}>#{r.id} · {r.reason} <button type="button" onClick={()=>setSelected(r.id)}>Consultar revisão #{r.id}</button></p>)}{reviews.data?.length===0&&<p>Nenhuma revisão documentada por esta identidade neste período.</p>}{selected!==null&&<DreSnapshot id={selected} close={()=>setSelected(null)}/>}</section>;
}
function DreSnapshot({id,close}:{id:number;close:()=>void}){
 const result=useLoad<{snapshot:Report;source_changed:boolean}>('/finance/dre/period-reviews/'+id);
 return <Modal title={'Revisão histórica #'+id} close={close}><LoadFeedback resource={result} label="revisão histórica"/>{result.data&&<><p>{dateOnly(result.data.snapshot.start)} a {dateOnly(result.data.snapshot.end)} · Dados preservados na revisão, sem reinterpretação.</p>{result.data.source_changed&&<Notice tone="info">As fontes atuais mudaram. Este demonstrativo preserva a versão documentada.</Notice>}<Table headers={['Rubrica','Cobertura','Valor final']} loading={false} empty={false}>{result.data.snapshot.lines.map(line=><tr key={line.code}><th scope="row">{names[line.code]}</th><td>{statuses[line.coverage_status]}</td><td>{line.final_amount_cents===null?'—':money(line.final_amount_cents)}</td></tr>)}</Table></>}</Modal>;
}
