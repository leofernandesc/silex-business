import { expect, type Page } from "@playwright/test";
import type { routes } from "../src/navigation/routes";
const endpoints: Record<(typeof routes)[number]["id"], string> = {
  home: "/dashboard",
  "finance-plan": "/categories",
  dashboard: "/dashboard",
  customers: "/customers",
  products: "/products",
  suppliers: "/suppliers",
  "day-workers": "/suppliers",
  "subcontracted-freight": "/suppliers",
  stock: "/stock-movements",
  pos: "/products",
  sales: "/sales",
  "service-orders": "/service-orders",
  cash: "/cash-sessions/current",
  "finance-dashboard": "/finance/dashboard",
  finance: "/finance/movements",
  "finance-reconcile": "/finance/ofx/imports",
  "finance-payable": "/finance",
  "finance-receivable": "/finance",
  "finance-accounts": "/accounts",
  "finance-categories": "/categories",
  "finance-subcategories": "/subcategories",
  "finance-reports": "/finance/reports/cash-monthly",
  "finance-dre": "/finance/dre",
  users: "/users",
  audit: "/audit",
  "company-settings": "/company-settings",
  "finance-suppliers": "/suppliers",
};
/** Check the destination React tree and its actual primary GET, not the previous screen's h1. */
export async function openReadyRoute(
  page: Page,
  route: (typeof routes)[number],
) {
  const currentHomeAlias=route.id==='dashboard'&&new URL(page.url()).hash==='#home';
  if(currentHomeAlias){
    // A hash alias must reuse the already loaded Home, without fabricating a second GET.
    await page.goto('/app#dashboard');
    await expect(page).toHaveURL(/#home$/);
    await expect(page.getByRole('region',{name:'Indicadores operacionais',exact:true})).toHaveCount(1);
  }else{
    const endpoint = endpoints[route.id];
    expect(endpoint, `${route.id}: primary GET must be explicitly registered`).toBeTruthy();
    const response = page.waitForResponse(r=>new URL(r.url()).pathname==='/api'+endpoint&&r.request().method()==='GET');
    await page.goto('/app#'+route.id);
    const received=await response;
    expect(received.ok(),`${route.id}: ${received.status()}`).toBe(true);
    await received.finished();
  }
  await expect(page.locator(".breadcrumb strong")).toHaveText(route.title);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main [aria-busy=true]")).toHaveCount(0);
  await expect(
    page.getByText(
      /Carregando (registros|informações financeiras|identificação da empresa)/,
    ),
  ).toHaveCount(0);
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
}
