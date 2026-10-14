import { useState } from "react";
import { api, query } from "./api";
import {
  dateOnly,
  decimalInput,
  localDate,
  money,
  parseDecimal,
} from "./format";
import type { Account, Category, Page, Subcategory, Supplier } from "./types";
import {
  ActiveFilter,
  AddButton,
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

type Kind = "accounts" | "categories" | "subcategories" | "suppliers";
type Row = Partial<Account & Category & Subcategory & Omit<Supplier, "kind">> & {
  id: number;
  name: string;
  active: boolean;
};
const titles: Record<Kind, string> = {
  accounts: "Cadastro de Contas",
  categories: "Categorias",
  subcategories: "SubCategorias",
  suppliers: "Fornecedores",
};
const singular: Record<Kind, string> = {
  accounts: "conta",
  categories: "categoria",
  subcategories: "subcategoria",
  suppliers: "fornecedor",
};
const directions: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  both: "Receita e despesa",
};
const classifications: Record<string, string> = {
  operating: "Operacional",
  investment: "Investimento",
  financing: "Financiamento",
};
export function FinanceCatalog({ kind }: { kind: Kind }) {
  const [q, setQ] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [editing, setEditing] = useState<Row | null>(null),
    [adding, setAdding] = useState(false);
  const result = useLoad<Row[] | Page<Row>>(
      "/" +
        kind +
        (kind === "suppliers" ? "?" + query({ q, active, page }) : ""),
      version,
    ),
    categories = useLoad<Category[]>("/categories", version);
  const list = Array.isArray(result.data)
    ? result.data
    : result.data?.items || [];
  const rows =
    kind === "suppliers"
      ? list
      : list.filter(
          (r) =>
            (!q ||
              r.name.toLocaleLowerCase().includes(q.toLocaleLowerCase())) &&
            (!active || r.active === (active === "true")),
        );
  function done() {
    setEditing(null);
    setAdding(false);
    setVersion((v) => v + 1);
  }
  return (
    <>
      <PageTitle
        title={titles[kind]}
        subtitle="Cadastros usados no financeiro. Inative registros para preservar o histórico."
      >
        <AddButton onClick={() => setAdding(true)}>
          {kind === "suppliers" ? "Novo fornecedor" : `Nova ${singular[kind]}`}
        </AddButton>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Pesquisar nome"
          />
          <ActiveFilter
            value={active}
            onChange={(v) => {
              setActive(v);
              setPage(1);
            }}
          />
        </div>
        {result.error && <Notice>{result.error}</Notice>}
        <Table
          headers={[
            "Nome",
            kind === "accounts"
              ? "Saldo atual / referência"
              : kind === "categories"
                ? "Classificação / grupo"
                : kind === "subcategories"
                  ? "Categoria / resultado"
                  : "Documento / contato",
            "Situação",
            "Ações",
          ]}
          loading={result.loading}
          empty={!rows.length}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.name}</strong>
                {kind === "accounts" ? (
                  <small>
                    {r.kind === "cash" ? "Caixa" : "Conta bancária"} · {r.bank}{" "}
                    {r.branch} {r.number}
                  </small>
                ) : kind === "categories" ? (
                  <small>{directions[r.direction || "both"]}</small>
                ) : null}
              </td>
              <td>
                {kind === "accounts" ? (
                  <>
                    {money(r.balance_cents || 0)}
                    <small>
                      Inicial: {money(r.opening_cents || 0)} em{" "}
                      {dateOnly(r.opening_date || null)}
                    </small>
                  </>
                ) : kind === "categories" ? (
                  <>
                    {classifications[r.classification || "operating"]}
                    <small>{r.result_group || "Sem grupo"}</small>
                  </>
                ) : kind === "subcategories" ? (
                  <>
                    {r.category_name}
                    <small>
                      {r.affects_result
                        ? "Incide no resultado"
                        : "Não incide no resultado"}
                    </small>
                  </>
                ) : (
                  <>
                    {r.document || "Não informado"}
                    <small>
                      {r.email} {r.phone}
                    </small>
                  </>
                )}
              </td>
              <td>{r.active ? "Ativo" : "Inativo"}</td>
              <td>
                <button
                  onClick={() => setEditing(r)}
                  aria-label={`Editar ${r.name}`}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </Table>
        {!Array.isArray(result.data) && kind === "suppliers" && (
          <Pagination data={result.data} onPage={setPage} />
        )}
      </section>
      {(adding || editing) && (
        <CatalogForm
          kind={kind}
          row={editing}
          categories={categories.data || []}
          close={() => {
            setAdding(false);
            setEditing(null);
          }}
          done={done}
        />
      )}
    </>
  );
}
function CatalogForm({
  kind,
  row,
  categories,
  close,
  done,
}: {
  kind: Kind;
  row: Row | null;
  categories: Category[];
  close: () => void;
  done: () => void;
}) {
  const [name, setName] = useState(row?.name || ""),
    [active, setActive] = useState(row?.active ?? true),
    [accountKind, setAccountKind] = useState(row?.kind || "bank"),
    [opening, setOpening] = useState(decimalInput(row?.opening_cents || 0)),
    [openingDate, setOpeningDate] = useState(row?.opening_date || localDate()),
    [bank, setBank] = useState(row?.bank || ""),
    [branch, setBranch] = useState(row?.branch || ""),
    [number, setNumber] = useState(row?.number || ""),
    [notes, setNotes] = useState(row?.notes || ""),
    [interest, setInterest] = useState(decimalInput(row?.interest_bps || 0)),
    [fine, setFine] = useState(decimalInput(row?.fine_bps || 0)),
    [direction, setDirection] = useState(row?.direction || "both"),
    [classification, setClassification] = useState(
      row?.classification || "operating",
    ),
    [group, setGroup] = useState(row?.result_group || ""),
    [category, setCategory] = useState(
      String(row?.category_id || categories.find((c) => c.active)?.id || ""),
    ),
    [affects, setAffects] = useState(row?.affects_result ?? true),
    [document, setDocument] = useState(row?.document || ""),
    [email, setEmail] = useState(row?.email || ""),
    [phone, setPhone] = useState(row?.phone || ""),
    [address, setAddress] = useState(row?.address || "");
  return (
    <Modal
      title={`${row ? "Editar" : kind === "suppliers" ? "Novo" : "Nova"} ${singular[kind]}`}
      close={close}
    >
      <Form
        cancel={close}
        onSubmit={async () => {
          let extra = {};
          if (kind === "accounts") {
            const raw = opening.trim();
            const signed = raw.startsWith("-")
              ? -parseDecimal(raw.slice(1), 2)
              : parseDecimal(raw, 2);
            extra = {
              kind: accountKind,
              opening_cents: signed,
              opening_date: openingDate,
              bank,
              branch,
              number,
              notes,
              interest_bps: parseDecimal(interest, 2),
              fine_bps: parseDecimal(fine, 2),
            };
          }
          if (kind === "categories")
            extra = { direction, classification, result_group: group };
          if (kind === "subcategories")
            extra = { category_id: Number(category), affects_result: affects };
          if (kind === "suppliers")
            extra = { document: document || null, email, phone, address };
          await api(
            "/" + kind + (row ? "/" + row.id : ""),
            row ? "PUT" : "POST",
            { name, active, ...extra },
          );
          done();
        }}
      >
        <div className="form-grid">
          <Field label="Nome *" span>
            <input
              autoFocus
              required
              maxLength={kind === "suppliers" ? 150 : 100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {kind === "accounts" && (
            <>
              <Field label="Tipo">
                <select
                  value={accountKind}
                  onChange={(e) => setAccountKind(e.target.value)}
                >
                  <option value="bank">Conta bancária</option>
                  <option value="cash">Caixa</option>
                </select>
              </Field>
              <Field label="Saldo inicial (R$) *">
                <input
                  required
                  inputMode="decimal"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </Field>
              <Field label="Referência do saldo inicial *">
                <input
                  required
                  type="date"
                  max={localDate()}
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </Field>
              <Field label="Banco">
                <input
                  maxLength={100}
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                />
              </Field>
              <Field label="Agência">
                <input
                  maxLength={40}
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </Field>
              <Field label="Número da conta">
                <input
                  maxLength={60}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </Field>
              <Field label="Juros por mês (%)">
                <input
                  required
                  inputMode="decimal"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </Field>
              <Field label="Multa (%)">
                <input
                  required
                  inputMode="decimal"
                  value={fine}
                  onChange={(e) => setFine(e.target.value)}
                />
              </Field>
              <Field label="Observações" span>
                <textarea
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </>
          )}
          {kind === "categories" && (
            <>
              <Field label="Tipo">
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  {Object.entries(directions).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Classificação">
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                >
                  {Object.entries(classifications).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grupo de resultado" span>
                <input
                  maxLength={100}
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                />
              </Field>
            </>
          )}
          {kind === "subcategories" && (
            <>
              <Field label="Categoria *">
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {categories
                    .filter((c) => c.active || c.id === row?.category_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.active ? " (inativa)" : ""}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Incide no resultado">
                <select
                  value={String(affects)}
                  onChange={(e) => setAffects(e.target.value === "true")}
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </Field>
            </>
          )}
          {kind === "suppliers" && (
            <>
              <Field label="CPF / CNPJ">
                <input
                  maxLength={20}
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  maxLength={180}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Telefone">
                <input
                  maxLength={40}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="Endereço">
                <input
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Situação">
            <select
              value={String(active)}
              onChange={(e) => setActive(e.target.value === "true")}
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </Field>
        </div>
        {kind === "accounts" && (
          <p className="help">
            O saldo inicial não é receita. Após existir histórico, tipo, saldo
            inicial e referência ficam protegidos. Os encargos são informados ao
            registrar a quitação.
          </p>
        )}
        {kind === "categories" && !row && (
          <p className="help">
            Uma subcategoria Geral será criada automaticamente.
          </p>
        )}
      </Form>
    </Modal>
  );
}
