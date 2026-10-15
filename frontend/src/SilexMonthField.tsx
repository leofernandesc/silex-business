import { useId, useLayoutEffect, useRef, useState } from "react";
import { monthISO } from "./civilDates";
import "./dateFields.css";

interface Props {
  label: string;
  value: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  min?: string;
  max?: string;
}

/** Month/year is a pair, never a civil date with an invented first day. */
export function SilexMonthField({ label, value, onChange, required = false,
  disabled, readOnly, min, max }: Props) {
  const id = useId(), errorId = `${id}-error`;
  const [year, setYear] = useState(value.split("-")[0] || "");
  const [month, setMonth] = useState(value.split("-")[1] || "");
  const [error, setError] = useState("");
  const yearInput = useRef<HTMLInputElement>(null);
  const monthInput = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => { setYear(value.split("-")[0] || ""); setMonth(value.split("-")[1] || ""); setError(""); }, [value]);
  const empty = !year && !month;
  const iso = monthISO(year, month);
  const compare = (a: string, b: string) => Number(a.split("-")[0]) - Number(b.split("-")[0]) || Number(a.split("-")[1]) - Number(b.split("-")[1]);
  const issueFor = (y: string, m: string) => {
    const next = monthISO(y, m);
    return !y && !m && !required ? "" : !next ? "Informe o mês e o ano completos." : min && compare(next, min) < 0 ? "Competência anterior ao limite permitido." : max && compare(next, max) > 0 ? "Competência posterior ao limite permitido." : "";
  };
  const issue = issueFor(year, month);
  useLayoutEffect(() => { yearInput.current?.setCustomValidity(issue); }, [issue]);
  const commit = () => { if (readOnly || disabled) return; setError(issue); if (!issue && (iso || empty)) onChange?.(empty ? "" : iso!); };
  return <div className="silex-month-field field" role="group" aria-labelledby={id}>
    <span id={id} className="silex-date-label">{label}</span>
    <div className="silex-month-controls">
      <select ref={monthInput} aria-label={`${label}: mês`} aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined} value={month} required={required || Boolean(year)} disabled={disabled || readOnly}
        onChange={e => { const next = e.target.value; setMonth(next); setError(""); const result = monthISO(year, next); if (!issueFor(year, next)) onChange?.(result ?? ""); }}>
        <option value="">MM</option>
        {Array.from({ length: 12 }, (_, index) => { const m = String(index + 1).padStart(2, "0"); return <option key={m} value={m}>{m}</option>; })}
      </select>
      <span aria-hidden="true">/</span>
      <input ref={yearInput} aria-label={`${label}: ano`} aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}
        type="number" inputMode="numeric" step={1} min={1} placeholder="AAAA" value={year}
        required={required || Boolean(month)} disabled={disabled} readOnly={readOnly}
        onChange={e => { setYear(e.target.value); setError(""); }} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { commit(); if (issue) e.preventDefault(); } }}
        onInvalid={() => setError(issue)} />
    </div>
    {error && <small id={errorId} className="silex-date-error">{error}</small>}
  </div>;
}
