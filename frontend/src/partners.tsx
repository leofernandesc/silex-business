import { useState } from "react";
import { Copy } from "lucide-react";
import { api, query } from "./api";
import { decimalInput, money, parseDecimal } from "./format";
import type { Page, PixInfo, Supplier, SupplierKind } from "./types";
import {
  ActiveFilter, AddButton, Field, Form, Modal, Notice, PageTitle,
  Pagination, SearchBox, Table, useLoad,
} from "./ui";

export const partnerKinds: Record<SupplierKind, string> = {
  supplier: "Fornecedor",
  day_worker: "Diarista",
  subcontracted_freight: "Frete subcontratado",
};
export const pixTypes: Record<string, string> = {
  cpf: "CPF", cnpj: "CNPJ", email: "E-mail", phone: "Celular", random: "Chave aleatória",
};
const registries: Record<SupplierKind, { title: string; singular: string; subtitle: string }> = {
  supplier: { title: "Fornecedores", singular: "fornecedor", subtitle: "Dados de contato e pagamento dos fornecedores." },
  day_worker: { title: "Diaristas", singular: "diarista", subtitle: "Prestadores de serviços por diária, contatos e dados PIX." },
  subcontracted_freight: { title: "Frete Subcontratado", singular: "prestador de frete", subtitle: "Transportadores e prestadores de frete, contatos e dados PIX." },
};

export function PixDetails({ pix, name }: { pix: PixInfo; name?: string | null }) {
  const [feedback, setFeedback] = useState(""), [failed, setFailed] = useState(false);
  return <section className="pix-details" aria-label="Dados PIX do beneficiário">
    <div className="pix-heading"><strong>PIX {name ? "· " + name : ""}</strong>
      <button type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(pix.key);
          setFailed(false);
          setFeedback("Chave copiada. Confira o titular no seu banco antes de pagar.");
        } catch {
          setFailed(true);
          setFeedback("Selecione e copie a chave no campo abaixo.");
        }
      }}><Copy size={15} />Copiar chave PIX</button>
    </div>
    <Field label="Chave PIX"><input readOnly value={pix.key} onFocus={event => event.target.select()} /></Field>
    <p>{pixTypes[pix.key_type] || pix.key_type} · Titular: <strong>{pix.holder}</strong></p>
    {feedback && <Notice tone={failed ? "warning" : "success"}>{feedback}</Notice>}
  </section>;
}

export function PartnerRegistry({ kind }: { kind: SupplierKind }) {
  const [q, setQ] = useState(""), [active, setActive] = useState(""),
    [searchField, setSearchField] = useState("all"),
    [page, setPage] = useState(1), [version, setVersion] = useState(0),
    [editing, setEditing] = useState<Supplier | null>(null), [adding, setAdding] = useState(false),
    [message, setMessage] = useState("");
  const definition = registries[kind];
  const result = useLoad<Page<Supplier>>("/suppliers?" + query({ kind, q, active, search_field: searchField, page }), version);
  function done() {
    setAdding(false); setEditing(null); setVersion(value => value + 1);
    setMessage("Cadastro salvo.");
  }
  return <>
    <PageTitle title={definition.title} subtitle={definition.subtitle}>
      <AddButton onClick={() => { setMessage(""); setAdding(true); }}>Novo {definition.singular}</AddButton>
    </PageTitle>
    {message && <Notice tone="success">{message}</Notice>}
    <section className="panel">
      <div className="toolbar">
        <label className="inline-field">Pesquisar por<select value={searchField} onChange={(event) => { setSearchField(event.target.value); setPage(1); }}><option value="all">Todos os campos</option><option value="name">Nome</option><option value="document">Documento</option><option value="phone">Telefone</option><option value="email">E-mail</option><option value="contact">Contato</option><option value="address">Cidade</option><option value="pix">PIX</option></select></label>
        <SearchBox value={q} placeholder="Digite o texto para pesquisar" onChange={value => { setQ(value); setPage(1); }} />
        <ActiveFilter value={active} onChange={value => { setActive(value); setPage(1); }} />
      </div>
      {result.error && <Notice>{result.error}</Notice>}
      <Table headers={["Nome", "CPF / CNPJ", "Contato / cidade", "PIX", "Situação", "Ações"]} loading={result.loading} empty={!result.data?.items.length}>
        {result.data?.items.map(row => <tr key={row.id}>
          <td><strong>{row.name}</strong>{row.notes && <small>{row.notes}</small>}{row.default_rate_cents != null && <small>Referência {money(row.default_rate_cents)}</small>}</td>
          <td>{row.document || "Não informado"}</td>
          <td>{row.contact_name || row.phone || "Não informado"}<small>{[row.phone, row.email, [row.city, row.state].filter(Boolean).join("/")].filter(Boolean).join(" · ")}</small></td>
          <td><span className="pix-key">{row.pix_key || "Não cadastrado"}</span>
            {row.pix_key && <small>{pixTypes[row.pix_key_type]} · {row.pix_holder}</small>}
          </td>
          <td>{row.active ? "Ativo" : "Inativo"}</td>
          <td><button aria-label={"Editar " + row.name} onClick={() => { setMessage(""); setEditing(row); }}>Editar</button></td>
        </tr>)}
      </Table>
      <Pagination data={result.data} onPage={setPage} />
    </section>
    {(adding || editing) && <PartnerForm kind={kind} row={editing} close={() => { setAdding(false); setEditing(null); }} done={done} />}
  </>;
}

