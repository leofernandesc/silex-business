import { SilexDatePicker } from "./SilexDatePicker";
import { useState } from "react";
import { Printer, Settings2, Paperclip, History as HistoryIcon, Search, ArrowDownLeft, Clock, CalendarClock, ListChecks, Plus } from "lucide-react";
import { api, exportCsv, query } from "./api";
import { dateOnly, localDate, money, parseDecimal, labels } from "./format";
import { partnerKinds, PixDetails } from "./partners";
import type {
  Account,
  Attachment,
  Category,
  Customer,
  Supplier,
  Subcategory,
  Entry,
  Page,
} from "./types";
import {
  Badge,
  ExportButton,
  Field,
  Form,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  SummaryCard,
  useLoad,
} from "./ui";

import { LedgerTable } from "./ledgerPresentation";
import "./accounts.css";

type FinanceFilters = {
  q: string; status: string; direction: string; account_id: string;
  category_id: string; supplier_id: string; supplier_kind: string;
  document: string; search_field: string; start: string; end: string; date_field: string;
};
type FinanceSummary = { pending_cents: number; overdue_cents: number; due_7_days_cents: number; count: number };
type FinancePageResult = Page<Entry> & { summary: FinanceSummary };

export function FinancePage({ initialDirection = "" }: { initialDirection?: string }) {
  const today = localDate();
  const initial: FinanceFilters = { q: "", status: "", direction: initialDirection, account_id: "", category_id: "", supplier_id: "", supplier_kind: "", document: "", search_field: "history", start: `${today.slice(0, 8)}01`, end: today, date_field: "due" };
  const [draft, setDraft] = useState<FinanceFilters>(initial);
  const [filters, setFilters] = useState<FinanceFilters>(initial);
  const [pageSize, setPageSize] = useState(20);
  const [period, setPeriod] = useState("month");
  const [page, setPage] = useState(1), [version, refresh] = useState(0),
    [adding, setAdding] = useState(false), [settings, setSettings] = useState(false),
    [settling, setSettling] = useState<Entry | null>(null), [canceling, setCanceling] = useState<Entry | null>(null),
    [historyEntry, setHistoryEntry] = useState<Entry | null>(null);
  const result = useLoad<FinancePageResult>("/finance?" + query({ ...filters, page, page_size: pageSize }), version),
    accounts = useLoad<Account[]>("/accounts", version), categories = useLoad<Category[]>("/categories", version),
    suppliers = useLoad<Page<Supplier>>("/suppliers?page_size=100", version);
  const update = (field: keyof FinanceFilters, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  function apply(next = draft) { setFilters({ ...next, direction: initialDirection || next.direction }); setPage(1); }
  function quickPeriod(value: string) {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let start = "", end = "";
    if (value === "today") start = end = iso(today);
    if (value === "week") { const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); start = iso(monday); end = iso(today); }
    if (value === "month") { start = iso(new Date(today.getFullYear(), today.getMonth(), 1)); end = iso(today); }
    if (value === "previous") { start = iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)); end = iso(new Date(today.getFullYear(), today.getMonth(), 0)); }
    if (value === "year") { start = iso(new Date(today.getFullYear(), 0, 1)); end = iso(today); }
    const next = { ...draft, start, end };
    setDraft(next); setPeriod(value); apply(next);
  }
  function done() { setAdding(false); setSettling(null); setCanceling(null); refresh(version + 1); }
  const fixedDirection = Boolean(initialDirection);
  const title = initialDirection === "income" ? "Contas a Receber" : initialDirection === "expense" ? "Contas a Pagar" : "Lançamentos (Despesa/Receita)";
  return <div className="silex-accounts">
    <PageTitle title={title} subtitle={initialDirection === "income" ? "Acompanhe recebimentos, vencimentos e baixas." : initialDirection === "expense" ? "Acompanhe pagamentos, vencimentos e beneficiários." : "Livro financeiro com filtros, comprovantes e histórico de pagamentos."}>
      <button onClick={() => setSettings(true)}><Settings2 size={15} /> Contas e categorias</button>
      <button onClick={() => window.open("/api/finance/print?" + query(filters), "_blank", "noopener,noreferrer")}><Printer size={15} /> Imprimir</button>
      <ExportButton onClick={() => exportCsv("finance", filters)} />
      <button className={initialDirection === "expense" ? "accounts-new-expense" : "primary"} onClick={() => setAdding(true)}><Plus size={17} />{initialDirection === "expense" ? "Nova despesa" : initialDirection === "income" ? "Nova receita" : "Novo lançamento"}</button>
    </PageTitle>
    <div className="summary-grid finance-summary-grid">
      <SummaryCard label="Saldo pendente" value={money(result.data?.summary.pending_cents || 0)} detail={initialDirection === "income" ? "Principal a receber neste filtro." : initialDirection === "expense" ? "Principal a pagar neste filtro." : "Principal pendente no recorte aplicado."} tone="blue" icon={<ArrowDownLeft />} />
      <SummaryCard label="Vencidos" value={money(result.data?.summary.overdue_cents || 0)} detail="Vencimento anterior a hoje." tone="amber" icon={<Clock />} />
      <SummaryCard label="Vencem em 7 dias" value={money(result.data?.summary.due_7_days_cents || 0)} detail="Hoje até hoje + 7 dias, inclusive." tone="teal" icon={<CalendarClock />} />
      <SummaryCard label="Lançamentos" value={String(result.data?.summary.count || 0)} detail="Quantidade no filtro, antes da paginação." icon={<ListChecks />} />
    </div>
    <section className="panel finance-ledger">
      <div className="finance-periods" aria-label="Período rápido">
        {[["today", "Hoje"], ["week", "Semana"], ["month", "Mês"], ["previous", "Mês anterior"], ["year", "Ano"], ["all", "Tudo"], ["custom", "Personalizado"]].map(([key, label]) => <button key={key} className={period === key ? "selected" : ""} onClick={() => key === "custom" ? setPeriod(key) : key === "all" ? (() => { const next = { ...draft, start: "", end: "" }; setDraft(next); setPeriod(key); apply(next); })() : quickPeriod(key)}>{label}</button>)}
      </div>
      <div className="finance-status-tabs" aria-label="Situação dos títulos">
        {[["", "Todos"], ["open", "Em aberto"], ["partial", "Parciais"], ["paid", "Baixados"], ["overdue", "Vencidos"], ["canceled", "Cancelados"]].map(([key, label]) => <button key={key || "all"} className={filters.status === key ? "selected" : ""} onClick={() => { const next = { ...draft, status: key }; setDraft(next); apply(next); }}>{label}</button>)}
      </div>
      <form className="finance-filter-grid" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <label className="inline-field">Buscar por<select value={draft.search_field} onChange={(e) => update("search_field", e.target.value)}><option value="history">Histórico ou documento</option><option value="description">Histórico</option><option value="document">Documento</option><option value="beneficiary">Beneficiário</option></select></label>
        <label className="inline-field finance-search-input"><span>Busca</span><span className="input-with-icon"><Search size={14} /><input value={draft.q} onChange={(e) => update("q", e.target.value)} placeholder="Digite e tecle Enter…" /></span></label>
        <label className="inline-field">Tipo<select value={fixedDirection ? initialDirection : draft.direction} disabled={fixedDirection} onChange={(e) => update("direction", e.target.value)}>{!fixedDirection && <option value="">Todas</option>}<option value="income">Receita</option><option value="expense">Despesa</option></select></label>
        <label className="inline-field">Conta<select value={draft.account_id} onChange={(e) => update("account_id", e.target.value)}><option value="">Todas</option>{accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="inline-field">Categoria<select value={draft.category_id} onChange={(e) => update("category_id", e.target.value)}><option value="">Todas</option>{categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="inline-field">Beneficiário<select value={draft.supplier_id} onChange={(e) => update("supplier_id", e.target.value)}><option value="">Todos</option>{suppliers.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name} · {partnerKinds[s.kind]}</option>)}</select></label>
        <label className="inline-field">Tipo de beneficiário<select value={draft.supplier_kind} onChange={(e) => update("supplier_kind", e.target.value)}><option value="">Todos</option>{Object.entries(partnerKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="inline-field">Documento<input value={draft.document} onChange={(e) => update("document", e.target.value)} maxLength={100} /></label>
        <label className="inline-field">Período por<select value={draft.date_field} onChange={(e) => update("date_field", e.target.value)}><option value="due">Lançamento</option><option value="competence">Competência</option><option value="created">Data de inclusão</option><option value="settled">Baixa</option></select></label>
        <SilexDatePicker label="De" value={draft.start} onChange={(value) => update("start", value)} />
        <SilexDatePicker label="Até" value={draft.end} onChange={(value) => update("end", value)} />
        <button type="submit" className="primary finance-search-button"><Search size={14} /> Pesquisar</button>
      </form>
      {result.error && <Notice>{result.error}</Notice>}
      <div className="panel-heading finance-table-heading"><h2>Lançamentos <span className="muted">({result.data?.total ?? 0})</span></h2><label className="inline-field">Itens por página<select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label></div>
      <LedgerTable headers={["Histórico", "Tipo", "Conta / categoria", "Vencimento", "Valor", "Situação", "Ações"]} loading={result.loading} empty={!result.data?.items.length}>
        {result.data?.items.map((row) => <tr key={row.id}>
          <td><strong>{row.description}</strong><small>{row.direction === "income" ? row.customer_name : row.supplier_name || `Título #${row.id}`}</small>{row.supplier_kind && row.supplier_kind !== "supplier" && <small>{partnerKinds[row.supplier_kind]}</small>}{row.service_order_code && <small>Serviço/pedido {row.service_order_code}</small>}{row.recurrence_count > 1 && <small>Ocorrência {row.recurrence_index}/{row.recurrence_count}</small>}{row.document && <small>Doc. {row.document}</small>}</td>
          <td><Badge status={row.direction} /></td><td>{row.account_name}<small>{row.category_name}</small></td>
          <td>{dateOnly(row.due_date)}{row.overdue && <small className="negative">Vencida</small>}</td>
          <td className={`numeric ${row.direction === "income" ? "positive" : "negative"}`}>{money(row.amount_cents)}{row.paid_principal_cents > 0 && row.status !== "paid" && <small>Pago {money(row.paid_principal_cents)} · falta {money(row.remaining_cents)}</small>}</td>
          <td><Badge status={row.status} /></td><td><div className="row-actions">{["open", "partial"].includes(row.status) && <button onClick={() => setSettling(row)}>{row.status === "partial" ? "Nova baixa" : "Quitar"}</button>}{row.payments?.length > 0 && <button onClick={() => setHistoryEntry(row)}><HistoryIcon size={14} /> Baixas ({row.payments.length})</button>}{(row.attachments?.length > 0 || row.payments?.some((p) => p.attachments?.length)) && <span title="Comprovante anexado"><Paperclip size={14} /></span>}{row.status !== "canceled" && !row.sale_id && <button className="danger" onClick={() => setCanceling(row)}>Cancelar</button>}{row.sale_id && <small>Venda #{row.sale_id}</small>}</div></td>
        </tr>)}
      </LedgerTable>
      <Pagination data={result.data} onPage={setPage} />
    </section>
    {adding && accounts.data && categories.data && <EntryForm accounts={accounts.data.filter((a) => a.active)} categories={categories.data.filter((c) => c.active)} initialDirection={initialDirection || "income"} fixedDirection={Boolean(initialDirection)} close={() => setAdding(false)} done={done} />}
    {settling && accounts.data && <SettleForm entry={settling} accounts={accounts.data.filter((a) => a.active)} close={() => setSettling(null)} done={done} />}
    {historyEntry && <PaymentHistory entry={historyEntry} close={() => setHistoryEntry(null)} done={() => { setHistoryEntry(null); refresh(version + 1); }} />}
    {canceling && <CancelForm entry={canceling} close={() => setCanceling(null)} done={done} />}
    {settings && accounts.data && categories.data && <FinanceSettings accounts={accounts.data.filter((a) => a.active)} categories={categories.data.filter((c) => c.active)} close={() => setSettings(false)} refresh={() => refresh(version + 1)} />}
  </div>;
}
function EntryForm({ accounts, categories, initialDirection='income', fixedDirection=false, close, done }: {accounts:Account[];categories:Category[];initialDirection?:string;fixedDirection?:boolean;close:()=>void;done:()=>void}) {
  const [description,setDescription]=useState(''),[direction,setDirection]=useState(initialDirection),[value,setValue]=useState(''),[account,setAccount]=useState(String(accounts.find(a=>a.kind==='bank')?.id||accounts[0]?.id||'')),[category,setCategory]=useState(String(categories.find(c=>c.direction==='both'||c.direction===initialDirection)?.id||categories[0]?.id||'')),[subcategory,setSubcategory]=useState(''),[due,setDue]=useState(localDate()),[competence,setCompetence]=useState(localDate()),[document,setDocument]=useState(''),[customer,setCustomer]=useState(''),[supplier,setSupplier]=useState(''),[q,setQ]=useState(''),[count,setCount]=useState('1'),[frequency,setFrequency]=useState('monthly');
  const customers=useLoad<Page<Customer>>('/customers?'+query({q,active:true,page_size:100})),suppliers=useLoad<Page<Supplier>>('/suppliers?'+query({q,active:true,page_size:100})),subcats=useLoad<Subcategory[]>('/subcategories');
  const categoryChoices=categories.filter(c=>c.active&&(c.direction==='both'||c.direction===direction)),subChoices=(subcats.data||[]).filter(x=>x.active&&x.category_id===Number(category));
  const num=Number(count),endDate=due?new Date(due+'T12:00:00Z'):null;
  return <Modal title={direction==='income'?'Nova conta a receber':'Nova conta a pagar'} close={close}><Form cancel={close} submit={num>1?'Criar títulos recorrentes':'Criar título'} onSubmit={async()=>{await api('/finance','POST',{description,direction,amount_cents:parseDecimal(value,2),account_id:Number(account),category_id:Number(category),subcategory_id:subcategory?Number(subcategory):null,customer_id:direction==='income'&&customer?Number(customer):null,supplier_id:direction==='expense'&&supplier?Number(supplier):null,due_date:due,competence_date:competence,document,recurrence_count:num,recurrence_frequency:frequency});done();}}>
    <div className="form-grid">
      <Field label="Histórico *" span><input autoFocus required maxLength={180} value={description} onChange={e=>setDescription(e.target.value)}/></Field>
      {!fixedDirection?<Field label="Tipo"><select value={direction} onChange={e=>{setDirection(e.target.value);setCustomer('');setSupplier('');const next=categories.find(c=>c.active&&(c.direction==='both'||c.direction===e.target.value));if(next)setCategory(String(next.id));}}><option value="income">Receita / a receber</option><option value="expense">Despesa / a pagar</option></select></Field>:<Field label="Tipo"><input readOnly value={direction==='income'?'Receita / a receber':'Despesa / a pagar'}/></Field>}
      <Field label="Valor de cada título (R$) *"><input required inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)}/></Field>
      <Field label="Conta associada *"><select required value={account} onChange={e=>setAccount(e.target.value)}>{accounts.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      <Field label="Categoria *"><select required value={category} onChange={e=>{setCategory(e.target.value);setSubcategory('');}}>{categoryChoices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Subcategoria"><select value={subcategory} onChange={e=>setSubcategory(e.target.value)}><option value="">Geral</option>{subChoices.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <SilexDatePicker label="Vencimento *" required value={due} onChange={(value) => setDue(value)} />
      <SilexDatePicker label="Competência *" required value={competence} onChange={(value) => setCompetence(value)} />
      <Field label="Número do documento"><input maxLength={100} value={document} onChange={e=>setDocument(e.target.value)}/></Field>
      <Field label={direction==='income'?'Pesquisar cliente':'Pesquisar beneficiário'}><input value={q} onChange={e=>{setQ(e.target.value);setSupplier('');setCustomer('');}} placeholder="Nome, documento ou contato"/></Field>
      {direction==='income'?<Field label="Cliente"><select value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Não informado</option>{customers.data?.items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>:<Field label="Beneficiário"><select value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Não informado</option>{suppliers.data?.items.map(v=><option key={v.id} value={v.id}>{v.name} · {partnerKinds[v.kind]}</option>)}</select></Field>}
      <Field label="Quantidade de títulos *"><input required type="number" min="1" max="60" value={count} onChange={e=>setCount(e.target.value)}/></Field>
      {num>1&&<Field label="Frequência"><select value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option><option value="yearly">Anual</option></select></Field>}
    </div>
    {num>1&&<Notice tone="info">Serão criados {num} títulos de {money((()=>{try{return parseDecimal(value,2)}catch{return 0}})())} cada, a partir de {dateOnly(due)}. Total da série: {money((()=>{try{return parseDecimal(value,2)*num}catch{return 0}})())}.</Notice>}
    {direction==='expense'&&suppliers.data?.items.filter(v=>String(v.id)===supplier&&v.pix_key).map(v=><PixDetails key={v.id} name={v.name} pix={{key_type:v.pix_key_type,key:v.pix_key,holder:v.pix_holder}}/>)}
    <p className="help">Criar título não altera saldo de caixa ou conta. O saldo muda quando uma baixa é registrada.</p>
  </Form></Modal>;
}
function SettleForm({entry,accounts,close,done}:{entry:Entry;accounts:Account[];close:()=>void;done:()=>void}) {
  const current=accounts.find(a=>a.id===entry.account_id),[method,setMethod]=useState(current?.kind==='cash'?'cash':'pix'),[account,setAccount]=useState(String(current?.active?entry.account_id:accounts.find(a=>a.kind==='bank')?.id||'')),[principal,setPrincipal]=useState((entry.remaining_cents/100).toFixed(2).replace('.',',')),[interest,setInterest]=useState('0,00'),[fine,setFine]=useState('0,00'),[discount,setDiscount]=useState('0,00'),[key]=useState(()=>crypto.randomUUID());
  const principalCents=(()=>{try{return parseDecimal(principal,2)}catch{return 0}})(),interestCents=(()=>{try{return parseDecimal(interest,2)}catch{return 0}})(),fineCents=(()=>{try{return parseDecimal(fine,2)}catch{return 0}})(),discountCents=(()=>{try{return parseDecimal(discount,2)}catch{return 0}})(),total=principalCents+interestCents+fineCents-discountCents;
  function changeMethod(value:string){setMethod(value);setAccount(String(accounts.find(a=>a.active&&a.kind===(value==='cash'?'cash':'bank'))?.id||''));}
  const full=principalCents===entry.remaining_cents&&interestCents===0&&fineCents===0&&discountCents===0;
  return <Modal title="Registrar quitação" close={close}><Form cancel={close} submit={full?'Confirmar quitação integral':'Registrar pagamento parcial'} onSubmit={async()=>{await api(`/finance/${entry.id}/settle`,'POST',{method,account_id:Number(account),principal_cents:principalCents,interest_cents:interestCents,fine_cents:fineCents,discount_cents:discountCents,request_key:key});done();}}>
    <p><strong>{entry.description}</strong></p><div className="totals grand"><span>Principal restante</span><strong>{money(entry.remaining_cents)}</strong></div>
    {entry.direction==='expense'&&method==='pix'&&entry.supplier_pix&&<PixDetails name={entry.supplier_name} pix={entry.supplier_pix}/>}
    <div className="form-grid"><Field label="Principal nesta baixa (R$) *"><input required inputMode="decimal" value={principal} onChange={e=>setPrincipal(e.target.value)}/></Field><Field label="Juros (R$)"><input inputMode="decimal" value={interest} onChange={e=>setInterest(e.target.value)}/></Field><Field label="Multa (R$)"><input inputMode="decimal" value={fine} onChange={e=>setFine(e.target.value)}/></Field><Field label="Desconto (R$)"><input inputMode="decimal" value={discount} onChange={e=>setDiscount(e.target.value)}/></Field><Field label="Pagamento"><select value={method} onChange={e=>changeMethod(e.target.value)}>{['cash','pix','card'].map(m=><option key={m} value={m}>{labels[m]}</option>)}</select></Field><Field label="Conta *"><select required value={account} onChange={e=>setAccount(e.target.value)}>{accounts.filter(a=>a.active&&a.kind===(method==='cash'?'cash':'bank')).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <p className="totals"><span>Total recebido/pago</span><strong>{money(total)}</strong></p><p className="help">Juros e multa sugeridos nas taxas da conta ficam para ajuste manual. A baixa em dinheiro usa o caixa aberto e reduz o saldo esperado.</p>
  </Form></Modal>;
}

function PaymentHistory({entry,close,done}:{entry:Entry;close:()=>void;done:()=>void}) {
  const [reason,setReason]=useState('');
  return <Modal title={`Baixas · ${entry.description}`} close={close} wide><p>Total {money(entry.amount_cents)} · Pago em principal {money(entry.paid_principal_cents)} · Restante {money(entry.remaining_cents)}</p>
    <LedgerTable headers={['Data','Forma','Principal / encargos / desconto','Valor líquido','Comprovantes','Ação']} empty={!entry.payments.length}>
      {entry.payments.map(p=><tr key={p.id}><td>{dateOnly(p.posting_date)}<small>Competência {dateOnly(p.competence_date)}</small>{p.reversal_reason&&<small>Motivo: {p.reversal_reason}</small>}</td><td>{labels[p.method]||p.method}{p.reversal_of&&<small>Estorno</small>}</td><td>{money(p.principal_cents)}<small>Juros {money(p.interest_cents)} · Multa {money(p.fine_cents)} · Desconto {money(p.discount_cents)}</small></td><td className="numeric">{money(p.amount_cents)}</td><td><AttachmentControls attachments={p.attachments||[]} path={`/finance/payments/${p.id}/attachments`} done={done}/></td><td>{!p.reversal_of&&!entry.payments.some(x=>x.reversal_of===p.id)&&<button className="danger" disabled={reason.trim().length<3} onClick={async()=>{await api(`/finance/payments/${p.id}/reverse`,'POST',{reason:reason.trim()});done();}}>Estornar baixa</button>}</td></tr>)}
    </LedgerTable>
    <Field label="Motivo de estorno"><input minLength={3} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Informado ao estornar"/></Field>
    <h3>Comprovantes do título</h3><AttachmentControls attachments={entry.attachments||[]} path={`/finance/${entry.id}/attachments`} done={done}/>
  </Modal>;
}
function AttachmentControls({attachments,path,done}:{attachments:Attachment[];path:string;done:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function add(files:FileList|null){if(!files?.length)return;setBusy(true);setError('');try{if(files.length>3-attachments.length)throw new Error('É possível anexar até três arquivos.');for(const file of Array.from(files)){if(file.size>5*1024*1024)throw new Error(`${file.name} ultrapassa 5 MB.`);const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));await api(path,'POST',{filename:file.name,content_type:file.type,content_base64:btoa(binary)});}done();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="attachment-list">{attachments.map(a=><a key={a.id} href={`/api/finance/attachments/${a.id}`} download>{a.original_name} · {(a.size_bytes/1024).toFixed(0)} KB</a>)}{attachments.length<3&&<label className="attachment-add">{busy?'Enviando…':'Adicionar comprovante'}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.doc,.docx" multiple disabled={busy} onChange={e=>void add(e.target.files)}/></label>}{error&&<Notice>{error}</Notice>}<small>Até 3 arquivos de 5 MB · PDF, imagem, DOC ou DOCX</small></div>;
}

function CancelForm({
  entry,
  close,
  done,
}: {
  entry: Entry;
  close: () => void;
  done: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Cancelar lançamento" close={close}>
      <Form
        cancel={close}
        submit="Confirmar cancelamento"
        onSubmit={async () => {
          await api(`/finance/${entry.id}/cancel`, "POST", { reason });
          done();
        }}
      >
        <p>
          {entry.description} · {money(entry.amount_cents)}
        </p>
        <Field label="Motivo *">
          <textarea
            autoFocus
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <p className="help">
          Se já houve pagamento, será registrado um estorno.
        </p>
      </Form>
    </Modal>
  );
}
function FinanceSettings({
  accounts,
  categories,
  close,
  refresh,
}: {
  accounts: Account[];
  categories: Category[];
  close: () => void;
  refresh: () => void;
}) {
  const [tab, setTab] = useState("accounts"),
    [name, setName] = useState(""),
    [kind, setKind] = useState("bank");
  return (
    <Modal title="Contas e categorias" close={close}>
      <div className="tabs">
        <button
          className={tab === "accounts" ? "selected" : ""}
          onClick={() => {
            setTab("accounts");
            setName("");
          }}
        >
          Contas
        </button>
        <button
          className={tab === "categories" ? "selected" : ""}
          onClick={() => {
            setTab("categories");
            setName("");
          }}
        >
          Categorias
        </button>
      </div>
      {tab === "accounts" ? (
        <ul className="settings-list">
          {accounts.map((a) => (
            <li key={a.id}>
              <span>
                {a.name}
                <small>
                  {a.kind === "cash" ? "Dinheiro" : "Conta bancária"} · saldo de
                  pagamentos
                </small>
              </span>
              <strong>{money(a.balance_cents)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="settings-list">
          {categories.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      )}
      <Form
        key={tab}
        submit={tab === "accounts" ? "Adicionar conta" : "Adicionar categoria"}
        onSubmit={async () => {
          await api(
            "/" + tab,
            "POST",
            tab === "accounts" ? { name, kind } : { name },
          );
          setName("");
          refresh();
        }}
      >
        <Field label="Nome *">
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {tab === "accounts" && (
          <Field label="Tipo">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="bank">Conta bancária</option>
              <option value="cash">Dinheiro</option>
            </select>
          </Field>
        )}
      </Form>
    </Modal>
  );
}
