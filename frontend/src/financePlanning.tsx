import {parseMoney} from "./moneyInput";
import {readDrePeriod,dreHref} from "./dreNavigation";
import { DreReport } from "./dre";
import { hasTransport } from "./capabilities";
import type { User } from "./types";
import { SilexMonthField } from "./SilexMonthField";
import { SilexDatePicker } from "./SilexDatePicker";
import { useEffect, useRef, useState } from 'react';
import { api, downloadCsv, apiRequest, ApiError, query } from './api';
import { dateTime, dateOnly, localDate, money } from './format';
import type { Account, Category, Entry, Page, Subcategory } from './types';
import { LoadFeedback, ExportButton, Field, Form, Modal, Notice, PageTitle, Pagination, Table, useLoad } from './ui';
import { Plus } from 'lucide-react';
import { LedgerTable } from './ledgerPresentation';
import './reconciliation.css';
import './financialDashboard.css';
import { reportGroupDate } from './reportDates';

type StatementItem={id:number;fitid:string;posted_date:string;amount_cents:number;name:string;memo:string;status:string;matched_entry_id:number|null;matched_description:string|null;duplicate_of_id:number|null};
type Statement={id:number;account_id:number;account_name:string;original_name:string;status:string;count:number;pending:number;duplicates:number;items:StatementItem[]};
type StatementList=Page<Statement>;
type Candidate={entry:Entry;difference_cents:number;same_date:boolean};
type ReportDef={id:string;name:string;source:string;date_basis:string};
type ReportPage={id:string;name:string;items:Record<string,unknown>[];total:number;page:number;page_size:number};
type Budget={id:number;year:number;month:number;category_id:number;category_name:string;subcategory_id:number|null;subcategory_name:string;target_cents:number;actual_cents:number;remaining_cents:number;percent_used:number;notes:string};
const classificationLabels:Record<string,string>={operating:'Operacional',investment:'Investimento',financing:'Financiamento'};

