import { SilexMonthField } from "./SilexMonthField";
import { SilexDatePicker } from "./SilexDatePicker";
import { useState } from 'react';
import { api, query } from './api';
import { dateOnly, localDate, money } from './format';
import type { Account, Category, Entry, Page, Subcategory } from './types';
import { Field, Form, Modal, Notice, PageTitle, Pagination, SummaryCard, Table, useLoad } from './ui';
import { ArrowDownLeft, ArrowUpRight, Scale, Plus } from 'lucide-react';
import { LedgerTable } from './ledgerPresentation';
import './reconciliation.css';
import { financialMonthLabel, MonthlyValuesTable } from './dashboardPresentation';
import './financialDashboard.css';
import { reportGroupDate } from './reportDates';

type StatementItem={id:number;fitid:string;posted_date:string;amount_cents:number;name:string;memo:string;status:string;matched_entry_id:number|null;matched_description:string|null;duplicate_of_id:number|null};
type Statement={id:number;account_id:number;account_name:string;original_name:string;status:string;count:number;pending:number;duplicates:number;items:StatementItem[]};
type StatementList=Page<Statement>;
type Candidate={entry:Entry;difference_cents:number;same_date:boolean};
type ReportDef={id:string;name:string;source:string;date_basis:string};
type ReportPage={id:string;name:string;items:Record<string,unknown>[];total:number;page:number;page_size:number};
type FinanceDash={start:string;end:string;income_cents:number;expense_cents:number;net_cents:number;movement_count:number;accounts:Account[];receivable_open_cents:number;payable_open_cents:number;receivable_overdue_cents:number;payable_overdue_cents:number;monthly:{month:string;income_cents:number;expense_cents:number;net_cents:number}[];result_groups:{classification:string;group:string;direction:string;income_cents:number;expense_cents:number}[];budget_month:string};
type Budget={id:number;year:number;month:number;category_id:number;category_name:string;subcategory_id:number|null;subcategory_name:string;target_cents:number;actual_cents:number;remaining_cents:number;percent_used:number;notes:string};
const classificationLabels:Record<string,string>={operating:'Operacional',investment:'Investimento',financing:'Financiamento'};

