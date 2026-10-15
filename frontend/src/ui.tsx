import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  X,
  Plus,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "./api";
import { labels } from "./format";
import type { Page } from "./types";
import { useModalFocus } from "./useModalFocus";

export function useLoad<T>(path: string, version = 0) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setData(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, loading, error };
}
export function Notice({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`notice ${tone}`}
    >
      {children}
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{labels[status] || status}</span>;
}
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="primary" onClick={onClick}>
      <Plus size={17} />
      {children}
    </button>
  );
}
export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}>
      <Download size={16} />
      Exportar CSV
    </button>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Pesquisar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={17} />
      <input
        aria-label="Pesquisar"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function ActiveFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-field">
      Situação
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        <option value="true">Ativos</option>
        <option value="false">Inativos</option>
      </select>
    </label>
  );
}
export function Dates({
  start,
  end,
  setStart,
  setEnd,
}: {
  start: string;
  end: string;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
}) {
  return (
    <>
      <label className="inline-field">
        De
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label className="inline-field">
        Até
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
    </>
  );
}
export function Pagination({
  data,
  onPage,
}: {
  data: Page<unknown> | null;
  onPage: (n: number) => void;
}) {
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <div className="pagination">
      <span>
        {data.total} registro{data.total !== 1 ? "s" : ""}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {data.page} de {pages}
        </span>
        <button
          aria-label="Próxima página"
          disabled={data.page >= pages}
          onClick={() => onPage(data.page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Table({
  headers,
  empty,
  loading,
  children,
}: {
  headers: string[];
  empty: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="table-wrap" tabIndex={0} aria-label="Tabela de registros">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length}>
                <div className="empty">Carregando registros...</div>
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={headers.length}>
                <div className="empty">
                  <Search size={26} />
                  <strong>Nenhum registro encontrado</strong>
                  <span>Altere os filtros ou adicione um registro.</span>
                </div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useModalFocus(ref);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Fechar janela" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}
export function Field({
  label,
  children,
  span = false,
}: {
  label: string;
  children: ReactNode;
  span?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field ${span ? "span" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
export function Form({
  onSubmit,
  children,
  submit = "Salvar",
  cancel,
}: {
  onSubmit: () => Promise<void>;
  children: ReactNode;
  submit?: string;
  cancel?: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function handle(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handle}>
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy}>
        {children}
        <div className="form-actions">
          {cancel && (
            <button type="button" onClick={cancel}>
              Voltar
            </button>
          )}
          <button className="primary" disabled={busy} type="submit">
            {busy ? "Salvando..." : submit}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
export function SummaryCard({
  label,
  value,
  icon,
  detail,
  tone = "blue",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail: string;
  tone?: string;
}) {
  return (
    <article className={`summary-card ${tone}`}>
      <div className="summary-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
