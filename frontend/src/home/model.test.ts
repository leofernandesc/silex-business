import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { routes } from "../navigation/routes";
import type { CompanySettings, User } from "../types";
import { AuthenticatedHome } from "./AuthenticatedHome";
import { companyPresentation, homeNavigation } from "./model";

const company: CompanySettings = {
  id: 1,
  company_name: "Empresa Teste",
  brand_name: "Nome legado",
  company_document: "DOC-TESTE",
  phone: "",
  email: "empresa@example.test",
  address: "",
};
const user: User = {
  id: 1,
  name: "Pessoa Teste",
  username: "test",
  role: "admin",
  active: true,
};

describe("SB-04B authenticated home", () => {
  it.each(["admin", "operator"] as const)(
    "derives every shortcut from central availability for %s",
    (role) => {
      const navigation = homeNavigation({ role });
      const expected = routes.filter(
        (route) =>
          route.id !== "home" &&
          route.id !== "finance-suppliers" &&
          (!route.admin || role === "admin"),
      );
      expect(navigation.available).toEqual(expected);
      const ids = [
        ...navigation.quick,
        ...navigation.remaining,
        navigation.overview!,
      ].map((route) => route.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(ids)).toEqual(new Set(expected.map((route) => route.id)));
    },
  );
  it("has no shortcuts without a user", () => {
    expect(homeNavigation(null).available).toEqual([]);
  });
  it("never substitutes the company identification with brand_name", () => {
    expect(companyPresentation(company).name).toBe("Empresa Teste");
    expect(companyPresentation({ ...company, company_name: "  " }).name).toBe(
      "Nome empresarial não informado",
    );
    expect(companyPresentation(null).details).toEqual([]);
    expect(companyPresentation(company).details).toHaveLength(2);
  });
  it("renders only authorized destinations, no fake indicators or financial sections for operator", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedHome, {
        user: { ...user, role: "operator" },
        company,
        companyStatus: "ready",
        navigate: () => {},
      }),
    );
    expect(html).toContain("Empresa Teste");
    expect(html).not.toContain("Nome legado");
    expect(html).not.toContain("Gestão financeira");
    expect(html).not.toContain("Administração");
    for (const route of routes.filter((route) => route.admin))
      expect(html).not.toContain(`href="/app#${route.id}"`);
    expect(html).toContain('href="/app#dashboard"');
    expect(html).not.toContain("R$");
  });
  it.each(["loading", "error"] as const)(
    "does not expose company values in %s state",
    (companyStatus) => {
      const html = renderToStaticMarkup(
        createElement(AuthenticatedHome, {
          user,
          company,
          companyStatus,
          navigate: () => {},
        }),
      );
      expect(html).not.toContain("Empresa Teste");
      expect(html).toContain('role="status"');
    },
  );
});
