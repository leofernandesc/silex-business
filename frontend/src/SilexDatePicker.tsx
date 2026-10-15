import { useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import {
  Button, Calendar, CalendarCell, CalendarGrid, CalendarGridBody,
  CalendarGridHeader, CalendarHeaderCell, DateInput, DatePicker, DateSegment,
  DateFieldStateContext, Dialog, FieldError, Group, Heading, I18nProvider,
  Label, Popover, Text,
} from "react-aria-components";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { type CalendarDate } from "@internationalized/date";
import { civilDate, civilISO } from "./civilDates";
import "./dateFields.css";

type Segment = Parameters<Parameters<typeof DateInput>[0]["children"]>[0];
type Edit = { iso: string | null; empty: boolean; error: string };

export interface SilexDatePickerProps {
  label: string;
  value: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  min?: string;
  max?: string;
  name?: string;
  description?: string;
  error?: string;
  allowClear?: boolean;
}

/** React Aria owns editing/keyboard semantics; this observes its public segment state. */
function ObservedSegment({ segment, observe }: { segment: Segment; observe: (segments: Segment[]) => void }) {
  const state = useContext(DateFieldStateContext);
  useLayoutEffect(() => {
    if (segment.type === "day" && state) observe(state.segments);
  }, [observe, segment.type, state?.segments]);
  return <DateSegment segment={segment} className="silex-date-segment">{segment.type === "year" && !segment.isPlaceholder ? segment.text.padStart(4, "0") : segment.text}</DateSegment>;
}

export function SilexDatePicker({ label, value, onChange, required = false,
  disabled = false, readOnly = false, min, max, name, description, error,
  allowClear = true }: SilexDatePickerProps) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<CalendarDate | null>(() => civilDate(value));
  const [issue, setIssue] = useState("");
  const [rejected, setRejected] = useState("");
  const [fieldsetDisabled, setFieldsetDisabled] = useState(false);
  const [portal, setPortal] = useState<Element>();
  const [open, setOpen] = useState(false);
  const edit = useRef<Edit>({ iso: value || null, empty: !value, error: "" });
  const rejectAutomaticBlur = useRef(false);

  useLayoutEffect(() => {
    setDraft(civilDate(value));
    setIssue("");
    setRejected("");
  }, [value]);
  useLayoutEffect(() => {
    const fieldsets: HTMLFieldSetElement[] = [];
    for (let p = root.current?.parentElement; p; p = p.parentElement) {
      if (p instanceof HTMLFieldSetElement) fieldsets.push(p);
    }
    const update = () => setFieldsetDisabled(fieldsets.some(f => f.disabled));
    const observer = new MutationObserver(update);
    fieldsets.forEach(f => observer.observe(f, { attributes: true, attributeFilter: ["disabled"] }));
    update();
    // A body portal would be inert behind the existing native showModal dialog.
    setPortal(root.current?.closest("dialog") ?? undefined);
    return () => observer.disconnect();
  }, []);

  const observe = useCallback((segments: Segment[]) => {
    const civil = segments.filter(s => ["day", "month", "year"].includes(s.type));
    const empty = civil.every(s => s.isPlaceholder);
    const partial = civil.some(s => s.isPlaceholder);
    const part = (type: string) => civil.find(s => s.type === type)?.value ?? 0;
    const iso = !partial ? civilISO(part("year"), part("month"), part("day")) : null;
    const error = empty ? "" : partial ? "Complete o dia, o mês e o ano." : !iso ? "Informe uma data válida." : "";
    edit.current = { iso, empty, error };
    setIssue(error);
  }, []);
  const publish = (iso: string) => {
    setRejected("");
    setIssue("");
    setDraft(civilDate(iso));
    if (iso !== value) onChange?.(iso);
  };
  const commit = () => {
    const snapshot = edit.current;
    if (snapshot.error) {
      // React Aria constrains impossible dates on blur. Keep that correction out
      // of persisted parent state and require an explicit valid edit instead.
      rejectAutomaticBlur.current = true;
      setRejected(`${snapshot.error} O valor anterior foi mantido.`);
      setDraft(civilDate(value));
      queueMicrotask(() => { rejectAutomaticBlur.current = false; });
      return false;
    }
    publish(snapshot.empty ? "" : snapshot.iso!);
    return true;
  };
  const unavailable = disabled || fieldsetDisabled;
  const invalidSource = Boolean(value && !civilDate(value));
  const message = error || rejected || issue || (invalidSource ? "Data recebida inválida." : "");

  return <I18nProvider locale="pt-BR-u-ca-gregory-nu-latn">
    <div ref={root} className="silex-date-field field"
      onBlurCapture={e => {
        if (input.current?.contains(e.target) && !input.current.contains(e.relatedTarget as Node | null)) commit();
      }}
      onKeyDownCapture={e => {
        if (!input.current?.contains(e.target as Node)) return;
        if (e.key === "Enter") { if (!commit()) e.preventDefault(); }
        else if (e.key.length === 1 || ["Backspace", "Delete", "ArrowUp", "ArrowDown"].includes(e.key)) setRejected("");
      }}>
      <DatePicker<CalendarDate> value={draft} onChange={date => {
        if (!rejectAutomaticBlur.current) setDraft(date);
      }} isRequired={required} isDisabled={unavailable} isReadOnly={readOnly}
        minValue={min ? civilDate(min) ?? undefined : undefined}
        maxValue={max ? civilDate(max) ?? undefined : undefined}
        isInvalid={message ? true : undefined} validationBehavior="native"
        shouldForceLeadingZeros granularity="day" name={name}
        isOpen={open} onOpenChange={setOpen} className="silex-date-picker">
        <Label className="silex-date-label">{label}</Label>
        <Group className="silex-date-group">
          <DateInput ref={input} className="silex-date-input">{segment => <ObservedSegment segment={segment} observe={observe} />}</DateInput>
          <Button className="silex-date-trigger" aria-label="Abrir calendário"><CalendarDays size={18} aria-hidden="true" /></Button>
        </Group>
        {description && <Text slot="description" className="silex-date-description">{description}</Text>}
        <FieldError className="silex-date-error">{({ validationErrors, validationDetails }) => message || (validationDetails.valueMissing ? "Informe a data." : validationErrors.join(" "))}</FieldError>
        <Popover className="silex-date-popover" UNSTABLE_portalContainer={portal} placement="bottom start" containerPadding={12}>
          <Dialog className="silex-calendar-dialog">
            <Calendar<CalendarDate> className="silex-calendar" onChange={date => { publish(date.toString()); setOpen(false); }}>
              <header className="silex-calendar-heading">
                <Button slot="previous" aria-label="Mês anterior"><ChevronLeft size={18} /></Button>
                <Heading />
                <Button slot="next" aria-label="Próximo mês"><ChevronRight size={18} /></Button>
              </header>
              <div className="silex-calendar-grid-scroll" tabIndex={0} role="region" aria-label="Dias do calendário">
                <CalendarGrid weekdayStyle="short">
                  <CalendarGridHeader>{day => <CalendarHeaderCell>{day}</CalendarHeaderCell>}</CalendarGridHeader>
                  <CalendarGridBody>{date => <CalendarCell date={date} className="silex-calendar-cell" />}</CalendarGridBody>
                </CalendarGrid>
              </div>
            </Calendar>
            {allowClear && !readOnly && <Button slot={null} className="silex-date-clear" onPress={() => { publish(""); setOpen(false); }}>Limpar data</Button>}
          </Dialog>
        </Popover>
      </DatePicker>
    </div>
  </I18nProvider>;
}
