import { useState } from "react";
import { Pencil } from "lucide-react";
import { api, exportCsv, query } from "./api";
import { money, quantity, parseDecimal, decimalInput } from "./format";
import type { Customer, CustomerServiceDetails, Product, Page, User } from "./types";
import {
  useLoad,
  PageTitle,
  AddButton,
  ExportButton,
  SearchBox,
  ActiveFilter,
  Table,
  Pagination,
  Modal,
  Form,
  Field,
  Notice,
  Badge,
} from "./ui";

function CustomerContact({ customer }: { customer: Customer }) {
  const location = [customer.city, customer.state].filter(Boolean).join(" / ");
  return <>
    {customer.contact_name || location || "—"}
    {customer.contact_name && location && <small>{location}</small>}
    {(customer.phone || customer.email) && <small>{[customer.phone, customer.email].filter(Boolean).join(" · ")}</small>}
  </>;
}

export function Customers({ user }: { user: User }) {
  const serviceDetailsEnabled = user.username === "sammya.admin" && user.role === "admin";
  const [q, setQ] = useState(""),
    [searchField, setSearchField] = useState("all"),
    [active, setActive] = useState("true"),
    [page, setPage] = useState(1),
    [version, refresh] = useState(0),
    [editing, setEditing] = useState<Customer | null | undefined>();
  const filters = { q, search_field: searchField, active };
  const result = useLoad<Page<Customer>>(
    "/customers?" + query({ ...filters, page }),
    version,
  );
  return (
    <div className="silex-customers-page">
      <PageTitle
        title="Clientes"
        subtitle="Relacionamentos e dados para suas vendas."
      >
        <ExportButton onClick={() => exportCsv("customers", filters)} />
        <AddButton onClick={() => setEditing(null)}>Novo cliente</AddButton>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <label className="inline-field">Pesquisar por<select value={searchField} onChange={(e) => { setSearchField(e.target.value); setPage(1); }}><option value="all">Todos os campos</option><option value="name">Nome</option><option value="document">Documento</option><option value="phone">Telefone</option><option value="email">E-mail</option><option value="contact">Contato</option><option value="address">Cidade</option></select></label>
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Digite o texto para pesquisar"
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
        <p className="silex-customers-scroll-hint">
          Deslize a tabela para acessar todas as colunas.
        </p>
        <Table
          headers={[
            "Código",
            "Nome",
            "Documento",
            "Contato / cidade",
            "Situação",
            "Ações",
          ]}
          loading={result.loading}
          empty={!result.data?.items.length}
        >
          {result.data?.items.map((row) => (
            <tr key={row.id}>
              <td className="muted">#{row.id}</td>
              <td>
                <strong>{row.name}</strong>
                <small>{[row.street, row.address_number, row.neighborhood, row.city, row.state].filter(Boolean).join(", ") || row.address || "Endereço não informado"}</small>
              </td>
              <td>{row.document || "—"}</td>
              <td>
                <CustomerContact customer={row} />
              </td>
              <td>
                <Badge status={row.active ? "active" : "inactive"} />
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Editar ${row.name}`}
                  onClick={() => setEditing(row)}
                >
                  <Pencil size={17} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination data={result.data} onPage={setPage} />
      </section>
      {editing !== undefined && (
        <CustomerForm
          customer={editing}
          serviceDetailsEnabled={serviceDetailsEnabled}
          close={() => setEditing(undefined)}
          done={() => {
            setEditing(undefined);
            refresh(version + 1);
          }}
        />
      )}
    </div>
  );
}
function CustomerForm({
  customer,
  serviceDetailsEnabled,
  close,
  done,
}: {
  customer: Customer | null;
  serviceDetailsEnabled: boolean;
  close: () => void;
  done: () => void;
}) {
  const [name, setName] = useState(customer?.name || ""),
    [document, setDocument] = useState(customer?.document || ""),
    [email, setEmail] = useState(customer?.email || ""),
    [phone, setPhone] = useState(customer?.phone || ""),
    [contactName, setContactName] = useState(customer?.contact_name || ""),
    [address, setAddress] = useState(customer?.address || ""),
    [postalCode, setPostalCode] = useState(customer?.postal_code || ""),
    [street, setStreet] = useState(customer?.street || ""),
    [addressNumber, setAddressNumber] = useState(customer?.address_number || ""),
    [complement, setComplement] = useState(customer?.complement || ""),
    [neighborhood, setNeighborhood] = useState(customer?.neighborhood || ""),
    [city, setCity] = useState(customer?.city || ""),
    [state, setState] = useState(customer?.state || ""),
    [active, setActive] = useState(customer?.active ?? true),
    [startAddress, setStartAddress] = useState(customer?.service_details?.start_address || ""),
    [endAddress, setEndAddress] = useState(customer?.service_details?.end_address || ""),
    [serviceType, setServiceType] = useState<CustomerServiceDetails["service_type"]>(customer?.service_details?.service_type ?? null);
  return (
    <Modal title={customer ? "Editar cliente" : "Novo cliente"} close={close}>
      <Form
        cancel={close}
        onSubmit={async () => {
          await api(
            "/customers" + (customer ? "/" + customer.id : ""),
            customer ? "PUT" : "POST",
            { name, document: document || null, email, phone, contact_name: contactName, address, postal_code: postalCode, street, address_number: addressNumber, complement, neighborhood, city, state, active,
              ...(serviceDetailsEnabled ? { service_details: { start_address: startAddress, end_address: endAddress, service_type: serviceType } } : {}),
            },
          );
          done();
        }}
      >
        <div className="form-grid">
          <Field label="Nome *" span>
            <input
              autoFocus
              required
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="CPF / CNPJ">
            <input
              maxLength={20}
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </Field>
          <Field label="Telefone">
            <input
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Pessoa de contato">
            <input maxLength={120} value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              maxLength={180}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {customer?.address && !customer.street && <Notice tone="info">Endereço existente: {customer.address}. Ele será preservado até você substituí-lo pelos campos separados.</Notice>}
          <Field label="CEP">
            <input maxLength={9} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </Field>
          <Field label="Logradouro" span>
            <input maxLength={180} value={street} onChange={(e) => setStreet(e.target.value)} />
          </Field>
          <Field label="Número">
            <input maxLength={30} value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
          </Field>
          <Field label="Complemento">
            <input maxLength={100} value={complement} onChange={(e) => setComplement(e.target.value)} />
          </Field>
          <Field label="Bairro">
            <input maxLength={100} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="UF">
            <input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Endereço em texto livre (legado)" span>
            <input
              maxLength={300}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Cliente ativo
          </label>
        </div>
        {serviceDetailsEnabled && <section aria-label="Dados do serviço">
          <h3>Dados do serviço</h3>
          <div className="form-grid">
            <Field label="Endereço inicial" span>
              <textarea maxLength={2000} value={startAddress} onChange={(e) => setStartAddress(e.target.value)} />
            </Field>
            <Field label="Endereço final" span>
              <textarea maxLength={2000} value={endAddress} onChange={(e) => setEndAddress(e.target.value)} />
            </Field>
            <Field label="Tipo de serviço">
              <select value={serviceType ?? ""} onChange={(e) => setServiceType((e.target.value || null) as CustomerServiceDetails["service_type"])}>
                <option value="">Não informado</option>
                <option value="local">Local</option>
                <option value="interstate">Interestadual</option>
              </select>
            </Field>
          </div>
        </section>}
      </Form>
    </Modal>
  );
}
export function Products({ user }: { user: User }) {
  const [q, setQ] = useState(""),
    [kind, setKind] = useState(""),
    [groupName, setGroupName] = useState(""),
    [active, setActive] = useState("true"),
    [page, setPage] = useState(1),
    [version, refresh] = useState(0),
    [editing, setEditing] = useState<Product | null | undefined>();
  const filters = { q, active, product_kind: kind, group_name: groupName };
  const result = useLoad<Page<Product>>(
    "/products?" + query({ q, active, kind, group_name: groupName, page }),
    version,
  );
  return (
    <>
      <PageTitle
        title="Produtos ou Serviços"
        subtitle="Seu catálogo, preços e disponibilidade em um só lugar."
      >
        <ExportButton onClick={() => exportCsv("products", filters)} />
        {user.role === "admin" && (
          <AddButton onClick={() => setEditing(null)}>Novo item</AddButton>
        )}
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Descrição, código ou código de barras"
          />
          <label className="inline-field">Tipo<select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">Produtos ou Serviços</option><option value="product">Produtos</option><option value="service">Serviços</option></select></label>
          <label className="inline-field">Grupo<input value={groupName} onChange={(e) => { setGroupName(e.target.value); setPage(1); }} placeholder="Todos os grupos" /></label>
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
            "Código",
            "Descrição",
            "Tipo",
            "Grupo",
            "Estoque",
            "Preço de venda",
            "Situação",
            "Ações",
          ]}
          loading={result.loading}
          empty={!result.data?.items.length}
        >
          {result.data?.items.map((row) => (
            <tr key={row.id}>
              <td className="muted">{row.code}</td>
              <td>
                <strong>{row.description}</strong>
                <small>{row.barcode || "Sem código de barras"}</small>
              </td>
              <td>
                <Badge status={row.kind} />
              </td>
              <td>{row.group_name || "—"}</td>
              <td>
                {row.kind === "product"
                  ? `${quantity(row.stock_milli)} ${row.unit}`
                  : "—"}
              </td>
              <td className="numeric">{money(row.price_cents)}</td>
              <td>
                <Badge status={row.active ? "active" : "inactive"} />
              </td>
              <td>
                {user.role === "admin" && (
                  <button
                    className="icon-button"
                    aria-label={`Editar ${row.description}`}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil size={17} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
        <Pagination data={result.data} onPage={setPage} />
      </section>
      {editing !== undefined && (
        <ProductForm
          product={editing}
          close={() => setEditing(undefined)}
          done={() => {
            setEditing(undefined);
            refresh(version + 1);
          }}
        />
      )}
    </>
  );
}
function ProductForm({
  product,
  close,
  done,
}: {
  product: Product | null;
  close: () => void;
  done: () => void;
}) {
  const [code, setCode] = useState(product?.code || ""),
    [description, setDescription] = useState(product?.description || ""),
    [kind, setKind] = useState(product?.kind || "product"),
    [groupName, setGroupName] = useState(product?.group_name || ""),
    [unit, setUnit] = useState(product?.unit || "UN"),
    [barcode, setBarcode] = useState(product?.barcode || ""),
    [price, setPrice] = useState(
      product ? decimalInput(product.price_cents) : "",
    ),
    [active, setActive] = useState(product?.active ?? true);
  return (
    <Modal title={product ? "Editar item" : "Novo item"} close={close}>
      <Form
        cancel={close}
        onSubmit={async () => {
          await api(
            "/products" + (product ? "/" + product.id : ""),
            product ? "PUT" : "POST",
            {
              code,
              description,
              kind,
              group_name: groupName,
              unit,
              barcode: barcode || null,
              price_cents: parseDecimal(price, 2),
              active,
            },
          );
          done();
        }}
      >
        <div className="form-grid">
          <Field label="Descrição *" span>
            <input
              autoFocus
              required
              maxLength={180}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Código *">
            <input
              required
              maxLength={40}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Tipo">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Product["kind"])}
            >
              <option value="product">Produto</option>
              <option value="service">Serviço</option>
            </select>
          </Field>
          <Field label="Grupo">
            <input maxLength={100} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex.: limpeza, manutenção" />
          </Field>
          <Field label="Unidade *">
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {[
                "UN",
                "KG",
                "LT",
                "MT",
                "HR",
                "CX",
                ...(product &&
                !["UN", "KG", "LT", "MT", "HR", "CX"].includes(product.unit)
                  ? [product.unit]
                  : []),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Preço de venda (R$) *">
            <input
              required
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Código de barras" span>
            <input
              maxLength={60}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Item ativo
          </label>
        </div>
        <p className="help">
          O saldo é atualizado pelos lançamentos de estoque e pelas vendas.
        </p>
      </Form>
    </Modal>
  );
}
