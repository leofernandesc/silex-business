import { canAccessRoute, routes, type RouteId } from "../navigation/routes";
import type { CompanySettings, User } from "../types";

export type CompanyStatus = "loading" | "ready" | "error";

// Presentation order only. Availability and titles always come from routes.ts.
const quickOrder: readonly RouteId[] = [
  "pos",
  "sales",
  "customers",
  "products",
  "finance",
  "finance-payable",
  "finance-receivable",
  "service-orders",
];
export function homeNavigation(user: Pick<User, "role"> | null) {
  const available = routes.filter(
    (route) =>
      route.id !== "home" &&
      route.id !== "finance-suppliers" &&
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
    overview: available.find((route) => route.id === "dashboard"),
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
