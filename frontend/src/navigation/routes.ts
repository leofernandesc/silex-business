import type { User } from "../types";

// Availability mirrors the existing admin/current_user guards; the server authorizes requests.
export const routes = [
  { id: "home", title: "Início", group: "PRINCIPAL", admin: false },
  { id: "dashboard", title: "Visão geral", group: "PRINCIPAL", admin: false },
  { id: "customers", title: "Clientes", group: "cadastros", admin: false },
  {
    id: "products",
    title: "Produtos ou Serviços",
    group: "cadastros",
    admin: false,
  },
  { id: "suppliers", title: "Fornecedores", group: "cadastros", admin: true },
  { id: "day-workers", title: "Diaristas", group: "cadastros", admin: true },
  {
    id: "subcontracted-freight",
    title: "Frete Subcontratado",
    group: "cadastros",
    admin: true,
  },
  { id: "stock", title: "Estoque", group: "movimentacoes", admin: true },
  { id: "pos", title: "Frente de Caixa", group: "movimentacoes", admin: false },
  { id: "sales", title: "Vendas", group: "movimentacoes", admin: false },
  {
    id: "service-orders",
    title: "Serviços e pedidos",
    group: "movimentacoes",
    admin: true,
  },
  {
    id: "cash",
    title: "Controle de caixa",
    group: "movimentacoes",
    admin: false,
  },
  {
    id: "finance-dashboard",
    title: "Dashboard",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance",
    title: "Lançamento (Despesa/Receita)",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-reconcile",
    title: "Conciliação Bancária",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-payable",
    title: "Contas a Pagar",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-receivable",
    title: "Contas a Receber",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-accounts",
    title: "Cadastro de Contas",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-categories",
    title: "Categorias",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-subcategories",
    title: "SubCategorias",
    group: "financeiro",
    admin: true,
  },
  {
    id: "finance-reports",
    title: "Relatórios Financeiros",
    group: "financeiro",
    admin: true,
  },
  { id: "users", title: "Usuários", group: "administracao", admin: true },
  {
    id: "audit",
    title: "Histórico de operações",
    group: "administracao",
    admin: true,
  },
  {
    id: "company-settings",
    title: "Empresa e identidade",
    group: "administracao",
    admin: true,
  },
  {
    id: "finance-suppliers",
    title: "Fornecedores",
    group: "cadastros",
    admin: true,
  },
] as const;

export type RouteId = (typeof routes)[number]["id"];
export function getRoute(id: string) {
  return routes.find((route) => route.id === id);
}
export function canAccessRoute(
  user: Pick<User, "role"> | null,
  id: string,
): boolean {
  const route = getRoute(id);
  return Boolean(user && route && (!route.admin || user.role === "admin"));
}
export function appUrl(id: RouteId) {
  return `/app#${id}`;
}
export const RETURN_KEY = "silex.navigation.return";
export const LOGOUT_PENDING_KEY = "silex.session.logout-pending";
export function encodeReturn(id: string): string | null {
  return getRoute(id)
    ? JSON.stringify({ id, origin: "protected-request" })
    : null;
}
export function decodeReturn(value: string | null): RouteId | null {
  try {
    const entry = JSON.parse(value || "null");
    return (
      (entry?.origin === "protected-request" && getRoute(entry.id)?.id) || null
    );
  } catch {
    return null;
  }
}
export const DEFAULT_ROUTE: RouteId = "home";
// Only registered operational hashes cross the public boundary.
export function readAddress(address: Pick<Location, "pathname" | "hash">) {
  const hash = address.hash.slice(1);
  const login =
    address.pathname === "/entrar" || address.pathname === "/entrar/";
  const operational = ["/", "/app", "/app/"].includes(address.pathname);
  const route = operational ? getRoute(hash)?.id : undefined;
  const message =
    (!operational && !login) || (operational && hash && !route)
      ? "Endereço não encontrado. Exibindo a entrada disponível do sistema."
      : "";
  return {
    login,
    route: route || (message ? "dashboard" : DEFAULT_ROUTE),
    requested: operational && Boolean(route),
    message,
  };
}
