import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  compactDocument,
  documentPattern,
  formatDocument,
  formatPostalCode,
} from "./inputPresentation";

/** Keeps the native input, password manager and form validation behavior. */
export function PasswordInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const generatedId = useId(),
    id = props.id || generatedId;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (props.disabled || props.value === "") setVisible(false);
  }, [props.disabled, props.value]);
  return (
    <div className="password-input">
      <input {...props} id={id} type={visible ? "text" : "password"} />
      <button
        type="button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-controls={id}
        aria-pressed={visible}
        disabled={props.disabled}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

type FormattedProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Restore the caret by meaningful characters, including edits next to punctuation. */
function FormattedInput({
  value,
  onValueChange,
  format,
  compact,
  ...props
}: FormattedProps & {
  format: (value: string) => string;
  compact: (value: string) => string;
}) {
  const ref = useRef<HTMLInputElement>(null),
    selection = useRef<number | null>(null);
  const [edit, setEdit] = useState(0);
  useLayoutEffect(() => {
    if (selection.current !== null && document.activeElement === ref.current) {
      ref.current?.setSelectionRange(selection.current, selection.current);
    }
    selection.current = null;
  }, [value, edit]);
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      value={format(value)}
      onKeyDown={(event) => {
        const input = event.currentTarget,
          start = input.selectionStart,
          end = input.selectionEnd;
        if (
          start === null ||
          start !== end ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        const separator = (index: number) =>
          /[.\s/\-]/.test(input.value[index] || "");
        if (event.key === "Backspace" && start > 0 && separator(start - 1)) {
          let from = start - 1;
          while (from > 0 && separator(from)) from--;
          input.setSelectionRange(from, start);
        } else if (event.key === "Delete" && separator(start)) {
          let to = start;
          while (to < input.value.length && separator(to)) to++;
          input.setSelectionRange(start, Math.min(to + 1, input.value.length));
        }
      }}
      onChange={(event) => {
        const input = event.currentTarget,
          next = compact(input.value);
        const before = compact(
          input.value.slice(0, input.selectionStart ?? input.value.length),
        ).length;
        const display = format(next);
        let caret = 0;
        while (
          caret < display.length &&
          compact(display.slice(0, caret)).length < before
        )
          caret++;
        selection.current = caret;
        input.setCustomValidity("");
        onValueChange(next);
        setEdit((current) => current + 1);
      }}
    />
  );
}

export function DocumentInput(props: FormattedProps) {
  return (
    <FormattedInput
      maxLength={20}
      autoCapitalize="characters"
      spellCheck={false}
      title="CPF com 11 dígitos ou CNPJ com 14 caracteres; os dois últimos devem ser números."
      pattern={documentPattern}
      {...props}
      format={formatDocument}
      compact={compactDocument}
    />
  );
}

export function PostalCodeInput(props: FormattedProps) {
  return (
    <FormattedInput
      inputMode="numeric"
      maxLength={9}
      {...props}
      onValueChange={(value) => props.onValueChange(formatPostalCode(value))}
      format={formatPostalCode}
      compact={(value) =>
        /^[\d\s-]*$/.test(value) ? value.replace(/[\s-]/g, "") : value
      }
    />
  );
}
