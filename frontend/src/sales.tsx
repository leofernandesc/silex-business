import { SilexDatePicker } from "./SilexDatePicker";
import { useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Eye,
  Printer,
  Check,
  Package,
  Search,
} from "lucide-react";
import { api, exportCsv, query } from "./api";
import {
  dateTime,
  dateOnly,
  decimalInput,
  itemTotal,
  localDate,
  money,
  parseDecimal,
  quantity,
  labels,
} from "./format";
import type { Cash, Customer, Page, Product, Sale, User } from "./types";
import {
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
  Table,
  useLoad,
} from "./ui";

type CartRow = { product: Product; qty: string; price: string };
export function PointOfSale({
  user,
  navigate,
}: {
  user: User;
  navigate: (p: string) => void;
}) {
  const [q, setQ] = useState(""),
    [customerQ, setCustomerQ] = useState(""),
    [customer, setCustomer] = useState(""),
    [cart, setCart] = useState<CartRow[]>([]),
    [discount, setDiscount] = useState("0,00"),
    [method, setMethod] = useState("cash"),
    [due, setDue] = useState(localDate()),
    [version, refresh] = useState(0),
    [draft, setDraft] = useState<Sale | null>(null),
    [view, setView] = useState<Sale | null>(null),
    [saveError, setSaveError] = useState(""),
    [saving, setSaving] = useState(false);
  const products = useLoad<Page<Product>>(
      "/products?" + query({ q, active: true, page_size: 100 }),
      version,
    ),
    customers = useLoad<Page<Customer>>(
      "/customers?" + query({ q: customerQ, active: true, page_size: 100 }),
    ),
    cash = useLoad<Cash | null>("/cash-sessions/current", version);
  let subtotal = 0,
    discountN = 0,
    valid = true;
  try {
    subtotal = cart.reduce(
      (total, row) =>
        total + itemTotal(parseDecimal(row.price, 2), parseDecimal(row.qty, 3)),
      0,
    );
    discountN = parseDecimal(discount, 2);
  } catch {
    valid = false;
  }
  const total = subtotal - discountN;
  function add(product: Product) {
    if (draft) return;
    const exists = cart.find((row) => row.product.id === product.id);
    if (exists) {
      try {
        const next = parseDecimal(exists.qty, 3) + 1000;
        setCart(
          cart.map((row) =>
            row === exists ? { ...row, qty: decimalInput(next, 3) } : row,
          ),
        );
        setSaveError("");
      } catch {
        setSaveError(
          "Corrija a quantidade deste item antes de adicioná-lo novamente.",
        );
      }
    } else {
      setCart([
        ...cart,
        { product, qty: "1", price: decimalInput(product.price_cents) },
      ]);
    }
  }
  function update(index: number, key: "qty" | "price", value: string) {
    setCart((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    );
  }
  function reset() {
    setDraft(null);
    setCart([]);
    setDiscount("0,00");
    setCustomer("");
    setSaveError("");
    refresh(version + 1);
  }
  async function ensureDraft() {
    if (draft) return draft;
    if (!cart.length) throw new Error("Adicione ao menos um item");
    const saved = await api<Sale>("/sales", "POST", {
      customer_id: customer ? Number(customer) : null,
      discount_cents: parseDecimal(discount, 2),
      items: cart.map((r) => ({
        product_id: r.product.id,
        quantity_milli: parseDecimal(r.qty, 3),
        unit_price_cents: parseDecimal(r.price, 2),
      })),
    });
    setDraft(saved);
    return saved;
  }
  async function save() {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const s = await ensureDraft();
      setView(s);
      reset();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Frente de Caixa"
        subtitle="Monte o pedido e registre o pagamento manualmente."
      >
        <button onClick={() => navigate("sales")}>Histórico de vendas</button>
      </PageTitle>
      {!cash.loading && !cash.data && (
        <Notice tone="warning">
          Seu caixa está fechado.{" "}
          <button onClick={() => navigate("cash")}>Abrir caixa</button>
        </Notice>
      )}
      {draft && (
        <Notice tone="info">
          Rascunho #{draft.id} preservado. Você pode repetir a finalização após
          corrigir o pagamento ou consultar o histórico.
        </Notice>
      )}
      {saveError && <Notice>{saveError}</Notice>}
      <div className="pos-layout">
        <section className="panel pos-catalog">
          <div className="panel-heading">
            <h2>
              <Package size={18} />
              Catálogo
            </h2>
          </div>
          <div className="toolbar">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Buscar item ou código de barras"
            />
          </div>
          {products.error && <Notice>{products.error}</Notice>}
          <div className="product-grid">
            {products.data?.items.map((p) => (
              <button
                key={p.id}
                className="product-tile"
                disabled={
                  !!draft ||
                  saving ||
                  (p.kind === "product" && p.stock_milli === 0)
                }
                onClick={() => add(p)}
              >
                <div className="tile-top">
                  <span className="tile-symbol">
                    <Package size={21} />
                  </span>
                  <small>{p.code}</small>
                </div>
                <strong>{p.description}</strong>
                <span className="tile-stock">
                  {p.kind === "service"
                    ? "Serviço"
                    : `${quantity(p.stock_milli)} ${p.unit} disponíveis`}
                </span>
                <b>{money(p.price_cents)}</b>
                <span className="tile-add">Adicionar +</span>
              </button>
            ))}
            {!products.loading && !products.data?.items.length && (
              <div className="empty">Nenhum item disponível.</div>
            )}
          </div>
        </section>
        <section className="panel pos-cart">
          <div className="panel-heading">
            <h2>
              <ShoppingCart size={19} />
              Pedido atual
            </h2>
            <span className="badge">{cart.length} itens</span>
          </div>
          <Form
            submit={draft ? "Repetir finalização" : "Finalizar venda"}
            onSubmit={async () => {
              if (saving) throw new Error("Aguarde o salvamento");
              if (!cash.data)
                throw new Error("Abra seu caixa antes de finalizar");
              const s = await ensureDraft();
              const result = await api<Sale>(
                `/sales/${s.id}/finalize`,
                "POST",
                { method, due_date: method === "credit" ? due : null },
              );
              setView(result);
              reset();
            }}
          >
            <div className="cart-body">
              <fieldset disabled={!!draft || saving}>
                <div className="customer-select">
                  <Field label="Pesquisar cliente">
                    <input
                      placeholder="Nome ou documento (opcional)"
                      value={customerQ}
                      onChange={(e) => setCustomerQ(e.target.value)}
                    />
                  </Field>
                  <Field label="Cliente">
                    <select
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    >
                      <option value="">Consumidor final</option>
                      {customers.data?.items.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {!cart.length && (
                  <div className="empty cart-empty">
                    <ShoppingCart size={34} />
                    <strong>Seu pedido começa aqui</strong>
                    <span>Escolha os produtos ou serviços ao lado.</span>
                  </div>
                )}
                {cart.map((row, i) => {
                  let rowTotal = 0;
                  try {
                    rowTotal = itemTotal(
                      parseDecimal(row.price, 2),
                      parseDecimal(row.qty, 3),
                    );
                  } catch {
                    /* valida no envio */
                  }
                  return (
                    <div className="cart-row" key={row.product.id}>
                      <div className="cart-row-head">
                        <strong>{row.product.description}</strong>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={`Remover ${row.product.description}`}
                          onClick={() =>
                            setCart((rows) => rows.filter((_, n) => n !== i))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="cart-inputs">
                        <Field label={`Quantidade (${row.product.unit})`}>
                          <input
                            required
                            inputMode="decimal"
                            value={row.qty}
                            onChange={(e) => update(i, "qty", e.target.value)}
                          />
                        </Field>
                        <Field label="Valor unitário (R$)">
                          <input
                            required
                            inputMode="decimal"
                            value={row.price}
                            onChange={(e) => update(i, "price", e.target.value)}
                          />
                        </Field>
                        <strong>{money(rowTotal)}</strong>
                      </div>
                    </div>
                  );
                })}
                <div className="totals">
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <Field label="Desconto total (R$)">
                  <input
                    inputMode="decimal"
                    required
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </Field>
              </fieldset>
              <div className="totals grand">
                <span>Total do pedido</span>
                <strong>
                  {valid ? money(Math.max(0, total)) : "Confira os valores"}
                </strong>
              </div>
              <Field label="Forma de pagamento">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="cash">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="card">Cartão</option>
                  <option value="credit">A prazo — vencimento único</option>
                </select>
              </Field>
              {method === "credit" && (
                <SilexDatePicker label="Vencimento *" required min={localDate()} value={due} onChange={(value) => setDue(value)} />
              )}
              <p className="help">
                Registro manual do pagamento. Recibo sem valor fiscal.
              </p>
              <button
                type="button"
                className="save-draft"
                disabled={!cart.length || saving}
                onClick={save}
              >
                {saving ? "Salvando..." : "Salvar rascunho"}
              </button>
            </div>
          </Form>
        </section>
      </div>
      {view && (
        <SaleDetail
          sale={view}
          user={user}
          close={() => {
            setView(null);
            refresh(version + 1);
          }}
          onChange={(s) => setView(s)}
        />
      )}
    </>
  );
}
export function SalesPage({
  user,
  navigate,
}: {
  user: User;
  navigate: (p: string) => void;
}) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [page, setPage] = useState(1),
    [version, refresh] = useState(0),
    [view, setView] = useState<Sale | null>(null);
  const filters = { q, status, start, end },
    result = useLoad<Page<Sale>>(
      "/sales?" + query({ ...filters, page }),
      version,
    );
  const reset = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };
  return (
    <>
      <PageTitle
        title="Vendas"
        subtitle="Rascunhos, vendas concluídas e cancelamentos."
      >
        <ExportButton onClick={() => exportCsv("sales", filters)} />
        <button className="primary" onClick={() => navigate("pos")}>
          Nova venda
        </button>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={reset(setQ)}
            placeholder="Número da venda ou cliente"
          />
          <label className="inline-field">
            Situação
            <select
              value={status}
              onChange={(e) => reset(setStatus)(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="draft">Rascunhos</option>
              <option value="finalized">Finalizadas</option>
              <option value="canceled">Canceladas</option>
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
            "Venda",
            "Cliente",
            "Data",
            "Pagamento",
            "Total",
            "Situação",
            "Ações",
          ]}
          loading={result.loading}
          empty={!result.data?.items.length}
        >
          {result.data?.items.map((s) => (
            <tr key={s.id}>
              <td>#{s.id}</td>
              <td>{s.customer_name}</td>
              <td>{dateTime(s.created_at)}</td>
              <td>
                {labels[s.payment_method || ""] || "—"}
                {s.due_date && <small>Vence: {dateOnly(s.due_date)}</small>}
              </td>
              <td className="numeric">{money(s.total_cents)}</td>
              <td>
                <Badge status={s.status} />
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Ver venda ${s.id}`}
                  onClick={() => setView(s)}
                >
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination data={result.data} onPage={setPage} />
      </section>
      {view && (
        <SaleDetail
          sale={view}
          user={user}
          close={() => setView(null)}
          onChange={(s) => {
            setView(s);
            refresh(version + 1);
          }}
        />
      )}
    </>
  );
}
export function SaleDetail({
  sale,
  user,
  close,
  onChange,
}: {
  sale: Sale;
  user: User;
  close: () => void;
  onChange: (s: Sale) => void;
}) {
  const [method, setMethod] = useState("cash"),
    [due, setDue] = useState(localDate()),
    [canceling, setCanceling] = useState(false),
    [reason, setReason] = useState("");
  return (
    <Modal title={`Venda #${sale.id}`} close={close} wide>
      <div className="receipt">
        <div className="receipt-heading">
          <div>
            <h2>Gestão</h2>
            <p>Recibo sem valor fiscal</p>
          </div>
          <Badge status={sale.status} />
        </div>
        <dl className="receipt-meta">
          <div>
            <dt>Venda</dt>
            <dd>#{sale.id}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{sale.customer_name}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{dateTime(sale.created_at)}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>{labels[sale.payment_method || ""] || "Não registrado"}</dd>
          </div>
        </dl>
        <Table
          headers={["Item", "Qtd.", "Preço unitário", "Total"]}
          empty={false}
        >
          {sale.items.map((i) => (
            <tr key={i.product_id}>
              <td>{i.description}</td>
              <td>
                {quantity(i.quantity_milli)} {i.unit}
              </td>
              <td>{money(i.unit_price_cents)}</td>
              <td>{money(i.total_cents)}</td>
            </tr>
          ))}
        </Table>
        <div className="totals">
          <span>Desconto</span>
          <strong>{money(sale.discount_cents)}</strong>
        </div>
        <div className="totals grand">
          <span>Total</span>
          <strong>{money(sale.total_cents)}</strong>
        </div>
        {sale.due_date && (
          <p>
            Vencimento: {dateOnly(sale.due_date)} ·{" "}
            {labels[sale.finance_status || ""]}
          </p>
        )}
        {sale.cancel_reason && <p>Cancelamento: {sale.cancel_reason}</p>}
      </div>
      <div className="actions receipt-actions">
        {sale.status === "finalized" && (
          <button onClick={() => window.print()}>
            <Printer size={17} />
            Imprimir recibo
          </button>
        )}
        {sale.status !== "canceled" &&
          (sale.status === "draft" || user.role === "admin") && (
            <button className="danger" onClick={() => setCanceling(!canceling)}>
              Cancelar venda
            </button>
          )}
      </div>
      {canceling && (
        <Form
          submit="Confirmar cancelamento"
          onSubmit={async () => {
            const result = await api<Sale>(`/sales/${sale.id}/cancel`, "POST", {
              reason,
            });
            setCanceling(false);
            onChange(result);
          }}
        >
          <Field label="Motivo do cancelamento *">
            <textarea
              required
              minLength={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </Form>
      )}
      {sale.status === "draft" && sale.user_id === user.id && !canceling && (
        <Form
          submit="Finalizar rascunho"
          onSubmit={async () => {
            onChange(
              await api<Sale>(`/sales/${sale.id}/finalize`, "POST", {
                method,
                due_date: method === "credit" ? due : null,
              }),
            );
          }}
        >
          <div className="form-grid">
            <Field label="Pagamento">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {["cash", "pix", "card", "credit"].map((m) => (
                  <option key={m} value={m}>
                    {labels[m]}
                  </option>
                ))}
              </select>
            </Field>
            {method === "credit" && (
              <SilexDatePicker label="Vencimento *" required min={localDate()} value={due} onChange={(value) => setDue(value)} />
            )}
          </div>
        </Form>
      )}
    </Modal>
  );
}
