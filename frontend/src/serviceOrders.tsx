import { useState } from "react";
import { Eye, Pencil, Plus, ReceiptText, X } from "lucide-react";
import { api, query } from "./api";
import { dateOnly, decimalInput, labels, localDate, money, parseDecimal, quantity } from "./format";
import { partnerKinds } from "./partners";
import type { Account, Customer, Page, ServiceOrder, Supplier, SupplierKind } from "./types";
import { AddButton, Badge, Field, Form, Modal, Notice, PageTitle, Pagination, Table, useLoad } from "./ui";
import { LedgerDateField } from "./ledgerPresentation";

type CostDraft = { key: string; kind: "day_worker" | "subcontracted_freight"; supplier_id: string; days: string; amount: string; details: string; rateSuggested?: boolean };
const statusLabels: Record<ServiceOrder["status"], string> = { draft: "Rascunho", scheduled: "Agendado", in_progress: "Em execução", completed: "Concluído", canceled: "Cancelado" };

export function ServiceOrdersPage() {
  const [q, setQ] = useState(""), [status, setStatus] = useState(""), [page, setPage] = useState(1),
    [version, setVersion] = useState(0), [editing, setEditing] = useState<ServiceOrder | null | undefined>(),
    [viewing, setViewing] = useState<ServiceOrder | null>(null), [generating, setGenerating] = useState<ServiceOrder | null>(null),
    [canceling, setCanceling] = useState<ServiceOrder | null>(null), [notice, setNotice] = useState("");
  const orders = useLoad<Page<ServiceOrder>>("/service-orders?" + query({ q, status, page }), version);
  const reload = () => setVersion((v) => v + 1);
  const saved = () => { setEditing(undefined); setNotice("Serviço/pedido salvo."); reload(); };
  async function refreshOrder(order: ServiceOrder) { const result = await api<ServiceOrder>(`/service-orders/${order.id}`); setViewing(result); reload(); }
  return <>
    <PageTitle title="Serviços e pedidos" subtitle="Custos contratados, títulos financeiros e resultado por operação.">
      <AddButton onClick={() => { setNotice(""); setEditing(null); }}>Novo serviço/pedido</AddButton>
    </PageTitle>
    {notice && <Notice tone="success">{notice}</Notice>}
    <section className="panel">
      <div className="toolbar service-order-filters">
        <label className="inline-field">Buscar<input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Código, cliente ou descrição" /></label>
        <label className="inline-field">Andamento<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todos</option><option value="draft">Rascunho</option><option value="scheduled">Agendado</option><option value="in_progress">Em execução</option><option value="completed">Concluído</option><option value="canceled">Cancelado</option></select></label>
      </div>
      {orders.error && <Notice>{orders.error}</Notice>}
      <Table headers={["Pedido / cliente", "Data / andamento", "Receita prevista", "Custos previstos", "Resultado previsto", "Resultado realizado", "Ações"]} loading={orders.loading} empty={!orders.data?.items.length}>
        {orders.data?.items.map((row) => <tr key={row.id}>
          <td><strong>{row.code}</strong><small>{row.customer_name} · {row.description}</small></td>
          <td>{dateOnly(row.service_date)}<small><Badge status={row.status} /> {statusLabels[row.status]}</small></td>
          <td className="numeric">{money(row.negotiated_cents)}</td>
          <td className="numeric">{money(row.expected_cost_cents)}</td>
          <td className={`numeric ${row.expected_result_cents < 0 ? "negative" : "positive"}`}>{money(row.expected_result_cents)}</td>
          <td className={`numeric ${row.actual_result_cents < 0 ? "negative" : "positive"}`}>{money(row.actual_result_cents)}<small>Entradas {money(row.actual_income_cents)} · saídas {money(row.actual_cost_cents)}</small></td>
          <td><div className="row-actions">
            <button aria-label={`Ver ${row.code}`} onClick={() => setViewing(row)}><Eye size={14} /> Ver</button>
            {row.status !== "canceled" && <button aria-label={`Editar ${row.code}`} onClick={() => setEditing(row)}><Pencil size={14} /> Editar</button>}
            {!row.title_run_id && row.status !== "canceled" && <button onClick={() => setGenerating(row)}><ReceiptText size={14} /> Gerar títulos</button>}
            {row.title_run_id && <span className="badge active">Títulos gerados</span>}
            {row.status !== "canceled" && <button className="danger" onClick={() => setCanceling(row)}>Cancelar</button>}
          </div></td>
        </tr>)}
      </Table>
      <Pagination data={orders.data} onPage={setPage} />
    </section>
    {editing !== undefined && <ServiceOrderForm order={editing} close={() => setEditing(undefined)} done={saved} />}
    {viewing && <ServiceOrderDetails order={viewing} close={() => setViewing(null)} refresh={() => void refreshOrder(viewing)} />}
    {generating && <GenerateTitlesForm order={generating} close={() => setGenerating(null)} done={() => { setGenerating(null); setNotice("Títulos financeiros gerados e vinculados ao pedido."); reload(); }} />}
    {canceling && <CancelServiceOrderForm order={canceling} close={() => setCanceling(null)} done={() => { setCanceling(null); setNotice("Serviço cancelado; títulos e baixas foram mantidos no histórico."); reload(); }} />}
  </>;
}

