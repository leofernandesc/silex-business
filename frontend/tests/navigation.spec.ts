import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  routes,
  LOGOUT_PENDING_KEY,
  RETURN_KEY,
} from "../src/navigation/routes";

async function signIn(page: Page, username = "demo.admin") {
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}
async function start(page: Page, username = "demo.admin") {
  await page.goto("/entrar");
  await signIn(page, username);
  await expect(page).toHaveURL(/\/app#home$/);
  await page.goto("/app#dashboard");
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
}
async function openMenu(page: Page) {
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await opener.isVisible()) await opener.click();
}
async function overflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
}
async function expireCookieSession(page: Page) {
  // Only the disposable fixture provided by the isolated test launcher may be changed.
  const envPath = process.env.SILEX_SB04B_ENV || process.env.SILEX_SB04A_ENV || process.env.SILEX_SB03_ENV;
  if (!envPath)
    throw new Error(
      "SILEX_SB03_ENV must name the isolated environment manifest",
    );
  const env = JSON.parse(readFileSync(envPath, "utf8"));
  if (
    !/^\/tmp\/silex-sb0(?:3|4a|4b)-/.test(env.work_dir) ||
    env.persistent_database_used !== false
  )
    throw new Error("Isolated fixture required");
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "gestao_session",
  );
  expect(cookie).toBeTruthy();
  execFileSync("python3", [
    "-c",
    "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('UPDATE sessions SET expires_at=? WHERE token_hash=?',('2000-01-01 00:00:00.000000',sys.argv[2])); c.commit(); c.close()",
    env.work_dir + "/functional.sqlite3",
    createHash("sha256").update(cookie!.value).digest("hex"),
  ]);
}

test("login inválido/válido e persistência sem mudanças no cookie", async ({
  page,
}) => {
  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page.getByLabel("Senha", { exact: true }).fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await signIn(page);
  await expect(page).toHaveURL(/\/app#home$/);
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "gestao_session",
  );
  expect(cookie).toMatchObject({
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
  });
  await page.reload();
  await expect(page.locator(".workspace")).toContainText(
    "Empresa Privada de Teste",
  );
  await expect(page).toHaveURL(/\/app#home$/);
  await overflow(page);
});

test("rota protegida retorna após login, refresh e logout sem conteúdo privado no histórico", async ({
  page,
}) => {
  const protectedRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/finance")) protectedRequests.push(r.url());
  });
  await page.goto("/app#finance-payable");
  await expect(page).toHaveURL(/\/entrar$/);
  expect(protectedRequests).toHaveLength(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key) || "null").id,
      RETURN_KEY,
    ),
  ).toBe("finance-payable");
  await page.reload();
  await signIn(page);
  await expect(page).toHaveURL(/\/app#finance-payable$/);
  await expect(
    page.getByRole("heading", { name: "Contas a Pagar", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), RETURN_KEY),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Contas a Pagar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    "Empresa Privada de Teste",
  );
  await expect
    .poll(async () => (await page.request.get("/api/auth/me")).status())
    .toBe(401);
  await page.goBack();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await page.goForward();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await overflow(page);
});

test("compatibilidade dos 24 hashes anteriores, alias, home e destino desconhecido", async ({
  page,
}) => {
  await start(page);
  for (const route of routes) {
    await page.goto("/#" + route.id);
    await expect(page).toHaveURL(new RegExp("/app#" + route.id + "$"));
    await expect(page.locator(".breadcrumb strong")).toHaveText(route.title);
    await expect(page.locator(".app-shell")).toBeVisible();
  }
  await page.goto("/app#home");
  await expect(page).toHaveURL(/\/app#home$/);
  await expect(page.getByRole("heading", { name: "Página inicial", exact: true })).toBeVisible();
  await page.goto("/app#desconhecido");
  await expect(page.getByRole("alert")).toContainText(
    "Endereço não encontrado",
  );
  await page.goto("/rota-inexistente");
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.getByRole("alert")).toContainText(
    "Endereço não encontrado",
  );
  await overflow(page);
});

