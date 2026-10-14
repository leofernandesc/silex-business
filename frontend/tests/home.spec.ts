import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { routes, canAccessRoute, RETURN_KEY } from "../src/navigation/routes";

async function signIn(page: Page, username = "demo.admin") {
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function home(page: Page) {
  await expect(page).toHaveURL(/\/app#home$/);
  await expect(
    page.getByRole("heading", { name: "Página inicial", exact: true }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("sessão expirada na Início não revela dados e retorna a home após login", async ({
  page,
}) => {
  const envPath = process.env.SILEX_SB04B_ENV;
  test.skip(!envPath, "Requer manifesto do ambiente descartável SB-04B");
  const env = JSON.parse(readFileSync(envPath!, "utf8"));
  if (
    !/^\/tmp\/silex-sb04b-/.test(env.work_dir) ||
    env.persistent_database_used !== false
  )
    throw Error("Isolated fixture required");
  await page.goto("/entrar");
  await signIn(page);
  await home(page);
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "gestao_session",
  )!;
  execFileSync("python3", [
    "-c",
    "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('UPDATE sessions SET expires_at=? WHERE token_hash=?',('2000-01-01 00:00:00.000000',sys.argv[2])); c.commit(); c.close()",
    env.work_dir + "/functional.sqlite3",
    createHash("sha256").update(cookie.value).digest("hex"),
  ]);
  await page.reload();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.locator(".silex-home")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    "Empresa Privada de Teste",
  );
  await signIn(page);
  await home(page);
});

test("home guest, retorno solicitado, login normal e refresh sem indicadores ou consultas extras", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/"))
      calls.push(new URL(request.url()).pathname);
  });
  await page.goto("/app#home");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.locator(".silex-home")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key) || "null")?.id,
      RETURN_KEY,
    ),
  ).toBe("home");
  await signIn(page);
  await home(page);
  await expect(page.locator(".silex-home__company")).toContainText(
    "Empresa Privada de Teste",
  );
  await page.waitForLoadState("networkidle");
  expect(
    calls.every((path) =>
      ["/api/auth/me", "/api/auth/login", "/api/company-settings"].includes(
        path,
      ),
    ),
  ).toBe(true);
  await expect(page.locator(".silex-home")).not.toContainText("R$");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), RETURN_KEY),
  ).toBeNull();
  await page.reload();
  await home(page);
  await expect(page.locator(".silex-home__company")).toContainText(
    "Empresa Privada de Teste",
  );
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect
    .poll(async () => (await page.request.get("/api/auth/me")).status())
    .toBe(401);
  await signIn(page);
  await home(page);
  await noOverflow(page);
});

for (const role of ["admin", "operator"] as const) {
  test(`atalhos ${role}: todos os destinos permitidos e cliques reais`, async ({
    page,
  }) => {
    await page.goto("/entrar");
    await signIn(page, role === "admin" ? "demo.admin" : "demo.operador");
    await home(page);
    const expected = routes.filter(
      (route) =>
        route.id !== "home" &&
        route.id !== "finance-suppliers" &&
        canAccessRoute({ role }, route.id),
    );
    const links = page.locator(".silex-home [data-home-route]");
    expect(
      await links.evaluateAll((elements) =>
        elements.map((e) => e.getAttribute("data-home-route")).sort(),
      ),
    ).toEqual(expected.map((r) => r.id).sort());
    if (role === "operator") {
      await expect(page.locator(".silex-home")).not.toContainText(
        "Gestão financeira",
      );
      await expect(page.locator(".silex-home")).not.toContainText(
        "Administração",
      );
    }
    for (const route of expected) {
      await page.locator(`.silex-home [data-home-route="${route.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/app#${route.id}$`));
      await expect(page.locator(".breadcrumb strong")).toHaveText(route.title);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await noOverflow(page);
      await page.goBack();
      await home(page);
    }
  });
}

