const fs = require("node:fs"),
  path = require("node:path");
const repo = path.resolve(__dirname, "../../../.."),
  E = path.join(repo, "docs/evidence/sb05-3a");
const { firefox } = require("node:module").createRequire(
  path.join(repo, "frontend/package.json"),
)("playwright");
const executablePath =
  "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox";
const variant = process.argv[2],
  origin = `http://127.0.0.1:${variant === "baseline" ? 18040 : 18041}`;
function metrics() {
  const root =
    document.querySelector(".silex-reconciliation") ||
    document.querySelector("main");
  const panel =
    root?.querySelector(".reconciliation-statement") ||
    root?.querySelectorAll(".panel")[1];
  return {
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    root: root?.clientWidth,
    rootScroll: root?.scrollWidth,
    panel: panel?.clientWidth,
    panelScroll: panel?.scrollWidth,
    topbar: document.querySelector(".topbar")?.scrollWidth,
  };
}
function presentation() {
  return [
    ...document.querySelectorAll(
      "main h1,main h2,main button,main input,main select,main th,main .summary-card strong",
    ),
  ]
    .slice(0, 100)
    .map((el) => {
      const s = getComputedStyle(el);
      return {
        tag: el.tagName,
        text: el.tagName === "STRONG" ? "" : el.textContent?.trim(),
        color: s.color,
        background: s.backgroundColor,
        font: s.fontFamily,
        size: s.fontSize,
        weight: s.fontWeight,
        border: s.border,
        radius: s.borderRadius,
      };
    });
}
function contrast(color, bg) {
  const lum = (x) => {
    const c = x
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((n) => n / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const a = lum(color),
    b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
(async () => {
  const browser = await firefox.launch({ executablePath }),
    screenshots = [],
    v01 = [],
    reflow = [],
    styles = [],
    contrasts = [];
  try {
    for (const width of [1440, 768, 375]) {
      const context = await browser.newContext({
          viewport: {
            width,
            height: width === 1440 ? 900 : width === 768 ? 1024 : 812,
          },
          locale: "pt-BR",
        }),
        page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      async function shot(id) {
        const file = `screenshots/${variant}-${id}-${width}.png`;
        await page.screenshot({
          path: path.join(E, file),
          animations: "disabled",
        });
        screenshots.push({
          id,
          width,
          file,
          ...(await page.evaluate(metrics)),
          errors: [...errors],
        });
      }
      await page.goto(origin + "/");
      await page
        .getByRole("heading", {
          name: "Sua empresa, organizada em um só lugar.",
          exact: true,
        })
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
      await shot("reg-public");
      await page.goto(origin + "/entrar");
      await page.getByLabel("Usuário", { exact: true }).waitFor();
      await shot("reg-login");
      await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
      await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page
        .getByRole("heading", { name: "Página inicial", exact: true })
        .waitFor();
      // Load financial modules first so both variants compare the same shared CSS cascade.
      await page.goto(origin + "/app#finance-reconcile");
      await page
        .getByRole("heading", { name: "Conciliação Bancária", exact: true })
        .waitFor();
      for (const [route, title] of [
        ["finance", "Lançamentos (Despesa/Receita)"],
        ["finance-payable", "Contas a Pagar"],
        ["finance-receivable", "Contas a Receber"],
        ["finance-dashboard", "Dashboard financeiro"],
        ["dashboard", "Visão geral"],
        ["home", "Página inicial"],
        ["customers", "Clientes"],
        ["stock", "Movimentações de estoque"],
        ["sales", "Vendas"],
      ]) {
        await page.goto(origin + "/app#" + route);
        await page.getByRole("heading", { name: title, exact: true }).waitFor();
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        styles.push({
          route,
          width,
          elements: await page.evaluate(presentation),
        });
        if (
          [
            "finance",
            "finance-dashboard",
            "home",
            "dashboard",
            "finance-payable",
            "finance-receivable",
          ].includes(route)
        )
          await shot("reg-" + route);
      }
      for (let n = 1; n <= 10; n++) {
        await page.goto(origin + "/app#finance-dashboard");
        await page
          .getByRole("heading", { name: "Dashboard financeiro", exact: true })
          .waitFor();
        await page.locator(".settings-list li").first().waitFor();
        const button = page.getByRole("button", {
          name: "Abrir livro caixa",
          exact: true,
        });
        const before = page.url(),
          bounds = await button.boundingBox();
        const state = await page.evaluate(() => ({
          hash: location.hash,
          menuOpen: document
            .querySelector(".sidebar")
            ?.getAttribute("aria-modal"),
          active: document.activeElement?.textContent?.slice(0, 100),
        }));
        let failure = null;
        try {
          await button.click({ timeout: 5000 });
          await page.waitForURL("**/app#finance", { timeout: 3000 });
          await page
            .getByRole("heading", {
              name: "Lançamentos (Despesa/Receita)",
              exact: true,
            })
            .waitFor({ timeout: 3000 });
        } catch (e) {
          failure = e.message;
          await shot("v01-failure-" + n);
        }
        v01.push({
          variant,
          width,
          execution: n,
          before,
          after: page.url(),
          bounds,
          state,
          passed: !failure,
          failure,
          errors: [...errors],
        });
      }
      await page.goto(origin + "/app#finance-reconcile");
      await page
        .getByRole("row")
        .filter({ hasText: "Extrato ilustrativo SB053A.ofx" })
        .getByRole("button", { name: "Revisar", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "Extrato ilustrativo SB053A.ofx",
          exact: true,
        })
        .waitFor();
      const badge = await page
        .locator(".reconciliation-state")
        .evaluateAll((nodes) =>
          nodes.map((e) => ({
            text: e.textContent,
            color: getComputedStyle(e).color,
            background: getComputedStyle(e).backgroundColor,
          })),
        );
      contrasts.push(
        ...badge
          .filter((b) => b.background !== "rgba(0, 0, 0, 0)")
          .map((b) => ({
            ...b,
            width,
            ratio: contrast(b.color, b.background),
          })),
      );
      if (width === 375) {
        await page.setViewportSize({ width: 187, height: 812 });
        await shot("reflow187");
        reflow.push({
          kind: "effective187CSS",
          ...(await page.evaluate(metrics)),
        });
        await page.setViewportSize({ width: 375, height: 812 });
        await page.evaluate(() => (document.documentElement.style.zoom = "2"));
        await shot("zoom200");
        reflow.push({ kind: "CSSzoom200", ...(await page.evaluate(metrics)) });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const result = { variant, screenshots, v01, reflow, styles, contrasts };
  fs.writeFileSync(
    path.join(E, "runtime-" + variant + ".json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      variant,
      clicks: v01.length,
      passed: v01.filter((r) => r.passed).length,
      failures: v01.filter((r) => !r.passed),
      reflow,
      contrastMinimum: contrasts.length
        ? Math.min(...contrasts.map((c) => c.ratio))
        : null,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