test("navegação interna, Voltar/Avançar, foco e atalho financeiro", async ({
  page,
}) => {
  await start(page);
  await openMenu(page);
  await page.getByRole("button", { name: "CADASTROS", exact: true }).click();
  await page.getByRole("button", { name: "Clientes", exact: true }).click();
  await expect(page).toHaveURL(/\/app#customers$/);
  await page.evaluate(() => {
    location.hash = "products";
  });
  await expect(page).toHaveURL(/\/app#products$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/app#customers$/);
  await expect(page.locator("#main-content")).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/app#customers$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/app#products$/);
  await page.goto("/app#finance-dashboard");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Abrir livro caixa", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app#finance$/);
  await overflow(page);
});

test("P08: operador sem atalhos administrativos e guard uniforme para todos os destinos", async ({
  page,
}) => {
  await page.goto("/app#finance");
  await signIn(page, "demo.operador");
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  await openMenu(page);
  const nav = page.getByRole("navigation", { name: "Menu principal" });
  await expect(
    nav.getByRole("button", { name: "FINANCEIRO", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("button", { name: "ADMINISTRAÇÃO", exact: true }),
  ).toHaveCount(0);
  for (const route of routes.filter((r) => r.admin)) {
    await page.goto("/app#" + route.id);
    await expect(page).toHaveURL(/\/app#dashboard$/);
    await expect(page.getByRole("alert")).toContainText("não tem permissão");
  }
  for (const endpoint of [
    "/finance",
    "/finance/dashboard",
    "/accounts",
    "/categories",
    "/subcategories",
    "/suppliers",
    "/finance/ofx/imports",
    "/finance/reports/catalog",
    "/users",
    "/audit",
    "/reports/finance.csv",
  ]) {
    expect((await page.request.get("/api" + endpoint)).status(), endpoint).toBe(
      403,
    );
  }
  expect(
    (
      await page.request.post("/api/accounts", {
        data: { name: "Não deve ser criado", kind: "bank", opening_cents: 0 },
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.get("/api/auth/me")).status()).toBe(200);
  await page.goto("/app#customers");
  await expect(page.locator(".breadcrumb strong")).toHaveText("Clientes");
  await overflow(page);
});

test("P03: teclado, modal móvel, submenus, Escape e foco restaurado", async ({
  page,
}, info) => {
  await start(page);
  const sidebar = page.locator("#app-navigation");
  if ((page.viewportSize()?.width || 0) > 900) {
    await expect(sidebar).not.toHaveAttribute("inert");
    await expect(sidebar).not.toHaveAttribute("aria-modal", "true");
    await sidebar
      .getByRole("button", { name: "CADASTROS", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(
      sidebar.getByRole("button", { name: "Clientes", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Sair", exact: true }).focus();
    await expect(
      page.getByRole("button", { name: "Sair", exact: true }),
    ).toBeFocused();
    return;
  }
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  await expect(sidebar).toHaveAttribute("inert");
  await sidebar
    .locator("button")
    .first()
    .evaluate((element: HTMLElement) => element.focus());
  expect(
    await sidebar.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(false);
  await opener.focus();
  await page.keyboard.press("Enter");
  const close = sidebar.getByRole("button", {
    name: "Fechar menu",
    exact: true,
  });
  await expect(close).toBeFocused();
  await expect(sidebar).toHaveAttribute("aria-modal", "true");
  await expect(opener).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".main-shell")).toHaveAttribute("inert");
  await page.keyboard.press("Shift+Tab");
  expect(
    await sidebar.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  for (let i = 0; i < 32; i++) {
    await page.keyboard.press("Tab");
    expect(
      await sidebar.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  const group = sidebar.getByRole("button", { name: "CADASTROS", exact: true });
  await group.focus();
  await page.keyboard.press("Enter");
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(
    sidebar.getByRole("button", { name: "Clientes", exact: true }),
  ).toBeFocused();
  const focus = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return {
      style: s.outlineStyle,
      width: s.outlineWidth,
      color: s.outlineColor,
    };
  });
  expect(focus.style).not.toBe("none");
  await page.screenshot({
    path: process.env.SILEX_SB03_SCREENSHOTS
      ? process.env.SILEX_SB03_SCREENSHOTS +
        "/menu-keyboard-" +
        info.project.name +
        ".png"
      : info.outputPath("menu-keyboard.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert");
  await page.keyboard.press("Enter");
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(opener).toBeFocused();
  await opener.click();
  await page.locator(".nav-backdrop").click({
    position: { x: (page.viewportSize()?.width || 375) - 20, y: 100 },
  });
  await expect(opener).toBeFocused();
  await opener.focus();
  await page.keyboard.press("Enter");
  await sidebar.getByRole("button", { name: "Clientes", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app#customers$/);
  await expect(opener).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert");
  await overflow(page);
});

test("sessão expirada no servidor, limpeza e retorno após reautenticação", async ({
  page,
}) => {
  test.skip(
    !(process.env.SILEX_SB04B_ENV || process.env.SILEX_SB04A_ENV || process.env.SILEX_SB03_ENV),
    "Requer manifesto do ambiente descartável SB-03",
  );
  await start(page);
  await page.goto("/app#customers");
  await expect(page.locator(".breadcrumb strong")).toHaveText("Clientes");
  await expireCookieSession(page);
  await page.evaluate(() => {
    location.hash = "products";
  });
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("alert")).toContainText("sessão terminou");
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    "Empresa Privada de Teste",
  );
  await signIn(page);
  await expect(page).toHaveURL(/\/app#products$/);
  await overflow(page);
});

test("logout com sessão já expirada considera 401 como saída concluída", async ({
  page,
}) => {
  test.skip(
    !(process.env.SILEX_SB04B_ENV || process.env.SILEX_SB04A_ENV || process.env.SILEX_SB03_ENV),
    "Requer manifesto do ambiente descartável SB-03",
  );
  await start(page);
  await expect(page.locator(".workspace")).toContainText(
    "Empresa Privada de Teste",
  );
  await expireCookieSession(page);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect
    .poll(() =>
      page.evaluate((key) => sessionStorage.getItem(key), LOGOUT_PENDING_KEY),
    )
    .toBeNull();
  await expect(
    page.getByRole("button", { name: "Concluir saída no servidor" }),
  ).toHaveCount(0);
});

test("falha de rede no logout oculta dados, persiste bloqueio local e permite nova tentativa", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const actual = window.fetch.bind(window);
    (window as any).failLogout = true;
    window.fetch = (input, init) =>
      (window as any).failLogout && String(input) === "/api/auth/logout"
        ? Promise.reject(new TypeError("Falha de rede simulada"))
        : actual(input, init);
  });
  await start(page);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("não foi confirmada");
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    "Empresa Privada de Teste",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Concluir saída no servidor" }),
  ).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await page.evaluate(() => {
    (window as any).failLogout = false;
  });
  await page
    .getByRole("button", { name: "Concluir saída no servidor" })
    .click();
  await expect
    .poll(async () => (await page.request.get("/api/auth/me")).status())
    .toBe(401);
  await expect(
    page.getByRole("button", { name: "Concluir saída no servidor" }),
  ).toHaveCount(0);
  await overflow(page);
});

test("403 de operação preserva sessão e comunica recusa sem expirar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const actual = window.fetch.bind(window);
    window.fetch = (input, init) =>
      String(input).startsWith("/api/finance/dashboard")
        ? Promise.resolve(
            new Response(
              JSON.stringify({ detail: "Acesso reservado ao administrador" }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            ),
          )
        : actual(input, init);
  });
  await start(page);
  await page.goto("/app#finance-dashboard");
  await expect(page.getByRole("alert")).toContainText(
    "Acesso reservado ao administrador",
  );
  await expect(page).toHaveURL(/\/app#finance-dashboard$/);
  await expect(page.locator(".app-shell")).toBeVisible();
  expect((await page.request.get("/api/auth/me")).status()).toBe(200);
  await overflow(page);
});

test("retorno adulterado e parâmetro externo não redirecionam para outra origem", async ({
  page,
}) => {
  await page.addInitScript(
    (key) =>
      sessionStorage.setItem(
        key,
        '{"id":"https://example.test","origin":"protected-request"}',
      ),
    RETURN_KEY,
  );
  await page.goto("/entrar?return=https://example.test");
  await signIn(page);
  await expect(page).toHaveURL(/127\.0\.0\.1:8011\/app#home$/);
});

test("P03: mudança de breakpoint conserva foco acessível e desfaz o modo modal", async ({
  page,
}) => {
  await start(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const sidebar = page.locator("#app-navigation");
  await expect(sidebar).not.toHaveAttribute("inert");
  await sidebar
    .getByRole("button", { name: "Início", exact: true })
    .focus();
  await page.setViewportSize({ width: 375, height: 812 });
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  await expect(opener).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert");
  await page.keyboard.press("Enter");
  await expect(
    sidebar.getByRole("button", { name: "Fechar menu", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(sidebar).not.toHaveAttribute("aria-modal", "true");
  await expect(page.locator(".main-shell")).not.toHaveAttribute("inert");
  await expect(
    sidebar.getByRole("button", { name: "Início", exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await overflow(page);
});
