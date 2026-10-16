import { SilexDatePicker } from "./SilexDatePicker";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  List,
  Landmark,
  Printer,
  Search,
  Plus,
} from "lucide-react";
import { LedgerTable } from "./ledgerPresentation";
import "./ledger.css";
import { api, query } from "./api";
import { dateOnly, localDate, money, parseDecimal } from "./format";
import { presets, periodRange } from "./financeDates";
import type {
  Account,
  Category,
  Ledger,
  Movement,
  Page,
  Subcategory,
  Supplier,
} from "./types";
import {
  AddButton,
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

type Filters = {
  q: string;
  search_field: string;
  direction: string;
  account_id: string;
  origin: string;
  has_attachment: string;
  date_field: string;
  start: string;
  end: string;
};
const initial = (): Filters => ({
  q: "",
  search_field: "history",
  direction: "",
  account_id: "",
  origin: "",
  has_attachment: "",
  date_field: "posting",
  ...periodRange("Mês"),
});
const originLabels: Record<string, string> = {
  manual: "Manual",
  title: "Quitação de título",
  sale: "Venda",
  ofx: "OFX",
  reversal: "Estorno",
};
export function LedgerPage() {
  const [draft, setDraft] = useState(initial),
    [applied, setApplied] = useState(initial),
    [preset, setPreset] = useState("Mês"),
    [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [version, setVersion] = useState(0),
    [adding, setAdding] = useState(""),
    [reverse, setReverse] = useState<Movement | null>(null),
    [printRows, setPrintRows] = useState<Movement[] | null>(null),
    [printError, setPrintError] = useState(""),
    [printing, setPrinting] = useState(false);
  const result = useLoad<Ledger>(
      "/finance/movements?" + query({ ...applied, page, page_size: size }),
      version,
    ),
    accounts = useLoad<Account[]>("/accounts", version),
    categories = useLoad<Category[]>("/categories", version),
    subcategories = useLoad<Subcategory[]>("/subcategories", version);
  const change = (name: keyof Filters, value: string) =>
    setDraft({ ...draft, [name]: value });
  function apply(filters = draft) {
    setApplied({ ...filters });
    setPage(1);
    setPrintRows(null);
  }
  function done() {
    setAdding("");
    setReverse(null);
    setVersion((v) => v + 1);
    setPrintRows(null);
  }
  async function print() {
    setPrintError("");
    setPrinting(true);
    try {
      const rows: Movement[] = [];
      let next = 1,
        total = 0;
      do {
        const data = await api<Ledger>(
          "/finance/movements?" +
            query({ ...applied, page: next, page_size: 100 }),
        );
        rows.push(...data.items);
        total = data.total;
        next++;
      } while (rows.length < total);
      setPrintRows(rows);
      setTimeout(() => {
        window.print();
        setPrinting(false);
      }, 100);
    } catch (e) {
      setPrintError((e as Error).message);
      setPrinting(false);
    }
  }
  const summary =
    result.loading || result.error ? undefined : result.data?.summary;
  return (
    <div className="ledger-page silex-ledger">
      <PageTitle
        title="Lançamentos (Despesa/Receita)"
        subtitle="Livro caixa: entradas e saídas efetivas por conta."
      >
        <button
          disabled={printing || result.loading || !!result.error}
          onClick={print}
        >
          <Printer size={16} />
          {printing ? "Preparando…" : "Imprimir"}
        </button>
        <ExportButton
          onClick={() => {
            location.href = "/api/finance/movements.csv?" + query(applied);
          }}
        />
        <button
          className="ledger-new-expense"
          onClick={() => setAdding("expense")}
        >
          <Plus size={17} />
          Nova despesa
        </button>
        <AddButton onClick={() => setAdding("income")}>Nova receita</AddButton>
      </PageTitle>
      <div className="period-tabs" aria-label="Período">
        <div className="tabs">
          {presets.map((p) => (
            <button
              key={p}
              aria-pressed={preset === p}
              className={preset === p ? "selected" : ""}
              onClick={() => {
                setPreset(p);
                if (p !== "Personalizado") {
                  const range = periodRange(p);
                  setDraft({ ...draft, ...range });
                  apply({ ...applied, ...range });
                }
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="summary-grid ledger-summary">
        <SummaryCard
          label="Entradas"
          value={money(summary?.income_cents || 0)}
          detail="Movimentos no filtro aplicado"
          tone="teal"
          icon={<ArrowDownLeft />}
        />
        <SummaryCard
          label="Saídas"
          value={money(summary?.expense_cents || 0)}
          detail="Movimentos no filtro aplicado"
          tone="amber"
          icon={<ArrowUpRight />}
        />
        <SummaryCard
          label="Saldo do período"
          value={money(summary?.net_cents || 0)}
          detail="Entradas menos saídas"
          icon={<Scale />}
        />
        <SummaryCard
          label="Lançamentos"
          value={String(summary?.count || 0)}
          detail={
            applied.start || applied.end
              ? `${dateOnly(applied.start)} a ${dateOnly(applied.end)}`
              : "Todo o histórico"
          }
          icon={<List />}
        />
      </div>
      {accounts.error && <Notice>{accounts.error}</Notice>}
      <div className="account-balances">
        <p>
          Saldo atual das contas · clique para filtrar · inclui saldo inicial e
          todo o histórico
        </p>
        <div className="balance-chips">
          {[
            {
              id: 0,
              name: "Todas as contas",
              balance_cents:
                accounts.data?.reduce((s, a) => s + a.balance_cents, 0) || 0,
            },
            ...(accounts.data || []),
          ].map((a) => (
            <button
              key={a.id}
              aria-pressed={applied.account_id === (a.id ? String(a.id) : "")}
              className={
                applied.account_id === (a.id ? String(a.id) : "")
                  ? "selected"
                  : ""
              }
              onClick={() => {
                const f = { ...applied, account_id: a.id ? String(a.id) : "" };
                setDraft({ ...draft, account_id: f.account_id });
                apply(f);
              }}
            >
              <Landmark size={17} />
              <span>
                {a.name}
                <strong>{money(a.balance_cents)}</strong>
              </span>
            </button>
          ))}
        </div>
      </div>
      <form
        className="panel ledger-filters"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <Field label="Busca">
          <select
            value={draft.search_field}
            onChange={(e) => change("search_field", e.target.value)}
          >
            <option value="history">Histórico</option>
            <option value="document">Documento</option>
          </select>
        </Field>
        <Field label="Pesquisar histórico ou documento">
          <input
            value={draft.q}
            onChange={(e) => change("q", e.target.value)}
            placeholder="Digite e tecle Enter…"
            maxLength={180}
          />
        </Field>
        <Field label="Tipo">
          <select
            value={draft.direction}
            onChange={(e) => change("direction", e.target.value)}
          >
            <option value="">Todas</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </Field>
        <Field label="Conta">
          <select
            value={draft.account_id}
            onChange={(e) => change("account_id", e.target.value)}
          >
            <option value="">Todas</option>
            {accounts.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {!a.active ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Origem">
          <select
            value={draft.origin}
            onChange={(e) => change("origin", e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(originLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Comprovante">
          <select
            value={draft.has_attachment}
            onChange={(e) => change("has_attachment", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="false">Sem comprovante</option>
            <option value="true">Com comprovante</option>
          </select>
        </Field>
        <fieldset className="date-basis">
          <legend>Período por</legend>
          {[
            ["posting", "Lançamento"],
            ["competence", "Competência"],
          ].map(([k, v]) => (
            <label key={k}>
              <input
                type="radio"
                name="date-basis"
                checked={draft.date_field === k}
                onChange={() => change("date_field", k)}
              />
              {v}
            </label>
          ))}
        </fieldset>
        <SilexDatePicker label="De" value={draft.start} onChange={(value) => {
              change("start", value);
              setPreset("Personalizado");
            }} />
        <SilexDatePicker label="Até" value={draft.end} onChange={(value) => {
              change("end", value);
              setPreset("Personalizado");
            }} />
        <button type="submit" className="primary">
          <Search size={15} />
          Pesquisar
        </button>
        <small className="ledger-filter-help">
          Alterações nos campos são aplicadas ao pesquisar. O filtro de
          comprovantes considera os anexos do título e das baixas.
        </small>
      </form>
      {printError && <Notice>{printError}</Notice>}
      {result.error && <Notice>{result.error}</Notice>}
      <section className="panel ledger-list">
        <div className="panel-heading">
          <h2>Lançamentos</h2>
          <label className="inline-field">
            Itens por página
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[20, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {!result.loading && !result.error && !result.data?.items.length ? (
          <div className="empty ledger-empty">
            <List size={52} />
            <span>Nenhum lançamento no período/filtro escolhido.</span>
          </div>
        ) : (
          <LedgerTable
            loading={result.loading}
            empty={false}
            headers={[
              "Data / competência",
              "Histórico / documento",
              "Conta / categoria",
              "Origem",
              "Valor",
              "Ações",
            ]}
          >
            {result.data?.items.map((row) => (
              <tr key={row.id}>
                <td>
                  {dateOnly(row.posting_date)}
                  <small>{dateOnly(row.competence_date)}</small>
                </td>
                <td>
                  <strong>{row.description}</strong>
                  <small>
                    {row.document || `Movimento #${row.id}`}
                    {row.supplier_name ? ` · ${row.supplier_name}` : ""}
                  </small>
                </td>
                <td>
                  {row.account_name}
                  <small>
                    {row.category_name} / {row.subcategory_name}
                  </small>
                </td>
                <td>
                  {originLabels[row.origin]}
                  {row.entry_status === "canceled" && !row.reversal_of && (
                    <small>Estornado</small>
                  )}
                </td>
                <td
                  className={`numeric ${row.amount_cents > 0 ? "positive" : "negative"}`}
                >
                  {money(row.amount_cents)}
                  <small className="ledger-value-kind">
                    {row.amount_cents > 0 ? "Entrada" : "Saída"}
                  </small>
                </td>
                <td>
                  {row.origin === "manual" &&
                    row.entry_status !== "canceled" && (
                      <button
                        className="danger"
                        onClick={() => setReverse(row)}
                      >
                        Estornar
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </LedgerTable>
        )}
        <Pagination data={result.data} onPage={setPage} />
      </section>
      {adding && (
        <MovementForm
          direction={adding}
          accounts={(accounts.data || []).filter((a) => a.active)}
          categories={(categories.data || []).filter((c) => c.active)}
          subcategories={(subcategories.data || []).filter((s) => s.active)}
          close={() => setAdding("")}
          done={done}
        />
      )}
      {reverse && (
        <ReverseForm row={reverse} close={() => setReverse(null)} done={done} />
      )}
      {printRows && (
        <section className="ledger-print">
          <h1>Livro caixa · Silex Business</h1>
          <p>
            Período: {dateOnly(applied.start)} a {dateOnly(applied.end)} · Base:{" "}
            {applied.date_field === "posting" ? "Lançamento" : "Competência"} ·
            Conta:{" "}
            {accounts.data?.find((a) => String(a.id) === applied.account_id)
              ?.name || "Todas"}{" "}
            · Busca: {applied.q || "Todas"} · Tipo:{" "}
            {applied.direction || "Todos"} · Origem:{" "}
            {originLabels[applied.origin] || "Todas"} · Comprovante:{" "}
            {applied.has_attachment || "Todos"}
          </p>
          <p>
            {printRows.length} movimentos · Entradas{" "}
            {money(
              printRows.reduce((n, r) => n + Math.max(r.amount_cents, 0), 0),
            )}{" "}
            · Saídas{" "}
            {money(
              printRows.reduce((n, r) => n + Math.max(-r.amount_cents, 0), 0),
            )}
          </p>
          <table>
            <thead>
              <tr>
                {[
                  "Data",
                  "Competência",
                  "Histórico / documento",
                  "Conta",
                  "Valor",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {printRows.map((r) => (
                <tr key={r.id}>
                  <td>{dateOnly(r.posting_date)}</td>
                  <td>{dateOnly(r.competence_date)}</td>
                  <td>
                    {r.description}
                    <small>{r.document}</small>
                  </td>
                  <td>{r.account_name}</td>
                  <td>{money(r.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
function MovementForm({
  direction,
  accounts,
  categories,
  subcategories,
  close,
  done,
}: {
  direction: string;
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  close: () => void;
  done: () => void;
}) {
  const available = subcategories.filter((s) =>
    categories.some(
      (c) =>
        c.id === s.category_id &&
        (c.direction === "both" || c.direction === direction),
    ),
  );
  const [description, setDescription] = useState(""),
    [value, setValue] = useState(""),
    [account, setAccount] = useState(
      String(
        accounts.find((a) => a.kind === "bank")?.id || accounts[0]?.id || "",
      ),
    ),
    [sub, setSub] = useState(String(available[0]?.id || "")),
    [posting, setPosting] = useState(localDate()),
    [competence, setCompetence] = useState(localDate()),
    [document, setDocument] = useState(""),
    [supplier, setSupplier] = useState(""),
    [supplierQuery, setSupplierQuery] = useState(""),
    [method, setMethod] = useState("pix"),
    [requestKey] = useState(() => crypto.randomUUID());
  const suppliers = useLoad<Page<Supplier>>(
    "/suppliers?" + query({ q: supplierQuery, active: true, page_size: 100 }),
  );
  const selected = accounts.find((a) => String(a.id) === account);
  return (
    <Modal
      title={direction === "income" ? "Nova receita" : "Nova despesa"}
      close={close}
    >
      <Form
        cancel={close}
        submit="Salvar lançamento"
        onSubmit={async () => {
          await api("/finance/movements", "POST", {
            description,
            direction,
            amount_cents: parseDecimal(value, 2),
            account_id: Number(account),
            subcategory_id: Number(sub),
            posting_date: posting,
            competence_date: competence,
            document,
            supplier_id:
              direction === "expense" && supplier ? Number(supplier) : null,
            method: selected?.kind === "cash" ? "cash" : method,
            request_key: requestKey,
          });
          done();
        }}
      >
        <div className="form-grid silex-ledger-form">
          <Field label="Histórico *" span>
            <input
              autoFocus
              required
              maxLength={180}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Valor (R$) *">
            <input
              required
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Conta *">
            <select
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subcategoria *">
            <select
              required
              value={sub}
              onChange={(e) => setSub(e.target.value)}
            >
              <option value="">Selecione</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.category_name} / {s.name}
                </option>
              ))}
            </select>
          </Field>
          {selected?.kind === "bank" && (
            <Field label="Forma de pagamento">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="card">Cartão</option>
              </select>
            </Field>
          )}
          <SilexDatePicker label="Data de lançamento *" required min={selected?.opening_date} max={localDate()} value={posting} onChange={(value) => setPosting(value)} />
          <SilexDatePicker label="Data de competência *" required value={competence} onChange={(value) => setCompetence(value)} />
          <Field label="Nº documento">
            <input
              maxLength={100}
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </Field>
          {direction === "expense" && (
            <>
              <Field label="Pesquisar fornecedor">
                <input
                  value={supplierQuery}
                  onChange={(e) => setSupplierQuery(e.target.value)}
                />
              </Field>
              <Field label="Fornecedor">
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  <option value="">Não informado</option>
                  {suppliers.data?.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
        <p className="help">
          Este lançamento registra o pagamento imediatamente. Dinheiro exige seu
          caixa aberto e a data de hoje. Para um compromisso futuro, use Contas
          a Pagar ou Contas a Receber.
        </p>
        {suppliers.error && direction === "expense" && (
          <Notice>{suppliers.error}</Notice>
        )}
      </Form>
    </Modal>
  );
}
function ReverseForm({
  row,
  close,
  done,
}: {
  row: Movement;
  close: () => void;
  done: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Estornar lançamento" close={close}>
      <Form
        cancel={close}
        submit="Confirmar estorno"
        onSubmit={async () => {
          await api(`/finance/movements/${row.id}/reverse`, "POST", {
            reason,
          });
          done();
        }}
      >
        <p className="silex-ledger-form">
          {row.description} · {money(row.amount_cents)}
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
          O original permanece no histórico. Um movimento oposto será registrado
          na data de hoje.
        </p>
      </Form>
    </Modal>
  );
}
