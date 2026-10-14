import { localDate } from "./format";
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
