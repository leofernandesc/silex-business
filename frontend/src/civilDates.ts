import { CalendarDate, parseDate } from "@internationalized/date";

/** Civil dates never pass through a timestamp or a host timezone. */
export function civilDate(value: string): CalendarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try {
    const date = parseDate(value);
    return date.toString() === value ? date : null;
  } catch {
    return null;
  }
}

export function civilISO(year: number, month: number, day: number): string | null {
  return civilDate(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)?.toString() ?? null;
}

export function monthISO(year: string, month: string): string | null {
  if (!/^\d+$/.test(year) || !/^\d{1,2}$/.test(month)) return null;
  const y = Number(year), m = Number(month);
  if (!Number.isSafeInteger(y) || y < 1 || m < 1 || m > 12) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
}
