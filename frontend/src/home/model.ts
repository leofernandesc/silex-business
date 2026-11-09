import { canAccessRoute, routes, type RouteId } from "../navigation/routes";
import type { CompanySettings, User } from "../types";

export type CompanyStatus = "loading" | "ready" | "error";

// Presentation order only. Availability and titles always come from routes.ts.
const quickOrder: readonly RouteId[] = [
  "customers", "service-orders", "finance-dashboard", "finance-payable",
  "finance-receivable", "products", "sales", "pos",
];
/** Optional data never becomes a confirmed zero, and operators see no global service metrics. */
export function homeServiceIndicators(user: Pick<User,'role'>, counts: Record<string,number>|null|undefined) {
  if(user.role!=='admin')return null;
  if(!counts||Object.values(counts).some(n=>!Number.isSafeInteger(n)||n<0))return {active:null,scheduled:null,inProgress:null,completed:null};
  return {active:(counts.scheduled||0)+(counts.in_progress||0),scheduled:counts.scheduled||0,inProgress:counts.in_progress||0,completed:counts.completed||0};
}
export function homeNavigation(user: Pick<User, "role" | "capabilities"> | null) {
  const available = routes.filter(
    (route) =>
      route.id !== "home" &&
      route.id !== "finance-suppliers" &&
      route.id !== "dashboard" && route.id !== "finance-categories" && route.id !== "finance-subcategories" &&
      canAccessRoute(user, route.id),
  );
  const quick = quickOrder.flatMap((id) =>
    available.filter((route) => route.id === id),
  );
  const remaining = available.filter(
    (route) =>
      route.id !== "dashboard" && !quick.some((item) => item.id === route.id),
  );
  return {
    available,
    quick,
    remaining,
  };
}
export function companyPresentation(company: CompanySettings | null) {
  return {
    name: company?.company_name.trim() || "Nome empresarial não informado",
    details: [
      ["Documento", company?.company_document],
      ["Telefone", company?.phone],
      ["E-mail", company?.email],
      ["Endereço", company?.address],
    ].flatMap(([label, value]) =>
      value?.trim() ? [{ label: label!, value: value.trim() }] : [],
    ),
  };
}
