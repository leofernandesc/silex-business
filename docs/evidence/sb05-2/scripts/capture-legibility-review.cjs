const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { firefox } = createRequire(
  "/home/leofernandesc/controlmax-inspired/frontend/package.json",
)("playwright");

const repo = path.resolve(__dirname, "../../../..");
const evidence = path.join(repo, "docs/evidence/sb05-2");
const screenshots = path.join(evidence, "screenshots/legibility-correction");
const mode = process.argv[2];
const origin = process.argv[3] || "http://127.0.0.1:18037";
if (!["before", "after"].includes(mode)) {
  throw new Error(
    "Uso: node capture-legibility-review.cjs before|after [origin]",
  );
}

const routes = [
  { route: "finance-payable", title: "Contas a Pagar", direction: "expense" },
  {
    route: "finance-receivable",
    title: "Contas a Receber",
    direction: "income",
  },
];
const sizes = [
  { width: 1440, height: 900, label: "1440" },
  { width: 768, height: 1024, label: "768" },
  { width: 375, height: 812, label: "375" },
];

async function login(page, first) {
  await page.goto(`${origin}/app#${first}`);
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("heading", { name: "Contas a Pagar", exact: true })
    .waitFor();
}

async function collect(page) {
  return page.evaluate(() => {
    const cards = [
      ...document.querySelectorAll(".finance-summary-grid .summary-card"),
    ];
    const indicators = cards.map((card) => {
      const value = card.querySelector("strong");
      const range = document.createRange();
      range.selectNodeContents(value);
      const rects = [...range.getClientRects()];
      return {
        label: card.querySelector("span")?.textContent?.trim(),
        value: value.textContent,
        lineCount: rects.length,
        textWidth: Math.max(0, ...rects.map((rect) => rect.width)),
        clientWidth: value.clientWidth,
        scrollWidth: value.scrollWidth,
        cardWidth: card.clientWidth,
        fontSize: getComputedStyle(value).fontSize,
        whiteSpace: getComputedStyle(value).whiteSpace,
        overflowWrap: getComputedStyle(value).overflowWrap,
      };
    });
    return {
      viewportWidth: innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      indicators,
    };
  });
}

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await firefox.launch({
    executablePath:
      "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
  });
  const results = [];
  try {
    for (const size of sizes) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        locale: "pt-BR",
      });
      const page = await context.newPage();
      await login(page, routes[0].route);
      for (const item of routes) {
        await page.goto(`${origin}/app#${item.route}`);
        await page
          .getByRole("heading", { name: item.title, exact: true })
          .waitFor();
        await page.getByRole("button", { name: "Tudo", exact: true }).click();
        await page
          .getByText(`Título ilustrativo SB052 ${item.direction} 26`, {
            exact: true,
          })
          .waitFor();
        await page.evaluate(() => document.fonts.ready);
        const actual = await collect(page);
        const actualName = `${mode}-${item.route}-${size.label}.png`;
        await page.screenshot({
          path: path.join(screenshots, actualName),
          fullPage: true,
        });
        results.push({
          route: item.route,
          width: size.width,
          kind: "fixture",
          screenshot: `screenshots/legibility-correction/${actualName}`,
          ...actual,
        });

        if (mode === "after") {
          await page.evaluate(() => {
            const [large, small] = [
              ...document.querySelectorAll(
                ".finance-summary-grid .summary-card",
              ),
            ];
            for (const card of [large, small])
              card.querySelector("span").textContent =
                "Exemplo de teste (fictício)";
            large.querySelector("strong").textContent = "R$ 1.234.567,89";
            large.querySelector("small").textContent =
              "Valor sintético de alta magnitude";
            small.querySelector("strong").textContent = "R$ 2.797,00";
            small.querySelector("small").textContent =
              "Valor sintético de referência";
          });
          const synthetic = await collect(page);
          const syntheticName = `after-${item.route}-${size.label}-synthetic.png`;
          await page.screenshot({
            path: path.join(screenshots, syntheticName),
            fullPage: true,
          });
          results.push({
            route: item.route,
            width: size.width,
            kind: "synthetic-values",
            screenshot: `screenshots/legibility-correction/${syntheticName}`,
            ...synthetic,
          });
          if (size.width === 375) {
            const cardsName = `after-${item.route}-375-synthetic-cards.png`;
            await page.locator(".finance-summary-grid").screenshot({
              path: path.join(screenshots, cardsName),
            });
            results.push({
              route: item.route,
              width: size.width,
              kind: "synthetic-values-detail",
              screenshot: `screenshots/legibility-correction/${cardsName}`,
              ...synthetic,
            });
          }
          await page.goto(`${origin}/app#${item.route}`);
          await page
            .getByRole("heading", { name: item.title, exact: true })
            .waitFor();
          await page.getByRole("button", { name: "Tudo", exact: true }).click();
          await page
            .getByText(`Título ilustrativo SB052 ${item.direction} 26`, {
              exact: true,
            })
            .waitFor();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const output = path.join(evidence, `legibility-${mode}.json`);
  fs.writeFileSync(
    output,
    `${JSON.stringify({ mode, origin, data: "demonstração fictícia; os exemplos sintéticos são inseridos apenas no DOM do navegador e não alteram API ou banco", results }, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        mode,
        screenshots: results.length,
        file: output,
        maxPageOverflow: Math.max(
          ...results.map((row) => row.pageScrollWidth - row.viewportWidth),
        ),
        wrappedValues: results.flatMap((row) =>
          row.indicators
            .filter((v) => v.lineCount > 1)
            .map((v) => ({
              width: row.width,
              route: row.route,
              value: v.value,
              lines: v.lineCount,
            })),
        ),
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