/** Never display server diagnostics/HTML or raw network/parser errors in OFX feedback. */
function ofxFailure(error:unknown, fallback:string){
 if(error instanceof ApiError){
  if(error.status===401)return 'Sua sessão terminou. Entre novamente.';
  if(error.status===403)return 'Você não tem permissão para realizar esta operação.';
  if(error.status===404)return 'O extrato ou movimento não está disponível. Consulte o histórico novamente.';
  if(error.status===400||error.status===422)return 'Não foi possível processar os dados. Confira o arquivo OFX e os campos informados.';
  if(error.status>=500)return 'O serviço de conciliação está indisponível. '+fallback;
 }
 return fallback;
}
export function FinanceReconciliation(){
 const [account,setAccount]=useState(''),[version,setVersion]=useState(0),[importPage,setImportPage]=useState(1),[statement,setStatement]=useState<Statement|null>(null),[candidateItem,setCandidateItem]=useState<StatementItem|null>(null),[error,setError]=useState(''),[statementError,setStatementError]=useState(''),[busy,setBusy]=useState<'upload'|'statement'|null>(null),[resolving,setResolving]=useState(false);
 const operationPending=useRef(false),resolvePending=useRef(false);
 const accounts=useLoad<Account[]>('/accounts',version),imports=useLoad<StatementList>('/finance/ofx/imports?'+query({page:importPage,page_size:50}),version);
 const banks=accounts.data?.filter(a=>a.active&&a.kind==='bank')||[];
 async function importFile(file:File|null){
  if(!file||operationPending.current||resolvePending.current)return;
  setError('');
  if(file.size>10*1024*1024){setError('OFX deve ter até 10 MB.');return;}
  if(accounts.loading||accounts.error||!banks.some(a=>String(a.id)===account)){setError('Selecione a conta bancária do extrato.');return;}
  operationPending.current=true;setBusy('upload');
  try{
   const value=await apiRequest<Statement>('/finance/ofx/imports?'+query({account_id:Number(account)}),{method:'POST',headers:{'Content-Type':'application/x-ofx','X-Statement-Name':encodeURIComponent(file.name)},body:file});
   setStatement(value);setStatementError('');setVersion(v=>v+1);
  }catch(e){setError(ofxFailure(e,'Não foi possível confirmar a importação. Confira o histórico antes de tentar novamente.'));}
  finally{operationPending.current=false;setBusy(null);}
 }
 async function reloadStatement(id:number){
  if(operationPending.current)return false;
  operationPending.current=true;setBusy('statement');setStatementError('');
  try{const value=await api<Statement>(`/finance/ofx/imports/${id}`);setStatement(value);setVersion(v=>v+1);return true;}
  catch(e){setStatementError(ofxFailure(e,'Não foi possível atualizar o extrato. Abra-o novamente pelo histórico.'));return false;}
  finally{operationPending.current=false;setBusy(null);}
 }
 function showCandidates(item:StatementItem){if(!operationPending.current&&!resolvePending.current)setCandidateItem(item);}
 function resolvePendingChange(value:boolean){resolvePending.current=value;setResolving(value);if(value)setError('');}
 return <div className="silex-reconciliation"><PageTitle title="Conciliação Bancária" subtitle="Importe seu extrato OFX, confira duplicados e confirme cada associação manualmente."/>
  {error&&<Notice>{error}</Notice>}
  <section className="panel reconciliation-import"><div className="panel-heading"><h2>Importar extrato OFX</h2></div><div className="form-grid ofx-import-form">
   {accounts.loading&&<p role="status">Carregando contas bancárias…</p>}
   {accounts.error&&<Notice>Não foi possível carregar as contas bancárias. Reabra a tela para tentar novamente.</Notice>}
   {!accounts.loading&&!accounts.error&&!banks.length&&<p role="status">Nenhuma conta bancária ativa disponível.</p>}
   <Field label="Conta bancária *"><select disabled={!!busy||resolving||accounts.loading||!!accounts.error} value={account} onChange={e=>setAccount(e.target.value)}><option value="">Selecione a conta</option>{banks.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="Arquivo OFX *"><input type="file" accept=".ofx,.qfx,application/x-ofx" onChange={e=>{const file=e.currentTarget.files?.[0]||null;e.currentTarget.value='';void importFile(file);}} disabled={!!busy||resolving||accounts.loading||!!accounts.error}/></Field><p className="help">Até 10 MB. Confira o extrato e confirme os movimentos antes de registrar as baixas.</p></div></section>
  {(busy||resolving)&&<p role="status">{busy==='upload'?'Importando extrato…':busy==='statement'?'Carregando extrato…':'Concluindo conciliação…'}</p>}
  {statementError&&<Notice>{statementError}</Notice>}
  {statement&&!statementError&&busy!=='statement'&&<section className="panel reconciliation-statement"><div className="panel-heading"><div><h2>{statement.original_name}</h2><p>{statement.account_name} · {statement.count} transações · {statement.pending} pendentes · {statement.duplicates} duplicadas</p></div><span className={`reconciliation-state state-${statement.status}`}>{statement.status==='complete'?'Revisado':'Prévia'}</span></div><StatementRows statement={statement} choose={showCandidates} disabled={!!busy||resolving}/></section>}
  <section className="panel reconciliation-history"><div className="panel-heading"><h2>Importações anteriores</h2></div>{imports.error?<div><Notice>Não foi possível carregar o histórico de importações.</Notice><button type="button" disabled={imports.loading} onClick={imports.reload}>Tentar novamente</button></div>:<><LedgerTable headers={['Arquivo / conta','Situação','Transações','Pendentes / duplicadas','Ação']} loading={imports.loading} error={imports.error} onRetry={imports.reload} empty={!imports.data?.items.length}>{imports.data?.items.map(row=><tr key={row.id}><td><strong>{row.original_name}</strong><small>{row.account_name}</small></td><td><span className={`reconciliation-state state-${row.status}`}>{row.status==='complete'?'Revisado':'Prévia'}</span></td><td>{row.count}</td><td>{row.pending} / {row.duplicates}</td><td><button disabled={!!busy||resolving} onClick={()=>{if(!resolvePending.current)void reloadStatement(row.id)}}>Revisar</button></td></tr>)}</LedgerTable>{!imports.loading&&<Pagination data={imports.data} onPage={setImportPage}/>}</>}</section>
  {candidateItem&&statement&&<OfxResolveForm item={candidateItem} statementId={statement.id} onPendingChange={resolvePendingChange} onFailure={setError} close={()=>setCandidateItem(null)} done={async()=>{if(await reloadStatement(statement.id))setCandidateItem(current=>current?.id===candidateItem.id?null:current);else throw new Error('Não foi possível atualizar o extrato.');}}/>}
 </div>;
}
function StatementRows({statement,choose,disabled=false}:{statement:Statement;choose:(item:StatementItem)=>void;disabled?:boolean}){
 return <LedgerTable headers={['Data','FITID / histórico','Valor','Situação','Vínculo / ação']} empty={!statement.items.length}>{statement.items.map(item=><tr key={item.id}><td>{dateOnly(item.posted_date)}</td><td><strong>{item.name||item.memo||'Movimento bancário'}</strong><small>FITID {item.fitid} · {item.memo}</small></td><td className={`numeric ${item.amount_cents>0?'positive':'negative'}`}>{money(item.amount_cents)}</td><td><span className={`reconciliation-state state-${item.status}`}>{item.status==='duplicate'?`Duplicado #${item.duplicate_of_id}`:item.status==='posted'?'Lançado':item.status==='matched'?'Conciliado':item.status==='ignored'?'Ignorado':'Pendente'}</span></td><td>{item.matched_description||((item.status==='pending')&&<button disabled={disabled} onClick={()=>choose(item)}>Revisar / confirmar</button>)}</td></tr>)}</LedgerTable>;
}
function OfxNewFields({direction,category,setCategory,subcategory,setSubcategory,party,setParty,onReadyChange}:{direction:string;category:string;setCategory:(v:string)=>void;subcategory:string;setSubcategory:(v:string)=>void;party:string;setParty:(v:string)=>void;onReadyChange:(ready:boolean)=>void}){
 const categories=useLoad<Category[]>('/categories'),subs=useLoad<Subcategory[]>('/subcategories'),people=useLoad<Page<any>>(direction==='income'?'/customers?active=true&page_size=100':'/suppliers?active=true&page_size=100');
 const loading=categories.loading||subs.loading||people.loading,failed=!!(categories.error||subs.error||people.error);
 const ready=!loading&&!failed&&!!categories.data&&!!subs.data&&!!people.data;
 useEffect(()=>{onReadyChange(ready);},[ready,onReadyChange]);
 return <>{loading&&<p role="status">Carregando dados do lançamento…</p>}{failed&&<Notice>Não foi possível carregar categorias, subcategorias ou beneficiários. Feche e reabra a conciliação para tentar novamente.</Notice>}<div className="form-grid"><Field label="Categoria *"><select disabled={!ready} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecione</option>{categories.data?.filter(c=>c.active&&(c.direction==='both'||c.direction===direction)).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Subcategoria *"><select disabled={!ready} value={subcategory} onChange={e=>setSubcategory(e.target.value)}><option value="">Selecione</option>{subs.data?.filter(s=>s.active&&String(s.category_id)===category).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field><Field label={direction==='income'?'Cliente':'Fornecedor'}><select disabled={!ready} value={party} onChange={e=>setParty(e.target.value)}><option value="">Não informado</option>{people.data?.items?.map((p:any)=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field></div></>;
}

export {FinanceOverview} from "./financialOverview";

export function FinanceReports({user,view,navigate}:{user:User;view:'dre'|'legacy';navigate:(id:string)=>void}){
 const today=localDate(),initial=readDrePeriod(typeof location==="undefined"?"":location.search);
 const [selected,setSelected]=useState('cash-monthly'),[savedPeriod,setSavedPeriod]=useState(initial||{start:today.slice(0,7)+'-01',end:today});
 // The URL is authoritative on history traversal; unsubmitted controls never replace it.
 const period=(view==='dre'?readDrePeriod(location.search):null)||savedPeriod;
 useEffect(()=>{if(view==='dre')history.replaceState(history.state,'',dreHref(period));else {const u=new URL(location.href);['dre_view','dre_start','dre_end'].forEach(k=>u.searchParams.delete(k));history.replaceState(history.state,'',u.pathname+u.search+u.hash)}},[view,period.start,period.end]);
 return view==='dre'?<DreReport period={period} onPeriod={p=>{history.replaceState(history.state,'',dreHref(p));setSavedPeriod(p)}} onLegacy={id=>{setSelected(id);setSavedPeriod(period);navigate('finance-reports')}}/>:<LegacyFinanceReports key={selected} user={user} initialReport={selected} initialPeriod={period} onPeriodApplied={setSavedPeriod} onDre={p=>{setSavedPeriod(p);navigate('finance-dre')}}/>;
}
function LegacyFinanceReports({user,initialReport,initialPeriod,onPeriodApplied,onDre}:{user:User;initialReport:string;initialPeriod:{start:string;end:string};onPeriodApplied:(p:{start:string;end:string})=>void;onDre:(p:{start:string;end:string})=>void}){
 const now=localDate(),[report,setReport]=useState(initialReport),[from,setFrom]=useState(initialPeriod.start),[to,setTo]=useState(initialPeriod.end),[account,setAccount]=useState(''),[category,setCategory]=useState(''),[supplierKind,setSupplierKind]=useState(''),[filters,setFilters]=useState({start:initialPeriod.start,end:initialPeriod.end,account_id:'',category_id:'',supplier_kind:''}),[page,setPage]=useState(1),[budgetMonth,setBudgetMonth]=useState(now.slice(0,7)),[showBudget,setShowBudget]=useState(false),[version,setVersion]=useState(0),[budgetForm,setBudgetForm]=useState(false);
 const catalog=useLoad<ReportDef[]>('/finance/reports/catalog'),accounts=useLoad<Account[]>('/accounts'),categories=useLoad<Category[]>('/categories'),result=useLoad<ReportPage>('/finance/reports/'+report+'?'+query({...filters,page}),version),budget=useLoad<Budget[]>('/finance/budgets?'+query({year:Number(budgetMonth.slice(0,4)),month:Number(budgetMonth.slice(5,7)),supplier_kind:filters.supplier_kind}),version);
 const reportData=!result.loading&&!result.error?result.data:null;
 const budgetData=!budget.loading&&!budget.error?budget.data:null;
 const rows=reportData?.items||[],fields=Object.keys(rows[0]||{}),rowsQuery=query({...filters,page:1,page_size:100});
 const [budgetError,setBudgetError]=useState(''),[deactivating,setDeactivating]=useState<number|null>(null);
 const budgetPending=useRef(false);
 async function deactivateBudget(id:number){
  if(budgetPending.current)return;
  budgetPending.current=true;setDeactivating(id);setBudgetError('');
  try{await api(`/finance/budgets/${id}`,'DELETE');setVersion(v=>v+1);}
  catch(e){setBudgetError((e as Error).message);}
  finally{budgetPending.current=false;setDeactivating(null);}
 }

 return <><PageTitle title="Relatórios Financeiros" subtitle={`${catalog.data?.length||26} relatórios do financeiro, com filtros e exportação CSV.`}/>
  <form className="panel toolbar report-filters" onSubmit={e=>{e.preventDefault();onPeriodApplied({start:from,end:to});setFilters({start:from,end:to,account_id:report==='budget-actual'?'':account,category_id:category,supplier_kind:supplierKind});setPage(1);setVersion(v=>v+1);}}><Field label="Relatório"><select value={report} onChange={e=>{const next=e.target.value;if(next==='dre'){onDre({start:filters.start,end:filters.end});return;}setReport(next);setPage(1);if(next==='budget-actual'){setAccount('');setFilters(current=>({...current,account_id:''}));}}}><option value="dre">DRE gerencial</option>{catalog.data?.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><SilexDatePicker label="De" value={from} onChange={(value) => setFrom(value)} /><SilexDatePicker label="Até" value={to} onChange={(value) => setTo(value)} /><Field label="Conta"><select disabled={report==='budget-actual'} value={account} onChange={e=>setAccount(e.target.value)}><option value="">Todas</option>{accounts.data?.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></Field><Field label="Categoria"><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas</option>{categories.data?.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Tipo de beneficiário"><select value={supplierKind} onChange={e=>setSupplierKind(e.target.value)}><option value="">Todos</option><option value="supplier">Fornecedor</option><option value="day_worker">Diarista</option>{hasTransport(user)&&<option value="subcontracted_freight">Frete subcontratado</option>}</select></Field><button className="primary">Gerar relatório</button></form>
  <LoadFeedback resource={catalog} label="catálogo de relatórios"/><LoadFeedback resource={accounts} label="contas dos relatórios"/><LoadFeedback resource={categories} label="categorias dos relatórios"/>
  <p className="help" aria-label="Base do período">Período por {({due:'vencimento',competence:'competência',posting:'lançamento'} as Record<string,string>)[catalog.data?.find(item=>item.id===report)?.date_basis||'posting']}.{report==='budget-actual'&&' Orçamento global por categoria, sem divisão por conta; meses que interceptam o período.'}</p>
  {result.error&&<Notice>{result.error}</Notice>}<section className={`panel finance-report-print${fields.length>8?' finance-report-wide':''}`}><div className="panel-heading"><div><h2>{reportData?.name||catalog.data?.find(item=>item.id===report)?.name||'Relatório'}</h2><p>{dateOnly(filters.start)} a {dateOnly(filters.end)} · {reportData?`${reportData.total} registros`:result.loading?'Consultando dados…':'Dados indisponíveis'}</p></div><ExportButton onClick={()=>downloadCsv('/finance/reports/'+report+'.csv?'+rowsQuery,'financeiro-'+report+'.csv')}/><button disabled={result.loading||!!result.error||!result.data} onClick={()=>window.print()}>Imprimir</button></div>{reportData&&<p className="finance-report-print-note">Silex Business · Página {result.data?.page||1} de {Math.max(1,Math.ceil((result.data?.total||0)/(result.data?.page_size||20)))} · {rows.length} registros nesta página · Impressão dos resultados exibidos.</p>}{reportData?<Table headers={fields.map(key=>reportColumn(key,report))} loading={result.loading} error={result.error} onRetry={result.reload} empty={!rows.length}>{rows.map((row,index)=><tr key={index}>{fields.map(key=><td key={key} data-report-money={key.endsWith('_cents')||undefined}>{formatReportValue(key,row[key],report)}</td>)}</tr>)}</Table>:<p role={result.loading?'status':undefined}>{result.loading?'Carregando relatório…':'Dados do relatório indisponíveis.'}</p>}{fields.length>8&&<ReportPrintColumns fields={fields} rows={rows} report={report} name={result.data?.name||'Relatório'} page={result.data?.page||1} pageSize={result.data?.page_size||20}/>}<Pagination data={reportData} onPage={setPage}/></section>
  <section className="panel"><div className="panel-heading"><div><h2>Orçamento mensal por categoria</h2><p>Despesas pagas na competência escolhida, comparadas à meta cadastrada.</p></div><form className="silex-budget-period" onSubmit={e=>{e.preventDefault();setBudgetForm(true)}}><SilexMonthField label="Mês" min="2000-01" max="2200-12" value={budgetMonth} onChange={setBudgetMonth} /><button type="submit" className="primary"><Plus size={17}/>Nova meta</button></form></div>{budgetError&&<Notice>{budgetError}</Notice>}{budget.error&&<Notice>{budget.error}</Notice>}{budgetData?<Table headers={['Categoria / subcategoria','Meta','Realizado','Disponível','Uso']} loading={budget.loading} error={budget.error} onRetry={budget.reload} empty={!budgetData.length}>{budgetData.map(row=><tr key={row.id}><td>{row.category_name}<small>{row.subcategory_name}</small></td><td>{money(row.target_cents)}</td><td>{money(row.actual_cents)}</td><td className={row.remaining_cents<0?'negative':'positive'}>{money(row.remaining_cents)}</td><td>{row.percent_used}% <button className="danger" disabled={deactivating!==null} onClick={()=>void deactivateBudget(row.id)}>{deactivating===row.id?'Desativando…':'Desativar'}</button></td></tr>)}</Table>:<p role={budget.loading?'status':undefined}>{budget.loading?'Carregando orçamento…':'Dados do orçamento indisponíveis.'}</p>}</section>
  {budgetForm&&<BudgetForm year={Number(budgetMonth.slice(0,4))} month={Number(budgetMonth.slice(5,7))} close={()=>setBudgetForm(false)} done={()=>{setBudgetForm(false);setVersion(v=>v+1)}}/>}
 </>;
}
/** Wide API records keep every field; print the same loaded rows in readable column bands. */
function ReportPrintColumns({
  fields,
  rows,
  report,
  name,
  page,
  pageSize,
}: {
  fields: string[];
  rows: Record<string, unknown>[];
  report: string;
  name: string;
  page: number;
  pageSize: number;
}) {
  const bands = Array.from(
    { length: Math.ceil(fields.length / 6) },
    (_, index) => fields.slice(index * 6, index * 6 + 6),
  );
  return (
    <div className="finance-report-column-bands">
      {bands.map((band, index) => (
        <section className="finance-report-column-band" key={index}>
          <h3>
            {name} · Colunas {index * 6 + 1}–
            {Math.min((index + 1) * 6, fields.length)} de {fields.length}
          </h3>
          <table>
            <thead>
              <tr>
                <th scope="col" className="finance-report-row-number">
                  Linha
                </th>
                {band.map((key) => (
                  <th scope="col" key={key}>
                    {reportColumn(key,report)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th scope="row">{(page - 1) * pageSize + rowIndex + 1}</th>
                  {band.map((key) => (
                    <td
                      key={key}
                      data-report-money={key.endsWith("_cents") || undefined}
                    >
                      {formatReportValue(key, row[key], report)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
const reportLabels:Record<string,string>={original_name:'Nome do arquivo',media_type:'Tipo de arquivo',size_bytes:'Tamanho em bytes',cash_session_id:'ID do caixa',finance_entry_id:'ID do título',account_id:'ID da conta',category_id:'ID da categoria',customer_id:'ID do cliente',sale_id:'ID da venda',service_order_id:'ID do pedido',service_order_cost_id:'ID do custo contratado',user_id:'ID do responsável',created_at:'Incluído em',canceled_at:'Cancelado em',cancel_reason:'Motivo do cancelamento',subcategory_id:'ID da subcategoria',supplier_id:'ID do beneficiário',request_key:'Chave da solicitação',request_hash:'Verificação da solicitação',recurrence_id:'ID da recorrência',recurrence_index:'Parcela da recorrência',recurrence_total:'Total de parcelas',recurrence_frequency:'Frequência',classification:'Classificação',active:'Ativo',payments:'Baixas',attachments:'Comprovantes',id:'ID',entry_id:'ID do título',payment_id:'ID da baixa',description:'Histórico',direction:'Tipo',group:'Agrupamento',posting_date:'Data de lançamento',competence_date:'Competência',due_date:'Vencimento',settled_at:'Quitado em',document:'Documento',category_name:'Categoria',subcategory_name:'Subcategoria',account_name:'Conta',customer_name:'Cliente',supplier_name:'Fornecedor',method:'Forma de pagamento',origin:'Origem',status:'Situação',amount_cents:'Valor líquido',principal_cents:'Principal',interest_cents:'Juros',fine_cents:'Multa',discount_cents:'Desconto',income_cents:'Receitas',expense_cents:'Despesas',net_cents:'Saldo',count:'Quantidade',reversal_of:'ID da baixa estornada',target_cents:'Meta',actual_cents:'Realizado',remaining_cents:'Disponível',year:'Ano',month:'Mês',percent_used:'Percentual usado',notes:'Observações'};
export function reportColumn(key:string,report=""){if(key==='remaining_cents')return report==='budget-actual'?'Disponível':'Saldo pendente';return reportLabels[key]||key.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase())}
export function formatReportValue(key:string,value:unknown,report:string):string{const temporal=key.endsWith('_date')||key.endsWith('_at')||key==='group'&&['cash-daily','settlements-daily'].includes(report);if(value===null||value===undefined)return '—';if(Array.isArray(value))return value.length?value.map((item,index)=>`#${index+1} ${formatReportValue(key,item,report)}`).join(' · '):'—';if(typeof value==='object')return Object.entries(value).map(([field,item])=>`${reportColumn(field,report)}: ${formatReportValue(field,item,report)}`).join(' · ')||'—';if(key.endsWith('_cents')&&typeof value==='number')return money(value);if(typeof value==='boolean')return value?'Sim':'Não';if(key==='group'&&typeof value==='string'){const label=reportGroupDate(report,value);if(label!==value)return label;}if(temporal&&typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value))return dateTime(value);if(temporal&&typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return dateOnly(value);if(key==='direction'&&value==='income')return 'Receita';if(key==='direction'&&value==='expense')return 'Despesa';if(key==='status'&&value==='open')return 'Em aberto';if(key==='status'&&value==='partial')return 'Parcial';if(key==='status'&&value==='paid')return 'Quitado';if(key==='status'&&value==='canceled')return 'Cancelado';if(key==='method')return ({cash:'Dinheiro',pix:'Pix',card:'Cartão',ofx:'OFX'} as Record<string,string>)[String(value)]||String(value);if(key==='classification')return classificationLabels[String(value)]||String(value);return String(value)}
function BudgetForm({year,month,close,done}:{year:number;month:number;close:()=>void;done:()=>void}){
 const [category,setCategory]=useState(''),[subcategory,setSubcategory]=useState(''),[target,setTarget]=useState(''),[notes,setNotes]=useState('');const categories=useLoad<Category[]>('/categories'),subs=useLoad<Subcategory[]>('/subcategories');
 return <Modal title="Cadastrar orçamento mensal" close={close}><LoadFeedback resource={categories} label="categorias"/><LoadFeedback resource={subs} label="subcategorias"/><Form cancel={close} onSubmit={async()=>{if(categories.loading||categories.error||subs.loading||subs.error)throw new Error('Consulte categorias e subcategorias antes de salvar a meta.');const cents=parseMoney(target);await api('/finance/budgets','POST',{year,month,category_id:Number(category),subcategory_id:subcategory?Number(subcategory):null,target_cents:cents,notes});done()}}><div className="form-grid"><SilexMonthField label="Mês" readOnly value={`${year}-${String(month).padStart(2,'0')}`} /><Field label="Categoria *"><select required value={category} onChange={e=>{setCategory(e.target.value);setSubcategory('')}}><option value="">Selecione</option>{categories.data?.filter(c=>c.active&&(c.direction==='both'||c.direction==='expense')).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Subcategoria"><select value={subcategory} onChange={e=>setSubcategory(e.target.value)}><option value="">Todas da categoria</option>{subs.data?.filter(s=>s.active&&String(s.category_id)===category).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field><Field label="Meta mensal (R$) *"><input required inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)}/></Field><Field label="Observações"><input maxLength={300} value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div></Form></Modal>;
}
function OfxResolveForm({item,statementId,close,done,onPendingChange,onFailure}:{item:StatementItem;statementId:number;close:()=>void;done:()=>Promise<void>;onPendingChange:(value:boolean)=>void;onFailure:(message:string)=>void}){
 const [mode,setMode]=useState('match'),[entry,setEntry]=useState(''),[subcategory,setSubcategory]=useState(''),[category,setCategory]=useState(''),[party,setParty]=useState(''),[principal,setPrincipal]=useState(''),[interest,setInterest]=useState('0,00'),[fine,setFine]=useState('0,00'),[discount,setDiscount]=useState('0,00'),[reason,setReason]=useState('');
 const direction=item.amount_cents>0?'income':'expense',candidates=useLoad<Candidate[]>(`/finance/ofx/imports/${statementId}/items/${item.id}/suggestions`);
 const selected=!candidates.loading&&!candidates.error?candidates.data?.find(c=>String(c.entry.id)===entry):undefined;
 const [busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[committed,setCommitted]=useState(false),[newFieldsReady,setNewFieldsReady]=useState(false);
 const operationPending=useRef(false),confirmed=useRef(false);
 async function resolve(body?:Record<string,unknown>){
  if(operationPending.current)return;
  operationPending.current=true;setBusy(true);onPendingChange(true);setActionError('');
  try{
   if(!confirmed.current){
    try{await api(`/finance/ofx/imports/${statementId}/items/${item.id}/confirm`,'POST',body);}
    catch(e){const message=ofxFailure(e,'Não foi possível confirmar o resultado. Consulte o extrato antes de repetir a operação.');onFailure(message);throw new Error(message);}
    confirmed.current=true;setCommitted(true);
   }
   try{await done();}
   catch{setActionError('A operação foi confirmada, mas não foi possível atualizar o extrato. Use Atualizar extrato; a operação não será enviada novamente.');}
  }finally{operationPending.current=false;setBusy(false);onPendingChange(false);}
 }

 return <Modal title={`Conferir movimento · ${dateOnly(item.posted_date)}`} close={close} wide><p>{item.name||item.memo} · <strong>{money(item.amount_cents)}</strong></p>{actionError&&<Notice>{actionError}</Notice>}<fieldset disabled={busy} aria-busy={busy}>{committed?<><p role="status">A operação foi confirmada. Atualize o extrato para continuar.</p><Form cancel={close} submit="Atualizar extrato" onSubmit={()=>resolve()}>{null}</Form></>:<><div className="tabs"><button className={mode==='match'?'selected':''} onClick={()=>setMode('match')}>Conciliar título</button><button className={mode==='new'?'selected':''} onClick={()=>{if(mode!=='new'){setNewFieldsReady(false);setMode('new')}}}>Criar lançamento</button></div>
  {mode==='match'?<>{candidates.loading&&<p role="status">Carregando sugestões…</p>}{candidates.error&&<Notice>Não foi possível carregar as sugestões de conciliação. Feche e reabra o movimento para tentar novamente.</Notice>}{!candidates.loading&&!candidates.error&&candidates.data&&!candidates.data.length&&<p className="help">Nenhum título pendente sugerido.</p>}<Field label="Título pendente sugerido"><select disabled={candidates.loading||!!candidates.error} value={entry} onChange={e=>{const value=e.target.value;setEntry(value);const candidate=candidates.data?.find(c=>String(c.entry.id)===value);setPrincipal(candidate?(candidate.entry.remaining_cents/100).toFixed(2).replace('.',','):'')}}><option value="">Selecione um título</option>{candidates.data?.map(c=><option key={c.entry.id} value={c.entry.id}>{c.entry.description} · falta {money(c.entry.remaining_cents)} · diferença {money(c.difference_cents)}</option>)}</select></Field>{selected&&<div className="form-grid"><Field label="Principal (R$)"><input inputMode="decimal" value={principal} onChange={e=>setPrincipal(e.target.value)}/></Field><Field label="Juros (R$)"><input value={interest} onChange={e=>setInterest(e.target.value)}/></Field><Field label="Multa (R$)"><input value={fine} onChange={e=>setFine(e.target.value)}/></Field><Field label="Desconto (R$)"><input value={discount} onChange={e=>setDiscount(e.target.value)}/></Field></div>}</>:<OfxNewFields direction={direction} category={category} setCategory={setCategory} subcategory={subcategory} setSubcategory={setSubcategory} party={party} setParty={setParty} onReadyChange={setNewFieldsReady}/>}
  <Form cancel={close} submit="Confirmar conciliação" onSubmit={async()=>{if(operationPending.current)return;let body:Record<string,unknown>;if(mode==='match'){if(candidates.loading||candidates.error||!candidates.data)throw new Error('As sugestões estão indisponíveis. Reabra o movimento antes de confirmar.');if(!entry||!candidates.data.some(c=>String(c.entry.id)===entry))throw new Error('Selecione um título pendente.');const cents=parseMoney;body={entry_id:Number(entry),principal_cents:principal?cents(principal):undefined,interest_cents:interest?cents(interest):0,fine_cents:fine?cents(fine):0,discount_cents:discount?cents(discount):0};}else{if(!newFieldsReady)throw new Error('Os dados do lançamento estão indisponíveis. Reabra o movimento antes de confirmar.');if(!category||!subcategory)throw new Error('Selecione categoria e subcategoria.');body={create_title:true,category_id:Number(category),subcategory_id:Number(subcategory),[direction==='income'?'customer_id':'supplier_id']:party?Number(party):null};}await resolve(body);}}><p className="help">O pagamento é registrado pela conta bancária selecionada no extrato e pela data informada no OFX.</p></Form>
  <Field label="Motivo para ignorar a linha"><input minLength={3} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Obrigatório para ignorar"/></Field>
  <button className="danger" disabled={reason.trim().length<3} onClick={()=>{if(reason.trim().length<3)return;void resolve({ignore:true,reason:reason.trim()}).catch(e=>setActionError((e as Error).message));}}>Ignorar esta linha</button>
 </>}</fieldset></Modal>;
}
