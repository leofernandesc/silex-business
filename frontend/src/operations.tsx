import { useState } from "react";
import { Banknote, ArrowDownLeft, ArrowUpRight, Printer } from "lucide-react";
import { api, exportCsv, query } from "./api";
import {
  dateTime,
  decimalInput,
  money,
  parseDecimal,
  quantity,
  labels,
} from "./format";
import type { Cash, Page, Product, Stock } from "./types";
import {
  AddButton,
  Badge,
  Dates,
  ExportButton,
  Field,
  Form,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  SearchBox,
  SummaryCard,
  Table,
  useLoad,
} from "./ui";

export function StockPage() {
  const [q, setQ] = useState(""),
    [kind, setKind] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [page, setPage] = useState(1),
    [version, refresh] = useState(0),
    [modal, setModal] = useState(false);
  const filters = { q, kind, start, end };
  const result = useLoad<Page<Stock>>(
    "/stock-movements?" + query({ ...filters, page }),
    version,
  );
  const reset = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };
  return (
    <>
      <PageTitle
        title="Movimentações de estoque"
        subtitle="Entradas, saídas e ajustes com histórico preservado."
      >
        <ExportButton onClick={() => exportCsv("stock", filters)} />
        <AddButton onClick={() => setModal(true)}>Novo lançamento</AddButton>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={reset(setQ)}
            placeholder="Item ou motivo"
          />
          <label className="inline-field">
            Tipo
            <select
              value={kind}
              onChange={(e) => reset(setKind)(e.target.value)}
            >
              <option value="">Todos</option>
              {["opening", "in", "out", "inventory", "sale", "reversal"].map(
                (v) => (
                  <option key={v} value={v}>
                    {labels[v]}
                  </option>
                ),
              )}
            </select>
          </label>
          <Dates
            start={start}
            end={end}
            setStart={reset(setStart)}
            setEnd={reset(setEnd)}
          />
        </div>
        {result.error && <Notice>{result.error}</Notice>}
        <Table
          headers={[
            "Item",
            "Tipo",
            "Quantidade",
            "Motivo",
            "Responsável",
            "Data",
          ]}
          loading={result.loading}
          empty={!result.data?.items.length}
        >
          {result.data?.items.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.product_description}</strong>
                <small>Movimento #{row.id}</small>
              </td>
              <td>
                <Badge status={row.kind} />
              </td>
              <td className={row.quantity_milli >= 0 ? "positive" : "negative"}>
                {row.quantity_milli > 0 ? "+" : ""}
                {quantity(row.quantity_milli)}
              </td>
              <td>{row.reason}</td>
              <td>{row.operator_name}</td>
              <td>{dateTime(row.created_at)}</td>
            </tr>
          ))}
        </Table>
        <Pagination data={result.data} onPage={setPage} />
      </section>
      {modal && (
        <StockForm
          close={() => setModal(false)}
          done={() => {
            setModal(false);
            refresh(version + 1);
          }}
        />
      )}
    </>
  );
}
function StockForm({ close, done }: { close: () => void; done: () => void }) {
  const [q, setQ] = useState(""),
    [product, setProduct] = useState(""),
    [kind, setKind] = useState("in"),
    [qty, setQty] = useState(""),
    [reason, setReason] = useState("");
  const result = useLoad<Page<Product>>(
    "/products?" + query({ q, active: true, page_size: 100 }),
  );
  const selected = result.data?.items.find((p) => p.id === Number(product));
  return (
    <Modal title="Novo lançamento de estoque" close={close}>
      <Form
        cancel={close}
        onSubmit={async () => {
          await api("/stock-movements", "POST", {
            product_id: Number(product),
            kind,
            quantity_milli: parseDecimal(qty, 3),
            reason,
          });
          done();
        }}
      >
        <div className="form-grid">
          <Field label="Pesquisar produto" span>
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setProduct("");
              }}
            />
          </Field>
          <Field label="Produto *" span>
            <select
              required
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Selecione um produto</option>
              {result.data?.items
                .filter((p) => p.kind === "product")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.description}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
              <option value="inventory">Inventário (saldo contado)</option>
              <option value="opening">Saldo inicial</option>
            </select>
          </Field>
          <Field
            label={kind === "inventory" ? "Saldo contado *" : "Quantidade *"}
          >
            <input
              required
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Field label="Motivo *" span>
            <textarea
              required
              minLength={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
        {selected && (
          <p className="help">
            Saldo atual: {quantity(selected.stock_milli)} {selected.unit}.{" "}
            {kind === "inventory"
              ? "Informe o saldo final contado; o ajuste é calculado automaticamente."
              : "Informe a quantidade do movimento."}
          </p>
        )}
      </Form>
    </Modal>
  );
}
export function CashPage() {
  const [version, refresh] = useState(0),
    [page, setPage] = useState(1),
    [opening, setOpening] = useState(false),
    [closing, setClosing] = useState<Cash | null>(null);
  const current = useLoad<Cash | null>("/cash-sessions/current", version),
    history = useLoad<Page<Cash>>("/cash-sessions?" + query({ page }), version);
  function done() {
    setOpening(false);
    setClosing(null);
    refresh(version + 1);
  }
  return (
    <>
      <PageTitle
        title="Controle de caixa"
        subtitle="Acompanhe o dinheiro físico e a conferência de cada turno."
      >
        {!current.loading && !current.data && (
          <AddButton onClick={() => setOpening(true)}>
            Abrir meu caixa
          </AddButton>
        )}
        {current.data && (
          <button className="primary" onClick={() => setClosing(current.data)}>
            Fechar meu caixa
          </button>
        )}
      </PageTitle>
      {current.error && <Notice>{current.error}</Notice>}
      <div className="summary-grid three">
        <SummaryCard
          label="Meu caixa"
          value={current.data ? "Aberto" : "Fechado"}
          detail={
            current.data
              ? `Aberto em ${dateTime(current.data.opened_at)}`
              : "Abra um turno para finalizar vendas."
          }
          icon={<Banknote />}
        />
        <SummaryCard
          label="Fundo de abertura"
          value={money(current.data?.opening_cents || 0)}
          detail="Valor inicial; não é receita."
          tone="teal"
          icon={<ArrowDownLeft />}
        />
        <SummaryCard
          label="Dinheiro esperado"
          value={money(current.data?.expected_cents || 0)}
          detail="Fundo + entradas − saídas em dinheiro."
          tone="amber"
          icon={<ArrowUpRight />}
        />
      </div>
      <Notice tone="info">
        Pix e cartão são registrados na conta bancária e não alteram o dinheiro
        esperado na gaveta.
      </Notice>
      <section className="panel">
        <div className="panel-heading">
          <h2>Histórico de turnos</h2>
        </div>
        {history.error && <Notice>{history.error}</Notice>}
        <Table
          headers={[
            "Turno",
            "Responsável",
            "Abertura",
            "Situação",
            "Esperado",
            "Contado",
            "Diferença",
            "Ações",
          ]}
          loading={history.loading}
          empty={!history.data?.items.length}
        >
          {history.data?.items.map((row) => (
            <tr key={row.id}>
              <td>#{row.id}</td>
              <td>{row.operator_name}</td>
              <td>
                {dateTime(row.opened_at)}
                <small>
                  {row.closed_at ? `Fechado: ${dateTime(row.closed_at)}` : ""}
                </small>
              </td>
              <td>
                <Badge status={row.status} />
              </td>
              <td>{money(row.expected_cents)}</td>
              <td>
                {row.counted_cents !== null ? money(row.counted_cents) : "—"}
              </td>
              <td className={row.difference_cents ? "negative" : ""}>
                {row.difference_cents !== null
                  ? money(row.difference_cents)
                  : "—"}
              </td>
              <td>
                {row.status === "open" && (
                  <button onClick={() => setClosing(row)}>Fechar</button>
                )}
              </td>
            </tr>
          ))}
        </Table>
        <Pagination data={history.data} onPage={setPage} />
      </section>
      {opening && <OpenCash close={() => setOpening(false)} done={done} />}{" "}
      {closing && (
        <CloseCash cash={closing} close={() => setClosing(null)} done={done} />
      )}
    </>
  );
}
function OpenCash({ close, done }: { close: () => void; done: () => void }) {
  const [value, setValue] = useState("0,00");
  return (
    <Modal title="Abrir meu caixa" close={close}>
      <Form
        cancel={close}
        submit="Confirmar abertura"
        onSubmit={async () => {
          await api("/cash-sessions", "POST", {
            opening_cents: parseDecimal(value, 2),
          });
          done();
        }}
      >
        <Field label="Dinheiro inicial (R$) *">
          <input
            autoFocus
            required
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <p className="help">
          Conte o fundo de troco. Esse valor não entra no faturamento.
        </p>
      </Form>
    </Modal>
  );
}
function CloseCash({
  cash,
  close,
  done,
}: {
  cash: Cash;
  close: () => void;
  done: () => void;
}) {
  const [value, setValue] = useState(decimalInput(cash.expected_cents));
  let diff: number | null = null;
  try {
    diff = parseDecimal(value, 2) - cash.expected_cents;
  } catch {
    /*exibe após validar*/
  }
  return (
    <Modal title={`Fechar caixa #${cash.id}`} close={close}>
      <Form
        cancel={close}
        submit="Confirmar fechamento"
        onSubmit={async () => {
          await api(`/cash-sessions/${cash.id}/close`, "POST", {
            counted_cents: parseDecimal(value, 2),
          });
          done();
        }}
      >
        <div className="totals">
          <span>Dinheiro esperado</span>
          <strong>{money(cash.expected_cents)}</strong>
        </div>
        <Field label="Dinheiro contado (R$) *">
          <input
            autoFocus
            required
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        {diff !== null && (
          <div className="totals">
            <span>Diferença</span>
            <strong className={diff ? "negative" : "positive"}>
              {money(diff)}
            </strong>
          </div>
        )}
        <Notice tone="info">
          O fechamento preserva o valor esperado e a diferença da conferência.
          Vendas deste turno não poderão ser canceladas depois.
        </Notice>
      </Form>
    </Modal>
  );
}