function ServiceOrderForm({ order, close, done }: { order: ServiceOrder | null; close: () => void; done: () => void }) {
  const customers = useLoad<Page<Customer>>("/customers?active=true&page_size=100"),
    suppliers = useLoad<Page<Supplier>>("/suppliers?active=true&page_size=100");
  const locked = Boolean(order?.title_run_id);
  const [customer, setCustomer] = useState(String(order?.customer_id || "")),
    [description, setDescription] = useState(order?.description || ""),
    [serviceDate, setServiceDate] = useState(order?.service_date || localDate()),
    [revenue, setRevenue] = useState(order ? decimalInput(order.negotiated_cents) : ""),
    [status, setStatus] = useState(order?.status || "draft"), [notes, setNotes] = useState(order?.notes || ""),
    [costs, setCosts] = useState<CostDraft[]>(order?.costs.map((cost) => ({
      key: String(cost.id), kind: cost.kind, supplier_id: String(cost.supplier_id),
      days: cost.quantity_milli == null ? "1" : quantity(cost.quantity_milli),
      amount: decimalInput(cost.agreed_amount_cents), details: cost.details, rateSuggested: false,
    })) || []);
  const changeCost = (key: string, patch: Partial<CostDraft>) => setCosts((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  function addCost(kind: CostDraft["kind"]) { setCosts((current) => [...current, { key: crypto.randomUUID(), kind, supplier_id: "", days: "1", amount: "", details: "", rateSuggested: false }]); }
  function suggestedAmount(kind: CostDraft["kind"], supplierId: string, days: string) {
    const supplier = suppliers.data?.items.find((item) => item.id === Number(supplierId));
    if (supplier?.default_rate_cents == null) return undefined;
    const daysMilli = kind === "day_worker" ? parseDecimal(days || "1", 3) : 1000;
    const cents = kind === "day_worker" ? Number((BigInt(supplier.default_rate_cents) * BigInt(daysMilli) + 500n) / 1000n) : supplier.default_rate_cents;
    return decimalInput(cents);
  }
  return <Modal title={order ? `Editar ${order.code}` : "Novo serviço/pedido"} close={close} wide>
    {locked && <Notice tone="info">Os títulos já foram gerados. Cliente, valor e custos contratados ficam congelados; descrição, data, andamento e observações ainda podem ser ajustados.</Notice>}
    {customers.error && <Notice>{customers.error}</Notice>}{suppliers.error && <Notice>{suppliers.error}</Notice>}
    <Form cancel={close} submit={order ? "Salvar alterações" : "Cadastrar serviço"} onSubmit={async () => {
      const payload = {
        customer_id: Number(customer), description, service_date: serviceDate,
        negotiated_cents: parseDecimal(revenue, 2), status, notes,
        costs: costs.map((cost) => ({
          kind: cost.kind, supplier_id: Number(cost.supplier_id),
          quantity_milli: cost.kind === "day_worker" ? parseDecimal(cost.days, 3) : null,
          agreed_amount_cents: parseDecimal(cost.amount, 2), details: cost.details,
        })),
      };
      await api(order ? `/service-orders/${order.id}` : "/service-orders", order ? "PUT" : "POST", payload);
      done();
    }}>
      <div className="form-grid">
        <Field label="Cliente *" span><select required disabled={locked} value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="">Selecione o cliente</option>{customers.data?.items.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
        <Field label="Descrição do serviço/pedido *" span><input autoFocus required maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <LedgerDateField label="Data do serviço *" value={serviceDate}><input type="date" required value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} /></LedgerDateField>
        <Field label="Valor negociado (R$) *"><input required inputMode="decimal" disabled={locked} value={revenue} onChange={(e) => setRevenue(e.target.value)} /></Field>
        <Field label="Andamento"><select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "scheduled" | "in_progress" | "completed")}><option value="draft">Rascunho</option><option value="scheduled">Agendado</option><option value="in_progress">Em execução</option><option value="completed">Concluído</option></select></Field>
        <Field label="Observações" span><textarea maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
      <div className="service-cost-heading"><div><h3>Custos contratados</h3><p>Valores específicos deste serviço prevalecem sobre a sugestão do cadastro.</p></div><div className="actions"><button type="button" disabled={locked} onClick={() => addCost("day_worker")}><Plus size={14} /> Adicionar diarista</button><button type="button" disabled={locked} onClick={() => addCost("subcontracted_freight")}><Plus size={14} /> Adicionar frete</button></div></div>
      {costs.map((cost, index) => {
        const choices = (suppliers.data?.items || []).filter((supplier) => supplier.kind === cost.kind);
        return <fieldset className="service-cost-row" key={cost.key} disabled={locked}>
          <legend>{cost.kind === "day_worker" ? `Diarista ${index + 1}` : `Frete ${index + 1}`}</legend>
          <button className="icon-button service-cost-remove" type="button" aria-label="Remover custo" disabled={locked} onClick={() => setCosts((current) => current.filter((item) => item.key !== cost.key))}><X size={16} /></button>
          <div className="form-grid">
            <Field label={cost.kind === "day_worker" ? "Diarista *" : "Prestador de frete *"} span><select required value={cost.supplier_id} onChange={(e) => {
              let amountPatch: Partial<CostDraft> = { rateSuggested: false };
              try {
                const suggested = suggestedAmount(cost.kind, e.target.value, cost.days);
                if (suggested !== undefined) amountPatch = { amount: suggested, rateSuggested: true };
              } catch { /* Valor em branco enquanto a quantidade digitada estiver incompleta. */ }
              changeCost(cost.key, { supplier_id: e.target.value, ...amountPatch });
            }}><option value="">Selecione</option>{choices.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
            {cost.kind === "day_worker" && <Field label="Quantidade de diárias *"><input required inputMode="decimal" value={cost.days} onChange={(e) => {
              const days = e.target.value;
              let amountPatch: Partial<CostDraft> = {};
              if (cost.rateSuggested) {
                try { const amount = suggestedAmount(cost.kind, cost.supplier_id, days); if (amount !== undefined) amountPatch = { amount }; }
                catch { amountPatch = {}; }
              }
              changeCost(cost.key, { days, ...amountPatch });
            }} /></Field>}
            <Field label="Valor acordado neste serviço (R$) *"><input required inputMode="decimal" value={cost.amount} onChange={(e) => changeCost(cost.key, { amount: e.target.value, rateSuggested: false })} /></Field>
            <Field label="Detalhes da contratação" span><input maxLength={300} value={cost.details} onChange={(e) => changeCost(cost.key, { details: e.target.value })} /></Field>
          </div>
        </fieldset>;
      })}
      {costs.length === 0 && <div className="empty service-cost-empty">Nenhum custo contratado. Use os botões acima para associar diaristas ou frete.</div>}
      <p className="help">Cadastrar custos não os marca como pagos. A ação separada “Gerar títulos” cria o recebível e as contas a pagar, sem alterar saldos.</p>
    </Form>
  </Modal>;
}

function GenerateTitlesForm({ order, close, done }: { order: ServiceOrder; close: () => void; done: () => void }) {
  const accounts = useLoad<Account[]>("/accounts"), [account, setAccount] = useState(""),
    [dueDate, setDueDate] = useState(localDate()), [competence, setCompetence] = useState(localDate());
  return <Modal title={`Gerar títulos · ${order.code}`} close={close}>
    <p>Será criado um recebível de {money(order.negotiated_cents)} e {order.costs.length} conta(s) a pagar no total de {money(order.expected_cost_cents)}. Os saldos não mudam até registrar as baixas.</p>
    <Form cancel={close} submit="Confirmar geração de títulos" onSubmit={async () => { await api(`/service-orders/${order.id}/generate-titles`, "POST", { account_id: Number(account), due_date: dueDate, competence_date: competence }); done(); }}>
      <div className="form-grid">
        <Field label="Conta associada aos títulos *" span><select required value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Selecione</option>{accounts.data?.filter((row) => row.active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
        <LedgerDateField label="Vencimento *" value={dueDate}><input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></LedgerDateField>
        <LedgerDateField label="Competência *" value={competence}><input type="date" required value={competence} onChange={(e) => setCompetence(e.target.value)} /></LedgerDateField>
      </div>
      {accounts.error && <Notice>{accounts.error}</Notice>}
      <Notice tone="info">A geração é única para este pedido. Se precisar registrar uma correção depois, use o histórico de títulos para cancelar/estornar os lançamentos gerados.</Notice>
    </Form>
  </Modal>;
}

function ServiceOrderDetails({ order, close, refresh }: { order: ServiceOrder; close: () => void; refresh: () => void }) {
  const [reason, setReason] = useState("");
  return <Modal title={`${order.code} · ${order.customer_name}`} close={close} wide><div className="service-order-details">
    <div className="service-order-detail-heading"><div><h2>{order.description}</h2><p>{dateOnly(order.service_date)} · {statusLabels[order.status]}</p></div><button onClick={refresh}>Atualizar</button></div>
    <div className="summary-grid four service-order-detail-summary">
      <div className="summary-card"><span>Receita prevista</span><strong>{money(order.negotiated_cents)}</strong></div>
      <div className="summary-card"><span>Custos previstos</span><strong>{money(order.expected_cost_cents)}</strong></div>
      <div className="summary-card"><span>Resultado previsto</span><strong>{money(order.expected_result_cents)}</strong></div>
      <div className="summary-card"><span>Resultado realizado</span><strong>{money(order.actual_result_cents)}</strong><small>Recebido {money(order.actual_income_cents)} · pago {money(order.actual_cost_cents)}</small></div>
    </div>
    {order.notes && <p className="help">{order.notes}</p>}{order.cancel_reason && <Notice>Cancelado: {order.cancel_reason}</Notice>}
    <h3>Custos contratados</h3>
    <p className="table-scroll-hint">Deslize a tabela para ver todas as colunas.</p>
    <Table headers={["Prestador", "Tipo / quantidade", "Valor acordado", "Título vinculado"]} empty={!order.costs.length}>{order.costs.map((cost) => <tr key={cost.id}><td>{cost.supplier_name}</td><td>{partnerKinds[cost.kind as SupplierKind]}{cost.quantity_milli != null && <small>{quantity(cost.quantity_milli)} diária(s)</small>}{cost.details && <small>{cost.details}</small>}</td><td className="numeric">{money(cost.agreed_amount_cents)}</td><td>{cost.finance_entry_id ? `#${cost.finance_entry_id} · ${labels[cost.finance_status || ""] || cost.finance_status}` : "Ainda não gerado"}</td></tr>)}</Table>
    <h3>Títulos financeiros</h3>
    <p className="table-scroll-hint">Deslize a tabela para ver todas as colunas.</p>
    <Table headers={["Título", "Direção", "Valor", "Restante", "Situação"]} empty={!order.titles.length}>{order.titles.map((title) => <tr key={title.id}><td>#{title.id} · {title.description}</td><td>{title.direction === "income" ? "Receber" : "Pagar"}</td><td>{money(title.amount_cents)}</td><td>{money(title.remaining_cents)}</td><td><Badge status={title.status} /></td></tr>)}</Table>
    {order.title_run_id && <p className="help">Vencimento {dateOnly(order.title_due_date)} · competência {dateOnly(order.title_competence_date)}. O realizado considera pagamentos e estornos registrados, inclusive baixas parciais.</p>}
    {order.status !== "canceled" && <Field label="Motivo para cancelar o serviço"><input minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
    {order.status !== "canceled" && <button className="danger" disabled={reason.trim().length < 3} onClick={async () => { await api(`/service-orders/${order.id}/cancel`, "POST", { reason: reason.trim() }); close(); }}>Cancelar serviço e preservar o histórico</button>}
  </div></Modal>;
}

function CancelServiceOrderForm({ order, close, done }: { order: ServiceOrder; close: () => void; done: () => void }) {
  const [reason, setReason] = useState("");
  return <Modal title={`Cancelar ${order.code}`} close={close}><p>O serviço será marcado como cancelado. Títulos existentes serão cancelados com estornos registrados quando já houver baixas.</p><Form cancel={close} submit="Confirmar cancelamento" onSubmit={async () => { await api(`/service-orders/${order.id}/cancel`, "POST", { reason }); done(); }}><Field label="Motivo *"><textarea required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></Form></Modal>;
}