function PartnerForm({ kind, row, close, done }: { kind: SupplierKind; row: Supplier | null; close: () => void; done: () => void }) {
  const [name, setName] = useState(row?.name || ""), [document, setDocument] = useState(row?.document || ""),
    [phone, setPhone] = useState(row?.phone || ""), [email, setEmail] = useState(row?.email || ""),
    [contactName, setContactName] = useState(row?.contact_name || ""),
    [address, setAddress] = useState(row?.address || ""), [notes, setNotes] = useState(row?.notes || ""),
    [postalCode, setPostalCode] = useState(row?.postal_code || ""), [street, setStreet] = useState(row?.street || ""),
    [addressNumber, setAddressNumber] = useState(row?.address_number || ""), [complement, setComplement] = useState(row?.complement || ""),
    [neighborhood, setNeighborhood] = useState(row?.neighborhood || ""), [city, setCity] = useState(row?.city || ""), [state, setState] = useState(row?.state || ""),
    [defaultRate, setDefaultRate] = useState(row?.default_rate_cents == null ? "" : decimalInput(row.default_rate_cents)),
    [active, setActive] = useState(row?.active ?? true), [pixType, setPixType] = useState(row?.pix_key_type || ""),
    [pixKey, setPixKey] = useState(row?.pix_key || ""), [pixHolder, setPixHolder] = useState(row?.pix_holder || "");
  const example: Record<string, string> = {
    cpf: "Somente números ou CPF formatado", cnpj: "CNPJ do titular",
    email: "nome@exemplo.com", phone: "+55 (92) 99999-9999",
    random: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  };
  return <Modal title={(row ? "Editar " : "Novo ") + registries[kind].singular} close={close} wide>
    <Form cancel={close} onSubmit={async () => {
      await api("/suppliers" + (row ? "/" + row.id : ""), row ? "PUT" : "POST", {
        kind, name, document: document || null, phone, email, contact_name: contactName, address, postal_code: postalCode, street, address_number: addressNumber, complement, neighborhood, city, state, notes, active,
        default_rate_cents: defaultRate.trim() ? parseDecimal(defaultRate, 2) : null,
        pix_key_type: pixType, pix_key: pixType ? pixKey : "", pix_holder: pixType ? pixHolder : "",
      });
      done();
    }}>
      <div className="form-grid">
        <Field label={kind === "day_worker" ? "Nome completo *" : kind === "supplier" ? "Nome *" : "Nome / razão social *"} span>
          <input autoFocus required maxLength={150} value={name} onChange={event => setName(event.target.value)} />
        </Field>
        <Field label="CPF / CNPJ"><input maxLength={20} value={document} onChange={event => setDocument(event.target.value)} /></Field>
        <Field label="Telefone"><input type="tel" maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} /></Field>
        <Field label="Pessoa de contato"><input maxLength={120} value={contactName} onChange={event => setContactName(event.target.value)} /></Field>
        <Field label="E-mail"><input type="email" maxLength={180} value={email} onChange={event => setEmail(event.target.value)} /></Field>
        <Field label="Situação"><select value={String(active)} onChange={event => setActive(event.target.value === "true")}>
          <option value="true">Ativo</option><option value="false">Inativo</option>
        </select></Field>
        {row?.address && !row.street && <Notice tone="info">Endereço existente: {row.address}. O texto original será preservado.</Notice>}
        <Field label="CEP"><input maxLength={9} value={postalCode} onChange={event => setPostalCode(event.target.value)} /></Field>
        <Field label="Logradouro" span><input maxLength={180} value={street} onChange={event => setStreet(event.target.value)} /></Field>
        <Field label="Número"><input maxLength={30} value={addressNumber} onChange={event => setAddressNumber(event.target.value)} /></Field>
        <Field label="Complemento"><input maxLength={100} value={complement} onChange={event => setComplement(event.target.value)} /></Field>
        <Field label="Bairro"><input maxLength={100} value={neighborhood} onChange={event => setNeighborhood(event.target.value)} /></Field>
        <Field label="Cidade"><input maxLength={100} value={city} onChange={event => setCity(event.target.value)} /></Field>
        <Field label="UF"><input maxLength={2} value={state} onChange={event => setState(event.target.value.toUpperCase())} /></Field>
        <Field label="Endereço em texto livre (legado)" span><input maxLength={300} value={address} onChange={event => setAddress(event.target.value)} /></Field>
        {kind !== "supplier" && <Field label={kind === "day_worker" ? "Valor padrão sugerido por diária (R$)" : "Valor de referência do frete (R$)"}><input inputMode="decimal" value={defaultRate} onChange={event => setDefaultRate(event.target.value)} /></Field>}
        <Field label="Tipo de chave PIX"><select value={pixType} onChange={event => { setPixType(event.target.value); setPixKey(""); setPixHolder(""); }}>
          <option value="">Sem PIX cadastrado</option>
          {Object.entries(pixTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></Field>
        {pixType && <>
          <Field label="Chave PIX *"><input required maxLength={77} autoComplete="off" placeholder={example[pixType]} value={pixKey} onChange={event => setPixKey(event.target.value)} /></Field>
          <Field label="Titular do PIX" span><input maxLength={150} placeholder={name || "Nome do titular"} value={pixHolder} onChange={event => setPixHolder(event.target.value)} /></Field>
        </>}
        <Field label="Observações" span><textarea maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
      </div>
      <p className="help">O cadastro fica disponível em Contas a Pagar. Inativar preserva os títulos e pagamentos existentes. O valor de referência só sugere um preenchimento no serviço; não cria obrigação nem pagamento.</p>
      {pixType && <p className="help">Se o titular ficar vazio, será usado o nome do cadastro. Salvar estes dados não envia pagamentos.</p>}
    </Form>
  </Modal>;
}
