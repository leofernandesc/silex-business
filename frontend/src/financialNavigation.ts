import {sourceId,sourceHref,sourceRoutes} from "./sourceNavigation";
import {readDrePeriod,dreHref} from "./dreNavigation";
import { civilDate } from "./civilDates";
import { dateOnly } from "./format";
export type FinancialContext = "dashboard" | "titles" | "movements";
export type TemporalFilters = {
  start?: string;
  end?: string;
  direction?: string;
  status?: string;
  date_field?: string;
};
const contexts: Record<string, FinancialContext> = {
  "finance-dashboard": "dashboard",
  "finance-payable": "titles",
  "finance-receivable": "titles",
  finance: "movements",
};
const statuses = [
  "",
  "pending",
  "open",
  "partial",
  "overdue",
  "paid",
  "canceled",
];
const bases: Record<FinancialContext, string[]> = {
  dashboard: [],
  titles: ["due", "competence", "settled", "created"],
  movements: ["posting", "competence"],
};
export const dateBasisLabels: Record<string, string> = {
  due: "Vencimento",
  competence: "Competência",
  settled: "Quitação integral (registro)",
  created: "Criação do título",
  posting: "Lançamento da baixa",
};
export function readFinancialSearch(
  context: FinancialContext,
  search: string,
): TemporalFilters {
  const p = new URLSearchParams(search),
    result: TemporalFilters = {};
  if (p.getAll("f_context").length !== 1 || p.get("f_context") !== context)
    return result;
  for (const k of [
    "start",
    "end",
    "direction",
    "status",
    "date_field",
  ] as const) {
    const values = p.getAll("f_" + k);
    if (values.length > 1) return {};
    if (!values.length) continue;
    const v = values[0];
    if (
      (k === "start" || k === "end") &&
      ((v === "" && context === "dashboard") || (v !== "" && !civilDate(v)))
    )
      return {};
    if (context === "dashboard" && k !== "start" && k !== "end") return {};
    if (k === "direction" && !["", "income", "expense"].includes(v)) return {};
    if (k === "status" && (context !== "titles" || !statuses.includes(v)))
      return {};
    if (k === "date_field" && !bases[context].includes(v)) return {};
    result[k] = v;
  }
  return result;
}
export function financialHref(route: string, filters: TemporalFilters): string {
  const context = contexts[route];
  if (!context) throw new Error("Destino financeiro inválido");
  const raw = new URLSearchParams({ f_context: context });
  for (const [k, v] of Object.entries(filters))
    if (v !== undefined) raw.set("f_" + k, v);
  const validated = readFinancialSearch(context, raw.toString()),
    p = new URLSearchParams({ f_context: context });
  for (const [k, v] of Object.entries(validated)) p.set("f_" + k, v);
  return "/app?" + p.toString() + "#" + route;
}
export function preserveFinancialSearch(destination: string): string {
  const route = destination.split("#")[1],
    context = contexts[route];
  if(typeof location!=="undefined"&&(sourceRoutes as readonly string[]).includes(route)&&location.hash==='#'+route){const id=sourceId(location.search);if(id!==null)return sourceHref({route,id});}
  if(typeof location!=="undefined"&&["finance-dre","finance-reports"].includes(route)&&["#finance-dre","#finance-reports"].includes(location.hash)){const dre=readDrePeriod(location.search);if(dre)return dreHref(dre);}
  if (
    typeof location === "undefined" ||
    !context ||
    location.hash !== "#" + route
  )
    return destination;
  const filters = readFinancialSearch(context, location.search);
  return Object.keys(filters).length
    ? financialHref(route, filters)
    : destination;
}
export function syncFinancialSearch(
  context: FinancialContext,
  filters: TemporalFilters,
) {
  if (typeof location === "undefined") return;
  const route = location.hash.slice(1);
  if (contexts[route] === context)
    history.replaceState(history.state, "", financialHref(route, filters));
}
export function initialFinancialSearch(context: FinancialContext) {
  return typeof location === "undefined"
    ? {}
    : readFinancialSearch(context, location.search);
}
export function temporalSummary(filters: TemporalFilters) {
  const range = `${filters.start ? dateOnly(filters.start) : "Sem início"} até ${filters.end ? dateOnly(filters.end) : "Sem fim"}`;
  const status = filters.status
    ? (
        {
          pending: "Pendentes: abertos e parciais",
          open: "Abertos sem baixas",
          partial: "Parcialmente pagos",
          overdue: "Vencidos",
          paid: "Quitados",
          canceled: "Cancelados",
        } as Record<string, string>
      )[filters.status]
    : "Todas as situações";
  const direction =
    filters.direction === "income"
      ? "Entradas / receitas"
      : filters.direction === "expense"
        ? "Saídas / despesas"
        : "Todas as direções";
  return `${dateBasisLabels[filters.date_field || "posting"]} · ${range} · ${direction}${"status" in filters ? " · " + status : ""}`;
}
