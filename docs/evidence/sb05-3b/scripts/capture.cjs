const fs = require("node:fs"),
  path = require("node:path");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3b");
const { firefox } = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("playwright");
const variant = process.argv[2],
  origin = `http://127.0.0.1:${variant === "baseline" ? 18044 : 18045}`;
function measure() {
  const values = [
    ...document.querySelectorAll(
      "main .summary-card strong,main .settings-list strong,main td.numeric",
    ),
  ]
    .filter((e) => e.getClientRects().length)
    .map((e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      const b = e.getBoundingClientRect();
      return {
        text: e.textContent,
        lines: r.getClientRects().length,
        client: e.clientWidth,
        scroll: e.scrollWidth,
        left: b.x,
        right: b.right,
      };
    });
  const scope =
    document.querySelector(".silex-financial-dashboard") ||
    document.querySelector("main");
  return {
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    scope: scope.clientWidth,
    scopeScroll: scope.scrollWidth,
    values,
    inter: document.fonts.check('600 14px "Silex Inter Local"'),
  };
}
(async () => {
  fs.mkdirSync(path.join(E, "screenshots"), { recursive: true });
  const b = await firefox.launch({
      executablePath:
        "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
    }),
    rows = [];
  try {
    for (const width of [1440, 768, 375]) {
      const c = await b.newContext({
          viewport: {
            width,
            height: width === 1440 ? 900 : width === 768 ? 1024 : 812,
          },
          locale: "pt-BR",
        }),
        p = await c.newPage(),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(origin + "/app#finance-dashboard");
      await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
      await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
      const response = p.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/finance/dashboard",
      );
      await p.getByRole("button", { name: "Entrar", exact: true }).click();
      await response;
      await p
        .getByRole("heading", { name: "Dashboard financeiro", exact: true })
        .waitFor();
      await p.locator(".settings-list li").last().waitFor();
      await p.evaluate(() => document.fonts.ready);
      async function shot(id, locator, fullPage = false) {
        const file = `screenshots/${variant}-${id}-${width}.png`;
        if (locator)
          await locator.screenshot({
            path: path.join(E, file),
            animations: "disabled",
          });
        else
          await p.screenshot({
            path: path.join(E, file),
            animations: "disabled",
            fullPage,
          });
        rows.push({
          variant,
          width,
          id,
          file,
          errors: [...errors],
          ...(await p.evaluate(measure)),
        });
      }
      await shot("full", null, true);
      await p.evaluate(() => scrollTo(0, 0));
      await shot("indicators");
      const chart = p.locator("section").filter({
        has: p.getByRole("heading", {
          name: "Movimentos por mês",
          exact: true,
        }),
      });
      await shot("chart", chart);
      const classification = p.locator("section").filter({
        has: p.getByRole("heading", {
          name: "Resultado por classificação e grupo",
          exact: true,
        }),
      });
      await shot("classification", classification);
      await shot(
        "accounts",
        p.locator("section").filter({
          has: p.getByRole("heading", {
            name: "Saldo atual por conta",
            exact: true,
          }),
        }),
      );
      await p.keyboard.press("Tab");
      await p.getByLabel("De", { exact: true }).focus();
      await shot("focus");
      const wrap = classification.locator(".table-wrap");
      if (variant === "candidate") {
        await p.keyboard.press("Tab");
        await wrap.focus();
      }
      await wrap.evaluate((e) => (e.scrollLeft = e.scrollWidth));
      await wrap.locator("th").last().scrollIntoViewIfNeeded();
      await shot("last-column");
      if (variant === "candidate") {
        await p
          .getByText("Consultar valores mensais em tabela", { exact: true })
          .click();
        await shot("monthly-table", p.locator(".dashboard-monthly-values"));
      }
      await p.evaluate(() => {
        scrollTo(0, 0);
        const root =
          document.querySelector(".silex-financial-dashboard") ||
          document.querySelector("main");
        const nodes = [root, ...root.querySelectorAll("*")].filter(
          (e) => e.getClientRects().length,
        );
        const sizes = nodes.map((e) =>
          parseFloat(getComputedStyle(e).fontSize),
        );
        nodes.forEach((e, i) => {
          e.dataset.oldFont = e.style.fontSize;
          e.style.fontSize = sizes[i] * 2 + "px";
        });
      });
      await shot("text200", null, true);
      await p.evaluate(() => {
        document
          .querySelectorAll("[data-old-font]")
          .forEach((e) => (e.style.fontSize = e.dataset.oldFont));
        document.documentElement.style.zoom = "2";
        scrollTo(0, 0);
      });
      await shot("zoom200");
      await p.evaluate(() => (document.documentElement.style.zoom = ""));
      if (width === 375) {
        await p.setViewportSize({ width: 187, height: 812 });
        await p.evaluate(() => scrollTo(0, 0));
        await shot("reflow187");
      }
      await c.close();
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(
    path.join(E, `visual-${variant}.json`),
    JSON.stringify({ rows }, null, 2),
  );
  console.log(
    JSON.stringify({
      variant,
      captures: rows.length,
      overflows: rows
        .filter((r) => r.document > r.viewport + 1)
        .map((r) => ({
          width: r.width,
          id: r.id,
          document: r.document,
          scope: r.scope,
          scroll: r.scopeScroll,
        })),
      errors: rows.flatMap((r) => r.errors),
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
