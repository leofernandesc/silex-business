import { localDate } from "./format";
import { civilDate } from "./civilDates";
import { startOfWeek } from "@internationalized/date";

/** Title presets retain their existing ranges (through today, except the full previous month).
 * Reference day is the ERP civil date in Manaus, never the browser's local calendar. */
export function titlePeriodRange(preset: string, reference = localDate()) {
  const today = civilDate(reference);
  if (!today) throw new Error("Data de referência inválida");
  let start = today,
    end = today;
  switch (preset) {
    case "today":
      break;
    case "week":
      start = startOfWeek(today, "pt-BR", "mon");
      break;
    case "month":
      start = today.set({ day: 1 });
      break;
    case "previous":
      end = today.set({ day: 1 }).subtract({ days: 1 });
      start = end.set({ day: 1 });
      break;
    case "year":
      start = today.set({ month: 1, day: 1 });
      break;
    default:
      throw new Error("Período rápido inválido");
  }
  return { start: start.toString(), end: end.toString() };
}

export const presets = [
  "Hoje",
  "Semana",
  "Mês",
  "Mês anterior",
  "Ano",
  "Tudo",
  "Personalizado",
];
export function periodRange(preset: string, today = localDate()) {
  const d = new Date(today + "T12:00:00Z");
  const iso = (v: Date) => v.toISOString().slice(0, 10);
  let start = today,
    end = today;
  if (preset === "Semana") {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    start = iso(d);
    d.setUTCDate(d.getUTCDate() + 6);
    end = iso(d);
  } else if (preset === "Mês" || preset === "Mês anterior") {
    d.setUTCDate(1);
    if (preset === "Mês anterior") d.setUTCMonth(d.getUTCMonth() - 1);
    start = iso(d);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    end = iso(d);
  } else if (preset === "Ano") {
    start = today.slice(0, 4) + "-01-01";
    end = today.slice(0, 4) + "-12-31";
  } else if (preset === "Tudo" || preset === "Personalizado") {
    start = "";
    end = "";
  }
  return { start, end };
}
