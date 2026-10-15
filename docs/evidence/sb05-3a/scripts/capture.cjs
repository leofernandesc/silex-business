const fs = require("node:fs"),
  path = require("node:path");
const repo = path.resolve(__dirname, "../../../.."),
  E = path.join(repo, "docs/evidence/sb05-3a");
const { firefox } = require("node:module").createRequire(
  path.join(repo, "frontend/package.json"),
)("playwright");
const variant = process.argv[2],
  origin = `http://127.0.0.1:${variant === "baseline" ? 18040 : 18041}`;
const executablePath =
  "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox";
const fixture = JSON.parse(
  fs.readFileSync(path.join(E, "fixture.json"), "utf8"),
);
function measure() {
  const values = [
    ...document.querySelectorAll("td.numeric,dialog .modal-content > p strong"),
  ].map((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()];
    return {
      text: el.textContent,
      lines: rects.length,
      client: el.clientWidth,
      scroll: el.scrollWidth,
    };
  });
  return {
    width: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    values,
    inter: document.fonts.check('400 14px "Silex Inter Local"'),
    scopeWidth:
      document.querySelector(".silex-reconciliation")?.clientWidth || null,
  };
}
(async () => {
  fs.mkdirSync(path.join(E, "screenshots"), { recursive: true });
  const browser = await firefox.launch({ executablePath }),
    rows = [];
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
      await page.goto(origin + "/app#finance-reconcile");
      await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
      await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page
        .getByRole("heading", { name: "Conciliação Bancária", exact: true })
        .waitFor();
      await page
        .getByText("Extrato ilustrativo SB053A.ofx", { exact: true })
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
      async function shot(id) {
        const name = `${variant}-${id}-${width}.png`;
        await page.screenshot({
          animations: "disabled",
          path: path.join(E, "screenshots", name),
        });
        rows.push({
          variant,
          width,
          id,
          file: "screenshots/" + name,
          errors: [...errors],
          ...(await page.evaluate(measure)),
        });
      }
      await shot("history");
      await page.keyboard.press("Tab");
      await page.getByLabel("Conta bancária *", { exact: true }).focus();
      await shot("focus");
      await page
        .locator("tr")
        .filter({ hasText: "Extrato ilustrativo SB053A.ofx" })
        .getByRole("button", { name: "Revisar", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "Extrato ilustrativo SB053A.ofx",
          exact: true,
        })
        .waitFor();
      await page.evaluate(() => scrollTo(0, 0));
      await shot("main");
      const table = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", {
            name: "Extrato ilustrativo SB053A.ofx",
            exact: true,
          }),
        })
        .locator(".table-wrap");
      await table.focus();
      await table.evaluate((el) => (el.scrollLeft = el.scrollWidth));
      await table.locator("th").last().scrollIntoViewIfNeeded();
      await shot("last-column");
      await table.evaluate((el) => (el.scrollLeft = 0));
      await table
        .locator("tr")
        .filter({ hasText: "Entrada sintética elevada" })
        .getByRole("button", { name: "Revisar / confirmar", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await shot("match-dialog");
      const titles = page.getByLabel("Título pendente sugerido", {
        exact: true,
      });
      await titles.locator("option").nth(1).waitFor({ state: "attached" });
      await titles.selectOption(
        await titles.locator("option").nth(1).getAttribute("value"),
      );
      await page.keyboard.press("Tab");
      await page.getByLabel("Principal (R$)", { exact: true }).focus();
      await shot("match-fields");
      await page
        .getByRole("button", { name: "Criar lançamento", exact: true })
        .click();
      await shot("new-dialog");
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        scrollTo(0, 0);
        const root =
          document.querySelector(".silex-reconciliation") ||
          document.querySelector("main");
        const nodes = [root, ...root.querySelectorAll("*")].filter(
          (e) => e.getClientRects().length,
        );
        const sizes = nodes.map((e) => getComputedStyle(e).fontSize);
        nodes.forEach(
          (e, i) => (e.style.fontSize = parseFloat(sizes[i]) * 2 + "px"),
        );
      });
      await shot("text200");
      await context.close();
    }
  } finally {
    await browser.close();
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
        .filter((r) => r.pageWidth > r.width + 1)
        .map((r) => ({ id: r.id, width: r.width, page: r.pageWidth })),
      errors: rows.flatMap((r) => r.errors),
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