test("Início e Visão Geral independentes, histórico, legado e item ativo", async ({
  page,
}) => {
  await page.goto("/entrar");
  await signIn(page);
  await home(page);
  await page
    .getByRole("link", { name: "Abrir Visão Geral", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".silex-home")).toHaveCount(0);
  await page.goBack();
  await home(page);
  await expect(page.locator("#main-content")).toBeFocused();
  await page.goForward();
  await expect(page).toHaveURL(/\/app#dashboard$/);
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await opener.isVisible()) await opener.click();
  const nav = page.getByRole("navigation", { name: "Menu principal" });
  await nav.getByRole("button", { name: "Início", exact: true }).click();
  await home(page);
  if (await opener.isVisible()) await opener.click();
  await expect(
    nav.getByRole("button", { name: "Início", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("button", { name: "Visão geral", exact: true }),
  ).not.toHaveAttribute("aria-current", "page");
  if ((page.viewportSize()?.width || 0) <= 900)
    await page.keyboard.press("Escape");
  await page.goto("/#home");
  await home(page);
  await page.goto("/app");
  await home(page);
  await noOverflow(page);
});

test("troca de sessão atualiza atalhos e operador não acessa URL administrativa", async ({
  page,
}) => {
  await page.goto("/entrar");
  await signIn(page);
  await home(page);
  await expect(page.locator('[data-home-route="finance"]')).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect
    .poll(async () => (await page.request.get("/api/auth/me")).status())
    .toBe(401);
  await signIn(page, "demo.operador");
  await home(page);
  await expect(page.locator('[data-home-route="finance"]')).toHaveCount(0);
  await expect(page.locator(".silex-home")).toContainText("Operador Demo");
  await page.goto("/app#finance");
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  expect((await page.request.get("/api/finance")).status()).toBe(403);
  await page.goto("/app#home");
  await home(page);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.locator(".silex-home")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    "Empresa Privada de Teste",
  );
  await page.goto("/");
  await expect(page.locator(".silex-public")).toBeVisible();
});

test("empresa ausente e falha de consulta sem nome legado ou dados inventados", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const actual = window.fetch.bind(window);
    (window as any).companyMode = "empty";
    window.fetch = (input, init) =>
      String(input) === "/api/company-settings" &&
      (window as any).companyMode !== "real"
        ? Promise.resolve(
            new Response(
              JSON.stringify(
                (window as any).companyMode === "empty"
                  ? {
                      id: 1,
                      company_name: "",
                      brand_name: "LEGADO NÃO É EMPRESA",
                      company_document: "",
                      phone: "",
                      email: "",
                      address: "",
                    }
                  : { detail: "Falha simulada" },
              ),
              {
                status: (window as any).companyMode === "empty" ? 200 : 500,
                headers: { "Content-Type": "application/json" },
              },
            ),
          )
        : actual(input, init);
  });
  await page.goto("/entrar");
  await signIn(page);
  await home(page);
  await expect(page.locator(".silex-home__company")).toContainText(
    "Nome empresarial não informado",
  );
  await expect(page.locator(".silex-home")).not.toContainText(
    "LEGADO NÃO É EMPRESA",
  );
  await page.evaluate(() => {
    (window as any).companyMode = "error";
    history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.locator(".silex-public")).toBeVisible();
  await page.evaluate(() => {
    location.hash = "home";
  });
  await home(page);
  await expect(page.locator(".silex-home__company")).toContainText(
    "Identificação empresarial indisponível",
  );
  await expect(page.locator('[data-home-route="customers"]')).toBeVisible();
  await noOverflow(page);
});

test("teclado na Início, foco visível e menu P03 preservado", async ({
  page,
}) => {
  await page.goto("/entrar");
  await signIn(page);
  await home(page);
  const link = page.locator('[data-home-route="customers"]');
  await page.keyboard.press("Tab");
  await link.focus();
  expect(
    await link.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app#customers$/);
  await page.goBack();
  await home(page);
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await opener.isVisible()) {
    await opener.focus();
    await page.keyboard.press("Enter");
    const sidebar = page.locator("#app-navigation");
    await expect(
      sidebar.getByRole("button", { name: "Fechar menu", exact: true }),
    ).toBeFocused();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(
        await sidebar.evaluate((el) => el.contains(document.activeElement)),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    await expect(sidebar).toHaveAttribute("inert");
  }
  await noOverflow(page);
});
