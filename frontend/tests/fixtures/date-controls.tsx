import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SilexDatePicker } from "../../src/SilexDatePicker";
import { SilexMonthField } from "../../src/SilexMonthField";
import { Modal } from "../../src/ui";
import "../../src/styles/tokens.css";
import "../../src/styles.css";

function CivilForm({ label, required, min, max, disabled, readOnly }: { label: string; required?: boolean; min?: string; max?: string; disabled?: boolean; readOnly?: boolean }) {
  const [value, setValue] = useState(required ? "" : "2026-03-04");
  const [saved, save] = useState("não enviado");
  const [busy, setBusy] = useState(false);
  return <form className="panel" aria-label={label} onSubmit={e => { e.preventDefault(); save(value || "vazio"); }}>
    <fieldset disabled={busy}>
      <SilexDatePicker label={label} value={value} onChange={setValue} required={required} min={min} max={max} disabled={disabled} readOnly={readOnly} />
      <button type="submit">Enviar {label}</button>
    </fieldset>
    <button type="button" onClick={() => setValue("2024-02-29")}>Atualizar {label}</button>
    <button type="button" onClick={() => setBusy(!busy)}>Bloquear {label}</button>
    <output aria-label={`ISO ${label}`}>{value || "vazio"}</output>
    <output aria-label={`Envio ${label}`}>{saved}</output>
  </form>;
}
function App() {
  const [month, setMonth] = useState("2026-03"), [monthSaved, saveMonth] = useState("");
  const [modal, setModal] = useState(false), [date, setDate] = useState("2026-03-04");
  return <main style={{ maxWidth: 900, margin: "auto", padding: 16 }}>
    <h1>Datas — demonstração sintética</h1>
    <CivilForm label="Data controlada" />
    <CivilForm label="Data obrigatória" required />
    <CivilForm label="Data limitada" min="2024-01-01" max="2026-12-31" />
    <CivilForm label="Data desabilitada" disabled />
    <CivilForm label="Data somente leitura" readOnly />
    <form className="panel" aria-label="Competência" onSubmit={e => { e.preventDefault(); saveMonth(month); }}>
      <SilexMonthField label="Competência" value={month} onChange={setMonth} />
      <SilexMonthField label="Competência fixa" value="2026-03" readOnly />
      <button>Enviar competência</button>
      <output aria-label="ISO mensal">{month}</output><output aria-label="Envio mensal">{monthSaved}</output>
    </form>
    <button onClick={() => setModal(true)}>Abrir modal</button>
    {modal && <Modal title="Modal com calendário" close={() => setModal(false)}><form onSubmit={e => { e.preventDefault(); setModal(false); }}><SilexDatePicker label="Data no modal" value={date} onChange={setDate} required /><button type="submit">Confirmar modal</button><button type="button" onClick={() => setModal(false)}>Cancelar modal</button></form></Modal>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
