import { useEffect, useState } from "react";
import { api } from "./api";
import type { CompanySettings } from "./types";
import { Field, Form, Notice, PageTitle } from "./ui";

export function CompanySettingsPage({ onSaved }: { onSaved: (value: CompanySettings) => void }) {
  const [value, setValue] = useState<CompanySettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { api<CompanySettings>("/company-settings").then(setValue).catch((e) => setError(e.message)); }, []);
  if (!value) return <>{error && <Notice>{error}</Notice>}<div className="empty">Carregando identificação da empresa…</div></>;
  const change = (field: keyof CompanySettings, text: string) => setValue((current) => current ? ({ ...current, [field]: text }) : current);
  return <>
    <PageTitle title="Empresa e identidade" subtitle="Silex Business é a marca fixa do software. Configure separadamente a identificação da empresa cliente." />
    <section className="panel company-form">
      <div className="panel-heading"><div><h2>Identificação da empresa cliente</h2><p>O nome de apresentação não substitui o nome da empresa ou os dados fiscais.</p></div></div>
      <div style={{ padding: 20 }}>
        {error && <Notice>{error}</Notice>}{saved && <Notice tone="success">Identificação salva.</Notice>}
        <Form submit="Salvar identificação" onSubmit={async () => {
          setError(""); setSaved(false);
          try { const result = await api<CompanySettings>("/company-settings", "PUT", { brand_name: value.brand_name, company_name: value.company_name, company_document: value.company_document, phone: value.phone, email: value.email, address: value.address }); setValue(result); onSaved(result); setSaved(true); }
          catch (e) { setError((e as Error).message); }
        }}>
          <div className="form-grid">
            <Field label="Nome de apresentação *"><input required maxLength={50} value={value.brand_name} onChange={(e) => change("brand_name", e.target.value)} /></Field>
            <Field label="Nome da empresa"><input maxLength={150} value={value.company_name} onChange={(e) => change("company_name", e.target.value)} /></Field>
            <Field label="CPF / CNPJ"><input maxLength={20} value={value.company_document} onChange={(e) => change("company_document", e.target.value)} /></Field>
            <Field label="Telefone"><input maxLength={40} value={value.phone} onChange={(e) => change("phone", e.target.value)} /></Field>
            <Field label="E-mail"><input type="email" maxLength={180} value={value.email} onChange={(e) => change("email", e.target.value)} /></Field>
            <Field label="Endereço"><input maxLength={300} value={value.address} onChange={(e) => change("address", e.target.value)} /></Field>
          </div>
        </Form>
      </div>
    </section>
  </>;
}
