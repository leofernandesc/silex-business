import {
  cloneElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { ArrowLeftRight } from "lucide-react";
import { dateOnly } from "./format";
import { Field, Table } from "./ui";

/** Native input and original handlers/constraints are preserved; only its description is added. */
export function LedgerDateField({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactElement<InputHTMLAttributes<HTMLInputElement>>;
}) {
  const hint = useId();
  return (
    <div className="ledger-date-field">
      <Field label={label}>
        {cloneElement(children, {
          lang: "pt-BR",
          "aria-describedby": [children.props["aria-describedby"], hint]
            .filter(Boolean)
            .join(" "),
        })}
      </Field>
      <small id={hint} className="ledger-date-caption">
        {value ? `Data: ${dateOnly(value)}` : "Formato brasileiro: dd/mm/aaaa"}
      </small>
    </div>
  );
}

/** Enhances only the existing Table instance inside this region, without modifying shared Table. */
export function LedgerTableRegion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const hint = useId();
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const scroll = ref.current?.querySelector<HTMLElement>(".table-wrap");
    const table = scroll?.querySelector("table");
    if (!scroll || !table) return;
    const previous = scroll.getAttribute("aria-describedby");
    const measure = () => {
      const overflowing = scroll.scrollWidth > scroll.clientWidth + 1;
      setOverflow(overflowing);
      const description = [previous, overflowing ? hint : null]
        .filter(Boolean)
        .join(" ");
      if (description) scroll.setAttribute("aria-describedby", description);
      else scroll.removeAttribute("aria-describedby");
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    observer.observe(table);
    measure();
    return () => {
      observer.disconnect();
      if (previous) scroll.setAttribute("aria-describedby", previous);
      else scroll.removeAttribute("aria-describedby");
    };
  }, [hint]);
  return (
    <div className="ledger-table-region" ref={ref}>
      {overflow && (
        <p id={hint} className="ledger-scroll-hint">
          <ArrowLeftRight size={17} aria-hidden="true" />
          Role horizontalmente para ver todas as colunas e ações. Com a tabela
          em foco, use as setas do teclado.
        </p>
      )}
      {children}
    </div>
  );
}

export function LedgerTable(props: ComponentProps<typeof Table>) {
  return (
    <LedgerTableRegion>
      <Table {...props} />
    </LedgerTableRegion>
  );
}
