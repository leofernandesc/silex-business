import { SilexDatePicker } from "./SilexDatePicker";
import {
  cloneElement,
  useCallback,
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
import { apiRequest } from "./api";
import { validResource } from "./resourceValidation";
import { labels } from "./format";
import type { Page } from "./types";
import { useModalFocus } from "./useModalFocus";

export function useLoad<T>(path: string, version = 0) {
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(value => value + 1), []);
  const key = JSON.stringify([path, version, attempt]);
  const pending = { key, data: null as T | null, loading: true, error: "" };
  const [state, setState] = useState(pending);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ key, data: null, loading: true, error: "" });
    apiRequest<T>(path, { method: "GET", signal: controller.signal })
      .then(value => {
        if (!validResource(path,value)) throw new Error("Resposta inválida do servidor. Tente novamente.");
        if (active) setState({key,data:value,loading:false,error:""});
      })
      .catch(error => {
        if (active) setState({key,data:null,loading:false,error:(error as Error).message});
      });
    return () => { active = false; controller.abort(); };
  }, [path, key]);
  return { ...(state.key === key ? state : pending), reload };
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
/** Contextual lookup state: unavailable is never described as an empty catalogue. */
export function LoadFeedback({resource,label}:{resource:{loading:boolean;error:string;reload:()=>void};label:string}){
  return resource.loading?<p role="status">Carregando {label}…</p>:resource.error?<><Notice>{label}: {resource.error}</Notice><button type="button" onClick={resource.reload}>Tentar novamente: {label}</button></>:null;
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
export function ExportButton({onClick}:{onClick:()=>void|Promise<void>}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef(false);
  async function exportFile(){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await onClick();}catch(error){setError((error as Error).message);}finally{pending.current=false;setBusy(false);}}
  return <><button type="button" disabled={busy} onClick={()=>void exportFile()}><Download size={16}/>{busy?'Exportando...':'Exportar CSV'}</button>{error&&<Notice>{error}</Notice>}</>;
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
      <SilexDatePicker label="De" value={start} onChange={(value) => setStart(value)} />
      <SilexDatePicker label="Até" value={end} onChange={(value) => setEnd(value)} />
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
  error,
  onRetry,
  children,
}: {
  headers: string[];
  empty: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="table-wrap" tabIndex={0} aria-label="Tabela de registros" aria-busy={loading || undefined}>
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
          ) : error ? (
            <tr><td colSpan={headers.length}><div className="empty" role="status">
              <strong>Dados indisponíveis</strong><span>A consulta não foi concluída.</span>
              {onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}
            </div></td></tr>
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
  submitClassName = "primary",
  processingText = "Salvando...",
}: {
  onSubmit: () => Promise<void>;
  children: ReactNode;
  submit?: string;
  cancel?: () => void;
  submitClassName?: string;
  processingText?: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function handle(e: FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handle} aria-busy={busy}>
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy}>
        {children}
        <div className="form-actions">
          {cancel && (
            <button type="button" onClick={cancel}>
              Voltar
            </button>
          )}
          <button className={submitClassName} disabled={busy} type="submit">
            {busy ? processingText : submit}
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