export function FinanceReconciliation(){
 const [account,setAccount]=useState(''),[version,setVersion]=useState(0),[importPage,setImportPage]=useState(1),[statement,setStatement]=useState<Statement|null>(null),[candidateItem,setCandidateItem]=useState<StatementItem|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const accounts=useLoad<Account[]>('/accounts',version),imports=useLoad<StatementList>('/finance/ofx/imports?'+query({page:importPage,page_size:50}),version);
 async function importFile(file:File|null){if(!file)return;setError('');if(file.size>10*1024*1024){setError('OFX deve ter até 10 MB.');return;}if(!account){setError('Selecione a conta bancária do extrato.');return;}setBusy(true);try{const response=await fetch('/api/finance/ofx/imports?'+query({account_id:Number(account)}),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-ofx','X-Statement-Name':encodeURIComponent(file.name)},body:file});if(!response.ok){let detail='Não foi possível ler o OFX.';try{detail=(await response.json()).detail||detail}catch{}throw new Error(detail)}const value=await response.json() as Statement;setStatement(value);setVersion(v=>v+1);}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function reloadStatement(id:number){const value=await api<Statement>(`/finance/ofx/imports/${id}`);setStatement(value);setVersion(v=>v+1)}
 async function showCandidates(item:StatementItem){setCandidateItem(item)}
 return <div className="silex-reconciliation"><PageTitle title="Conciliação Bancária" subtitle="Importe seu extrato OFX, confira duplicados e confirme cada associação manualmente."/>
  {error&&<Notice>{error}</Notice>}
  <section className="panel reconciliation-import"><div className="panel-heading"><h2>Importar extrato OFX</h2></div><div className="form-grid ofx-import-form"><Field label="Conta bancária *"><select value={account} onChange={e=>setAccount(e.target.value)}><option value="">Selecione a conta</option>{accounts.data?.filter(a=>a.active&&a.kind==='bank').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="Arquivo OFX *"><input type="file" accept=".ofx,.qfx,application/x-ofx" onChange={e=>void importFile(e.target.files?.[0]||null)} disabled={busy}/></Field><p className="help">Até 10 MB. Confira o extrato e confirme os movimentos antes de registrar as baixas.</p></div></section>
  {statement&&<section className="panel reconciliation-statement"><div className="panel-heading"><div><h2>{statement.original_name}</h2><p>{statement.account_name} · {statement.count} transações · {statement.pending} pendentes · {statement.duplicates} duplicadas</p></div><span className={`reconciliation-state state-${statement.status}`}>{statement.status==='complete'?'Revisado':'Prévia'}</span></div><StatementRows statement={statement} choose={showCandidates}/></section>}
  <section className="panel reconciliation-history"><div className="panel-heading"><h2>Importações anteriores</h2></div><LedgerTable headers={['Arquivo / conta','Situação','Transações','Pendentes / duplicadas','Ação']} loading={imports.loading} empty={!imports.data?.items.length}>{imports.data?.items.map(row=><tr key={row.id}><td><strong>{row.original_name}</strong><small>{row.account_name}</small></td><td><span className={`reconciliation-state state-${row.status}`}>{row.status==='complete'?'Revisado':'Prévia'}</span></td><td>{row.count}</td><td>{row.pending} / {row.duplicates}</td><td><button onClick={()=>void reloadStatement(row.id)}>Revisar</button></td></tr>)}</LedgerTable><Pagination data={imports.data} onPage={setImportPage}/></section>
  {candidateItem&&statement&&<OfxResolveForm item={candidateItem} statementId={statement.id} close={()=>setCandidateItem(null)} done={async()=>{setCandidateItem(null);await reloadStatement(statement.id)}}/>}
 </div>;
}
function StatementRows({statement,choose}:{statement:Statement;choose:(item:StatementItem)=>void}){
 return <LedgerTable headers={['Data','FITID / histórico','Valor','Situação','Vínculo / ação']} empty={!statement.items.length}>{statement.items.map(item=><tr key={item.id}><td>{dateOnly(item.posted_date)}</td><td><strong>{item.name||item.memo||'Movimento bancário'}</strong><small>FITID {item.fitid} · {item.memo}</small></td><td className={`numeric ${item.amount_cents>0?'positive':'negative'}`}>{money(item.amount_cents)}</td><td><span className={`reconciliation-state state-${item.status}`}>{item.status==='duplicate'?`Duplicado #${item.duplicate_of_id}`:item.status==='posted'?'Lançado':item.status==='matched'?'Conciliado':item.status==='ignored'?'Ignorado':'Pendente'}</span></td><td>{item.matched_description||((item.status==='pending')&&<button onClick={()=>choose(item)}>Revisar / confirmar</button>)}</td></tr>)}</LedgerTable>;
}
function OfxNewFields({direction,category,setCategory,subcategory,setSubcategory,party,setParty}:{direction:string;category:string;setCategory:(v:string)=>void;subcategory:string;setSubcategory:(v:string)=>void;party:string;setParty:(v:string)=>void}){
 const categories=useLoad<Category[]>('/categories'),subs=useLoad<Subcategory[]>('/subcategories'),people=useLoad<Page<any>>(direction==='income'?'/customers?active=true&page_size=100':'/suppliers?active=true&page_size=100');
 return <div className="form-grid"><Field label="Categoria *"><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecione</option>{categories.data?.filter(c=>c.active&&(c.direction==='both'||c.direction===direction)).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Subcategoria *"><select value={subcategory} onChange={e=>setSubcategory(e.target.value)}><option value="">Selecione</option>{subs.data?.filter(s=>s.active&&String(s.category_id)===category).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field><Field label={direction==='income'?'Cliente':'Fornecedor'}><select value={party} onChange={e=>setParty(e.target.value)}><option value="">Não informado</option>{people.data?.items?.map((p:any)=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field></div>;
}

export function FinanceOverview({navigate}:{navigate:(id:string)=>void}){
 const today=localDate(),month=today.slice(0,7),[start,setStart]=useState(month+'-01'),[end,setEnd]=useState(today),[applied,setApplied]=useState({start:month+'-01',end:today});
 const result=useLoad<FinanceDash>('/finance/dashboard?'+query(applied));
 const peak=Math.max(1,...(result.data?.monthly||[]).flatMap(x=>[x.income_cents,x.expense_cents]));
 return <div className="silex-financial-dashboard" aria-busy={result.loading}><PageTitle title="Dashboard financeiro" subtitle="Movimentos, títulos em aberto, saldos por conta e resultado por competência."/>
  <form className="panel toolbar dashboard-period" onSubmit={e=>{e.preventDefault();setApplied({start,end})}}><SilexDatePicker label="De" value={start} onChange={(value) => setStart(value)} /><SilexDatePicker label="Até" value={end} onChange={(value) => setEnd(value)} /><button className="primary">Atualizar</button></form>
  {result.loading&&<p className="dashboard-loading" role="status">Carregando informações financeiras…</p>}
  {result.error&&<Notice>{result.error}</Notice>}<section className="dashboard-indicators" aria-labelledby="financial-period-title"><h2 id="financial-period-title">Movimentações do período</h2><p className="help">Pela data de lançamento. Os valores abaixo não incluem o saldo inicial.</p><div className="summary-grid three"><SummaryCard label="Entradas no período" value={money(result.data?.income_cents||0)} detail={`${result.data?.movement_count||0} movimentos`} tone="teal" icon={<ArrowDownLeft/>}/><SummaryCard label="Saídas no período" value={money(result.data?.expense_cents||0)} detail="Inclui encargos e estornos" tone="amber" icon={<ArrowUpRight/>}/><SummaryCard label="Saldo do período" value={money(result.data?.net_cents||0)} detail="Não inclui saldo inicial" icon={<Scale/>}/></div></section>
  <section className="dashboard-indicators dashboard-current" aria-labelledby="financial-current-title"><h2 id="financial-current-title">Títulos em aberto e saldo atual</h2><p className="help">Situação atual, independente do período selecionado. Vencido considera datas anteriores a hoje.</p><div className="summary-grid three"><SummaryCard label="A receber" value={money(result.data?.receivable_open_cents||0)} detail={`Vencido ${money(result.data?.receivable_overdue_cents||0)}`} tone="teal" icon={<ArrowDownLeft/>}/><SummaryCard label="A pagar" value={money(result.data?.payable_open_cents||0)} detail={`Vencido ${money(result.data?.payable_overdue_cents||0)}`} icon={<ArrowUpRight/>}/><SummaryCard label="Saldo atual total" value={money(result.data?.accounts.reduce((n,a)=>n+a.balance_cents,0)||0)} detail="Saldo inicial + histórico" icon={<Scale/>}/></div></section>
  <section className="panel dashboard-monthly" aria-labelledby="financial-monthly-title"><div className="panel-heading"><div><h2 id="financial-monthly-title">Movimentos por mês</h2><p>12 meses até o mês da data final, considerando cada mês completo.</p></div></div><div className="dashboard-chart-legend"><span><i className="bar-income" aria-hidden="true"/>Entradas</span><span><i className="bar-expense" aria-hidden="true"/>Saídas</span></div><p id="financial-chart-help" className="help">Escala proporcional ao maior valor, com altura mínima para visualizar as barras. Em telas estreitas, role o gráfico com as setas do teclado. Consulte os valores exatos na tabela abaixo.</p><div className="dashboard-chart-scroll" tabIndex={0} role="region" aria-label="Gráfico mensal de entradas e saídas" aria-describedby="financial-chart-help"><div className="monthly-bars">{result.data?.monthly.map(row=>{const max=Math.max(row.income_cents,row.expense_cents);return <div key={row.month} role="img" aria-label={`${financialMonthLabel(row.month)}: entradas ${money(row.income_cents)}, saídas ${money(row.expense_cents)}`} title={`${row.month}: entradas ${money(row.income_cents)}, saídas ${money(row.expense_cents)}`}><div className="bar-pair"><span className="bar-income" style={{height:`${Math.max(2,row.income_cents/peak*140)}px`}}/><span className="bar-expense" style={{height:`${Math.max(2,row.expense_cents/peak*140)}px`}}/></div><small>{financialMonthLabel(row.month)}</small><small className="sr-only">Pico {money(max)}</small></div>})}</div></div><p className="help">A data inicial não limita este gráfico; a janela é de 12 meses.</p><MonthlyValuesTable months={result.data?.monthly||[]}/></section>
  <section className="panel dashboard-classification"><div className="panel-heading"><div><h2>Resultado por classificação e grupo</h2><p>Pela data de competência no período selecionado. Desconsidera subcategorias marcadas para não afetar o resultado.</p></div></div><LedgerTable headers={['Classificação','Grupo','Receitas','Despesas','Saldo']} empty={!result.data?.result_groups.length}>{result.data?.result_groups.map((row,i)=><tr key={i}><td>{classificationLabels[row.classification]||row.classification}</td><td>{row.group}</td><td className="numeric">{money(row.income_cents)}</td><td className="numeric">{money(row.expense_cents)}</td><td className="numeric">{money(row.income_cents-row.expense_cents)}</td></tr>)}</LedgerTable></section>
  <section className="panel dashboard-accounts"><div className="panel-heading"><div><h2>Saldo atual por conta</h2><p>Saldo inicial e todo o histórico de movimentos, independente do período.</p></div><button onClick={()=>navigate('finance')}>Abrir livro caixa</button></div><ul className="settings-list">{result.data?.accounts.map(a=><li key={a.id}><span>{a.name}<small>{a.kind==='cash'?'Caixa':'Conta bancária'} · saldo inicial {money(a.opening_cents)}</small></span><strong>{money(a.balance_cents)}</strong></li>)}</ul>{result.data&&!result.data.accounts.length&&<p className="dashboard-empty">Nenhuma conta disponível.</p>}</section>
 </div>;
}

export function FinanceReports(){
 const now=localDate(),[report,setReport]=useState('cash-monthly'),[from,setFrom]=useState(now.slice(0,7)+'-01'),[to,setTo]=useState(now),[account,setAccount]=useState(''),[category,setCategory]=useState(''),[supplierKind,setSupplierKind]=useState(''),[filters,setFilters]=useState({start:now.slice(0,7)+'-01',end:now,account_id:'',category_id:'',supplier_kind:''}),[page,setPage]=useState(1),[budgetMonth,setBudgetMonth]=useState(now.slice(0,7)),[showBudget,setShowBudget]=useState(false),[version,setVersion]=useState(0),[budgetForm,setBudgetForm]=useState(false);
 const catalog=useLoad<ReportDef[]>('/finance/reports/catalog'),accounts=useLoad<Account[]>('/accounts'),categories=useLoad<Category[]>('/categories'),result=useLoad<ReportPage>('/finance/reports/'+report+'?'+query({...filters,page}),version),budget=useLoad<Budget[]>('/finance/budgets?'+query({year:Number(budgetMonth.slice(0,4)),month:Number(budgetMonth.slice(5,7)),supplier_kind:filters.supplier_kind}),version);
 const rows=result.data?.items||[],fields=Object.keys(rows[0]||{}),rowsQuery=query({...filters,page:1,page_size:100});
 return <><PageTitle title="Relatórios Financeiros" subtitle={`${catalog.data?.length||26} relatórios do financeiro, com filtros e exportação CSV.`}/>
  <form className="panel toolbar report-filters" onSubmit={e=>{e.preventDefault();setFilters({start:from,end:to,account_id:account,category_id:category,supplier_kind:supplierKind});setPage(1);}}><Field label="Relatório"><select value={report} onChange={e=>{setReport(e.target.value);setPage(1)}}>{catalog.data?.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><SilexDatePicker label="De" value={from} onChange={(value) => setFrom(value)} /><SilexDatePicker label="Até" value={to} onChange={(value) => setTo(value)} /><Field label="Conta"><select value={account} onChange={e=>setAccount(e.target.value)}><option value="">Todas</option>{accounts.data?.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></Field><Field label="Categoria"><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas</option>{categories.data?.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Tipo de beneficiário"><select value={supplierKind} onChange={e=>setSupplierKind(e.target.value)}><option value="">Todos</option><option value="supplier">Fornecedor</option><option value="day_worker">Diarista</option><option value="subcontracted_freight">Frete subcontratado</option></select></Field><button className="primary">Gerar relatório</button></form>
  {result.error&&<Notice>{result.error}</Notice>}<section className={`panel finance-report-print${fields.length>8?' finance-report-wide':''}`}><div className="panel-heading"><div><h2>{result.data?.name||'Relatório'}</h2><p>{dateOnly(filters.start)} a {dateOnly(filters.end)} · {result.data?.total||0} registros</p></div><button onClick={()=>location.href='/api/finance/reports/'+report+'.csv?'+rowsQuery}>Exportar CSV</button><button disabled={result.loading||!!result.error||!result.data} onClick={()=>window.print()}>Imprimir</button></div><p className="finance-report-print-note">Silex Business · Página {result.data?.page||1} de {Math.max(1,Math.ceil((result.data?.total||0)/(result.data?.page_size||20)))} · {rows.length} registros nesta página · Impressão dos resultados exibidos.</p><Table headers={fields.map(reportColumn)} loading={result.loading} empty={!rows.length}>{rows.map((row,index)=><tr key={index}>{fields.map(key=><td key={key} data-report-money={key.endsWith('_cents')||undefined}>{formatReportValue(key,row[key],report)}</td>)}</tr>)}</Table>{fields.length>8&&<ReportPrintColumns fields={fields} rows={rows} report={report} name={result.data?.name||'Relatório'} page={result.data?.page||1} pageSize={result.data?.page_size||20}/>}<Pagination data={result.data} onPage={setPage}/></section>
  <section className="panel"><div className="panel-heading"><div><h2>Orçamento mensal por categoria</h2><p>Despesas pagas na competência escolhida, comparadas à meta cadastrada.</p></div><form className="silex-budget-period" onSubmit={e=>{e.preventDefault();setBudgetForm(true)}}><SilexMonthField label="Mês" value={budgetMonth} onChange={setBudgetMonth} /><button type="submit" className="primary"><Plus size={17}/>Nova meta</button></form></div><Table headers={['Categoria / subcategoria','Meta','Realizado','Disponível','Uso']} loading={budget.loading} empty={!budget.data?.length}>{budget.data?.map(row=><tr key={row.id}><td>{row.category_name}<small>{row.subcategory_name}</small></td><td>{money(row.target_cents)}</td><td>{money(row.actual_cents)}</td><td className={row.remaining_cents<0?'negative':'positive'}>{money(row.remaining_cents)}</td><td>{row.percent_used}% <button className="danger" onClick={async()=>{await api(`/finance/budgets/${row.id}`,'DELETE');setVersion(v=>v+1)}}>Desativar</button></td></tr>)}</Table></section>
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
                    {reportColumn(key)}
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
const reportLabels:Record<string,string>={id:'ID',entry_id:'ID do título',payment_id:'ID da baixa',description:'Histórico',direction:'Tipo',group:'Agrupamento',posting_date:'Data de lançamento',competence_date:'Competência',due_date:'Vencimento',settled_at:'Quitado em',document:'Documento',category_name:'Categoria',subcategory_name:'Subcategoria',account_name:'Conta',customer_name:'Cliente',supplier_name:'Fornecedor',method:'Forma de pagamento',origin:'Origem',status:'Situação',amount_cents:'Valor líquido',principal_cents:'Principal',interest_cents:'Juros',fine_cents:'Multa',discount_cents:'Desconto',income_cents:'Receitas',expense_cents:'Despesas',net_cents:'Saldo',count:'Quantidade',reversal_of:'ID da baixa estornada',target_cents:'Meta',actual_cents:'Realizado',remaining_cents:'Disponível',year:'Ano',month:'Mês',percent_used:'Percentual usado',notes:'Observações'};
function reportColumn(key:string){return reportLabels[key]||key.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase())}
function formatReportValue(key:string,value:unknown,report:string){if(value===null||value===undefined)return '—';if(key.endsWith('_cents')&&typeof value==='number')return money(value);if(typeof value==='boolean')return value?'Sim':'Não';if(key==='group'&&typeof value==='string'){const label=reportGroupDate(report,value);if(label!==value)return label;}if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value))return dateOnly(value.slice(0,10));if(key==='direction'&&value==='income')return 'Receita';if(key==='direction'&&value==='expense')return 'Despesa';if(key==='status'&&value==='open')return 'Em aberto';if(key==='status'&&value==='partial')return 'Parcial';if(key==='status'&&value==='paid')return 'Quitado';if(key==='status'&&value==='canceled')return 'Cancelado';if(key==='method')return ({cash:'Dinheiro',pix:'Pix',card:'Cartão',ofx:'OFX'} as Record<string,string>)[String(value)]||String(value);if(key==='classification')return classificationLabels[String(value)]||String(value);return String(value)}
function BudgetForm({year,month,close,done}:{year:number;month:number;close:()=>void;done:()=>void}){
 const [category,setCategory]=useState(''),[subcategory,setSubcategory]=useState(''),[target,setTarget]=useState(''),[notes,setNotes]=useState('');const categories=useLoad<Category[]>('/categories'),subs=useLoad<Subcategory[]>('/subcategories');
 return <Modal title="Cadastrar orçamento mensal" close={close}><Form cancel={close} onSubmit={async()=>{const raw=target.trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(raw))throw new Error('Informe a meta em reais.');const [whole,frac='']=raw.split('.');const cents=Number(BigInt(whole)*100n+BigInt(frac.padEnd(2,'0')));await api('/finance/budgets','POST',{year,month,category_id:Number(category),subcategory_id:subcategory?Number(subcategory):null,target_cents:cents,notes});done()}}><div className="form-grid"><SilexMonthField label="Mês" readOnly value={`${year}-${String(month).padStart(2,'0')}`} /><Field label="Categoria *"><select required value={category} onChange={e=>{setCategory(e.target.value);setSubcategory('')}}><option value="">Selecione</option>{categories.data?.filter(c=>c.active&&(c.direction==='both'||c.direction==='expense')).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Subcategoria"><select value={subcategory} onChange={e=>setSubcategory(e.target.value)}><option value="">Todas da categoria</option>{subs.data?.filter(s=>s.active&&String(s.category_id)===category).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field><Field label="Meta mensal (R$) *"><input required inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)}/></Field><Field label="Observações"><input maxLength={300} value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div></Form></Modal>;
}
function OfxResolveForm({item,statementId,close,done}:{item:StatementItem;statementId:number;close:()=>void;done:()=>void}){
 const [mode,setMode]=useState('match'),[entry,setEntry]=useState(''),[subcategory,setSubcategory]=useState(''),[category,setCategory]=useState(''),[party,setParty]=useState(''),[principal,setPrincipal]=useState(''),[interest,setInterest]=useState('0,00'),[fine,setFine]=useState('0,00'),[discount,setDiscount]=useState('0,00'),[reason,setReason]=useState('');
 const direction=item.amount_cents>0?'income':'expense',candidates=useLoad<Candidate[]>(`/finance/ofx/imports/${statementId}/items/${item.id}/suggestions`);
 const selected=candidates.data?.find(c=>String(c.entry.id)===entry);
 return <Modal title={`Conferir movimento · ${dateOnly(item.posted_date)}`} close={close} wide><p>{item.name||item.memo} · <strong>{money(item.amount_cents)}</strong></p><div className="tabs"><button className={mode==='match'?'selected':''} onClick={()=>setMode('match')}>Conciliar título</button><button className={mode==='new'?'selected':''} onClick={()=>setMode('new')}>Criar lançamento</button></div>
  {mode==='match'?<><Field label="Título pendente sugerido"><select value={entry} onChange={e=>{const value=e.target.value;setEntry(value);const candidate=candidates.data?.find(c=>String(c.entry.id)===value);setPrincipal(candidate?(candidate.entry.remaining_cents/100).toFixed(2).replace('.',','):'')}}><option value="">Selecione um título</option>{candidates.data?.map(c=><option key={c.entry.id} value={c.entry.id}>{c.entry.description} · falta {money(c.entry.remaining_cents)} · diferença {money(c.difference_cents)}</option>)}</select></Field>{selected&&<div className="form-grid"><Field label="Principal (R$)"><input inputMode="decimal" value={principal} onChange={e=>setPrincipal(e.target.value)}/></Field><Field label="Juros (R$)"><input value={interest} onChange={e=>setInterest(e.target.value)}/></Field><Field label="Multa (R$)"><input value={fine} onChange={e=>setFine(e.target.value)}/></Field><Field label="Desconto (R$)"><input value={discount} onChange={e=>setDiscount(e.target.value)}/></Field></div>}</>:<OfxNewFields direction={direction} category={category} setCategory={setCategory} subcategory={subcategory} setSubcategory={setSubcategory} party={party} setParty={setParty}/>}
  <Form cancel={close} submit="Confirmar conciliação" onSubmit={async()=>{let body:Record<string,unknown>;if(mode==='match'){if(!entry)throw new Error('Selecione um título pendente.');const cents=(v:string)=>{const x=v.trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(x))throw new Error('Valor inválido.');const [w,f='']=x.split('.');return Number(BigInt(w)*100n+BigInt(f.padEnd(2,'0')))};body={entry_id:Number(entry),principal_cents:principal?cents(principal):undefined,interest_cents:interest?cents(interest):0,fine_cents:fine?cents(fine):0,discount_cents:discount?cents(discount):0};}else{if(!category||!subcategory)throw new Error('Selecione categoria e subcategoria.');body={create_title:true,category_id:Number(category),subcategory_id:Number(subcategory),[direction==='income'?'customer_id':'supplier_id']:party?Number(party):null};}await api(`/finance/ofx/imports/${statementId}/items/${item.id}/confirm`,'POST',body);done();}}><p className="help">O pagamento é registrado pela conta bancária selecionada no extrato e pela data informada no OFX.</p></Form>
  <Field label="Motivo para ignorar a linha"><input minLength={3} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Obrigatório para ignorar"/></Field>
  <button className="danger" disabled={reason.trim().length<3} onClick={async()=>{await api(`/finance/ofx/imports/${statementId}/items/${item.id}/confirm`,'POST',{ignore:true,reason:reason.trim()});done();}}>Ignorar esta linha</button>
 </Modal>;
}
