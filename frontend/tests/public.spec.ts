import { test, expect, type Page } from "@playwright/test";

const privateCompany = "Empresa Privada de Teste";
async function checkPublic(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sua empresa,organizada emum só lugar.",
  );
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(privateCompany);
  await expect(page.locator("body")).not.toContainText("Administrador Demo");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function signIn(page: Page) {
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}

test("público sem sessão: conteúdo, metadados, fontes e nenhuma API ou rastreador", async ({
  page,
}) => {
  const apiRequests: string[] = [],
    external: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/"))
      apiRequests.push(r.url());
    if (!r.url().startsWith("http://127.0.0.1:8011/")) external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await checkPublic(page);
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveTitle(/Silex Business — Sua empresa/);
  expect(
    await page.locator('meta[name="description"]').getAttribute("content"),
  ).toContain("caixa, estoque e financeiro");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  expect(
    await page
      .locator(
        'link[rel="canonical"], script[type="application/ld+json"], form',
      )
      .count(),
  ).toBe(0);
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('600 16px "Silex Inter Local"');
    }),
  ).toBe(true);
  expect(apiRequests).toEqual([]);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await expect(
    page.getByText("Conciliação OFX com confirmação manual", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Serviços e operações" }),
  ).toBeVisible();
  await page.reload();
  await checkPublic(page);
  expect(apiRequests).toEqual([]);
});

test("âncoras públicas, rolagem, histórico e refresh não ativam módulos ERP", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) calls.push(r.url());
  });
  await page.goto("/");
  await checkPublic(page);
  await page
    .getByRole("link", { name: "Conhecer os módulos", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#modulos$/);
  await expect(page.locator("#modulos")).toBeInViewport();
  await page
    .locator(".silex-public__footer")
    .getByRole("link", { name: "Demonstração", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#demonstracao$/);
  await expect(page.locator("#demonstracao")).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\/#modulos$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/#demonstracao$/);
  await page.reload();
  await expect(page.locator("#demonstracao")).toBeInViewport();
  await checkPublic(page);
  await page.goto("/#unknown");
  await checkPublic(page);
  expect(calls).toEqual([]);
});

test("Entrar, login, ERP e logout conservam os contratos do SB-03", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".silex-public__header")
    .getByRole("link", { name: "Entrar", exact: true })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);
  await signIn(page);
  await expect(page).toHaveURL(/\/app#home$/);
  await expect(page.locator(".workspace")).toContainText(privateCompany);
  await page.reload();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.locator("body")).not.toContainText(privateCompany);
  await expect
    .poll(async () => (await page.request.get("/api/auth/me")).status())
    .toBe(401);
  await page.goto("/");
  await checkPublic(page);
});

test("sessão válida no público permanece privada; retorno same-document não é reescrito pelo ERP", async ({
  page,
  context,
}) => {
  expect(
    (
      await context.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).status(),
  ).toBe(200);
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) calls.push(r.url());
  });
  await page.goto("/");
  await checkPublic(page);
  await page.waitForLoadState("networkidle");
  expect(calls).toEqual([]);
  await page
    .getByRole("link", { name: "Conhecer os módulos", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#modulos$/);
  await page.evaluate(() => {
    location.hash = "customers";
  });
  await expect(page).toHaveURL(/\/app#customers$/);
  await expect(page.locator(".breadcrumb strong")).toHaveText("Clientes");
  const countBeforeBack = calls.length;
  await page.goBack();
  await expect(page).toHaveURL(/\/#modulos$/);
  await checkPublic(page);
  await page.waitForLoadState("networkidle");
  expect(calls.length).toBe(countBeforeBack);
  await page.goForward();
  await expect(page).toHaveURL(/\/app#customers$/);
  await expect(page.locator(".breadcrumb strong")).toHaveText("Clientes");
  await page.evaluate(() => {
    history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/$/);
  await checkPublic(page);
  const countPublic = calls.length;
  await page.reload();
  await checkPublic(page);
  await page.waitForLoadState("networkidle");
  expect(calls.length).toBe(countPublic);
  await page
    .locator(".silex-public__header")
    .getByRole("link", { name: "Entrar", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app#home$/);
});

test("menu público por teclado: disclosure não modal, Escape, seções e breakpoint", async ({
  page,
}) => {
  await page.goto("/");
  await checkPublic(page);
  const nav = page.getByRole("navigation", {
    name: "Navegação pública",
    exact: true,
  });
  const trigger = page.getByRole("button", {
    name: "Abrir navegação pública",
    exact: true,
  });
  if ((page.viewportSize()?.width || 0) > 700) {
    await expect(trigger).not.toBeVisible();
    await expect(nav).toBeVisible();
  } else {
    await expect(nav).toBeHidden();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", {
        name: "Fechar navegação pública",
        exact: true,
      }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    await expect(page.locator('[aria-modal="true"], [inert]')).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(
      nav.getByRole("link", { name: "Módulos", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(nav).toBeHidden();
    await page.keyboard.press("Enter");
    await nav.getByRole("link", { name: "Benefícios", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/#beneficios$/);
    await expect(nav).toBeHidden();
    await expect(page.locator("#beneficios")).toBeFocused();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Módulos", exact: true }).focus();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(trigger).toBeFocused();
  await expect(nav).toBeHidden();
  await page
    .getByRole("link", { name: "Pular para o conteúdo", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#public-content")).toBeFocused();
});

test("demonstração acessível de vendas: dados fictícios, cinco colunas e rolagem contida", async ({
  page,
}) => {
  await page.goto("/#demonstracao");
  await checkPublic(page);
  const region = page.getByRole("region", {
    name: "Tabela ilustrativa de vendas",
    exact: true,
  });
  await expect(region.locator("th")).toHaveCount(5);
  await expect(region.locator("tbody tr")).toHaveCount(3);
  await expect(region).toContainText("Cliente Horizonte");
  await expect(region).toContainText("Rascunho");
  expect(await region.locator("button,input,a").count()).toBe(0);
  await region.focus();
  const outline = await region.evaluate(
    (el) => getComputedStyle(el).outlineStyle,
  );
  expect(outline).not.toBe("none");
  const scrollable = await region.evaluate(
    (el) => el.scrollWidth > el.clientWidth,
  );
  if (scrollable) {
    const start = await region.evaluate((el) => el.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(start);
  }
  await checkPublic(page);
});

test("movimento reduzido e ampliação a 200% não tornam o conteúdo inacessível", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await checkPublic(page);
  expect(
    await page.locator("h1").evaluate((el) => ({
      animation: getComputedStyle(el).animationName,
      transition: getComputedStyle(el).transitionDuration,
    })),
  ).toEqual({ animation: "none", transition: "0s" });
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.body.style.zoom = "";
  });
  await checkPublic(page);
});
