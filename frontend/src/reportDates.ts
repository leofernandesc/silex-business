import { financialMonthLabel } from "./dashboardPresentation";

/** Only report groups whose API contract actually represents a month. */
export function reportGroupDate(report: string, value: string): string {
  if (["cash-monthly", "charges-monthly", "discounts-monthly"].includes(report)) {
    return financialMonthLabel(value);
  }
  if (report === "result-monthly") {
    // Preserve classification/group names, including names containing the separator.
    return value.replace(/ · (\d{4}-\d{2})$/, (_, month: string) =>
      ` · ${financialMonthLabel(month)}`,
    );
  }
  return value;
}
