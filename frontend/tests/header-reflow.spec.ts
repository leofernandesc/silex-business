import { test, expect, type Page } from "@playwright/test";

const widths = [1440, 1024, 768, 375, 320, 256, 187];

async function longNames(page: Page) {
  await page.addInitScript(() => {
    const request = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await request(input, init);
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        location.href,
      );
      if (
        !response.ok ||
        !["/api/auth/me", "/api/auth/login", "/api/company-settings"].includes(
          url.pathname,
        )
      )
        return response;
      const payload = await response.clone().json();
      if (url.pathname === "/api/company-settings") {
        payload.company_name =
          "Empresa Ilustrativa de ComercializaçãoIntersetorialComNomeExtenso e Serviços Empresariais — Dados Fictícios";
        payload.brand_name = "Apresentação legada ilustrativa";
      } else {
        payload.name =
          "Pessoa Administradora Ilustrativa com NomeExtensoSemEspaçosParaRobustez — Dados Fictícios";
      }
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(JSON.stringify(payload), {
        status: response.status,
        headers,
      });
    };
  });
}

async function signIn(page: Page, role: "admin" | "operator") {
  const password = process.env.SILEX_TEST_PASSWORD;
  if (!password)
    throw Error("SILEX_TEST_PASSWORD for an isolated demo required");
  await page.goto(role === "admin" ? "/app#finance" : "/app#customers");
  await page
    .getByLabel("Usuário", { exact: true })
    .fill(role === "admin" ? "demo.admin" : "demo.operador");
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".topbar")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

async function headerFits(page: Page) {
  const result = await page.locator(".topbar").evaluate((header) => {
    const box = header.getBoundingClientRect();
    return {
      viewport: innerWidth,
      width: header.clientWidth,
      scroll: header.scrollWidth,
      offenders: [...header.querySelectorAll<HTMLElement>("*")]
        .filter((e) => e.getClientRects().length)
        .map((e) => ({
          className: String(e.className),
          x: e.getBoundingClientRect().left,
          right: e.getBoundingClientRect().right,
          top: e.getBoundingClientRect().top,
          bottom: e.getBoundingClientRect().bottom,
        }))
        .filter(
          (e) =>
            e.x < box.left - 1 ||
            e.right > box.right + 1 ||
            e.top < box.top - 1 ||
            e.bottom > box.bottom + 1,
        ),
    };
  });
  expect(result.offenders, JSON.stringify(result)).toEqual([]);
  expect(result.scroll).toBeLessThanOrEqual(result.width + 1);
}

test("R02: default financial header fits narrow viewports", async ({
  page,
}) => {
  await signIn(page, "admin");
  for (const width of [320, 256, 187]) {
    await page.setViewportSize({ width, height: 900 });
    await headerFits(page);
  }
});

for (const role of ["admin", "operator"] as const) {
  test(`R02: header and keyboard menu with long names (${role})`, async ({
    page,
  }) => {
    await longNames(page);
    await signIn(page, role);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await headerFits(page);
      if (width >= 320) {
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width + 1);
      }
      const opener = page.getByRole("button", {
        name: "Abrir menu",
        exact: true,
      });
      const logout = page.getByRole("button", { name: "Sair", exact: true });
      await expect(logout).toBeVisible();
      if (width > 900) {
        await expect(opener).toBeHidden();
        continue;
      }
      await opener.focus();
      await page.keyboard.press("Enter");
      const panel = page.locator("#app-navigation");
      const close = panel.getByRole("button", {
        name: "Fechar menu",
        exact: true,
      });
      await expect(close).toBeFocused();
      await expect(opener).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toHaveAttribute("aria-modal", "true");
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector("#app-navigation")!.getBoundingClientRect()
              .left,
          ) < 0.5,
      );
      const bounds = await close.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      const company = panel.locator(".workspace strong");
      await expect(company).toHaveText(
        /ComercializaçãoIntersetorialComNomeExtenso/,
      );
      expect(await panel.evaluate((e) => e.scrollWidth)).toBeLessThanOrEqual(
        (await panel.evaluate((e) => e.clientWidth)) + 1,
      );
      if (role === "operator") {
        await expect(
          panel.getByRole("button", { name: "FINANCEIRO", exact: true }),
        ).toHaveCount(0);
        await expect(
          panel.getByRole("button", { name: "ADMINISTRAÇÃO", exact: true }),
        ).toHaveCount(0);
      }
      await page.keyboard.press("Shift+Tab");
      for (let i = 0; i < 24; i++) {
        expect(
          await panel.evaluate((e) => e.contains(document.activeElement)),
        ).toBe(true);
        await page.keyboard.press("Tab");
      }
      const group = panel.getByRole("button", {
        name: "CADASTROS",
        exact: true,
      });
      await group.focus();
      if ((await group.getAttribute("aria-expanded")) !== "true")
        await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(
        panel.getByRole("button", { name: "Clientes", exact: true }),
      ).toBeFocused();
      expect(
        await page.evaluate(
          () => getComputedStyle(document.activeElement!).outlineStyle,
        ),
      ).not.toBe("none");
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      await expect(opener).toHaveAttribute("aria-expanded", "false");
      await expect(panel).toHaveAttribute("inert");
      await page.keyboard.press("Enter");
      await expect(close).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(opener).toBeFocused();
    }
    expect((await page.request.get("/api/finance/dashboard")).status()).toBe(
      role === "admin" ? 200 : 403,
    );
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.locator(".app-shell")).toHaveCount(0);
  });
}

test("R02: header remains usable with root text enlarged to 200%", async ({
  page,
}) => {
  await signIn(page, "admin");
  await page.setViewportSize({ width: 375, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await headerFits(page);
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Fechar menu", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toBeVisible();
});

test("R02: computed header and menu text enlarged to 200%", async ({
  page,
}) => {
  await signIn(page, "admin");
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const original = await page.evaluate(() => {
      const elements = [
        ...document.querySelectorAll<HTMLElement>(
          ".topbar, .topbar *, #app-navigation, #app-navigation *",
        ),
      ].filter((e) => e instanceof HTMLElement);
      for (const e of elements) e.style.removeProperty("font-size");
      const size = parseFloat(
        getComputedStyle(document.querySelector(".breadcrumb")!).fontSize,
      );
      const fonts = elements.map(
        (e) => [e, parseFloat(getComputedStyle(e).fontSize)] as const,
      );
      for (const [e, font] of fonts) e.style.fontSize = `${font * 2}px`;
      return size;
    });
    expect(
      await page
        .locator(".breadcrumb")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBe(original * 2);
    await headerFits(page);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Fechar menu", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page
      .locator("#app-navigation")
      .evaluate((e) => e.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});
