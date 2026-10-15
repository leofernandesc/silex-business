const fs = require("node:fs"),
  path = require("node:path");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3a");
const { firefox } = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("playwright");
const targets = [
  ["finance", "Lançamentos (Despesa/Receita)"],
  ["finance-payable", "Contas a Pagar"],
  ["finance-receivable", "Contas a Receber"],
  ["finance-dashboard", "Dashboard financeiro"],
  ["dashboard", "Visão geral"],
  ["home", "Página inicial"],
  ["customers", "Clientes"],
  ["stock", "Movimentações de estoque"],
  ["sales", "Vendas"],
];
function signatures() {
  return [
    ...document.querySelectorAll(
      "main h1,main h2,main .page-title button,main .toolbar input,main .toolbar select,main .toolbar button,main th,main .summary-card strong",
    ),
  ].map((el) => {
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
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
(async () => {
  const b = await firefox.launch({
      executablePath:
        "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
    }),
    results = [];
  try {
    for (const width of [1440, 768, 375]) {
      const pairs = {};
      for (const [variant, port] of [
        ["baseline", 18040],
        ["candidate", 18041],
      ]) {
        const c = await b.newContext({ viewport: { width, height: 900 } }),
          p = await c.newPage();
        await p.goto(`http://127.0.0.1:${port}/app#finance-reconcile`);
        await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
        await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
        await p.getByRole("button", { name: "Entrar", exact: true }).click();
        await p
          .getByRole("heading", { name: "Conciliação Bancária", exact: true })
          .waitFor();
        pairs[variant] = [];
        for (const [route, title] of targets) {
          await p.goto(`http://127.0.0.1:${port}/app#${route}`);
          await p.getByRole("heading", { name: title, exact: true }).waitFor();
          await p.evaluate(() => document.fonts.ready);
          pairs[variant].push({
            route,
            width,
            signatures: await p.evaluate(signatures),
          });
        }
        await c.close();
      }
      for (let i = 0; i < targets.length; i++)
        results.push({
          route: targets[i][0],
          width,
          identical:
            JSON.stringify(pairs.baseline[i].signatures) ===
            JSON.stringify(pairs.candidate[i].signatures),
          baseline: pairs.baseline[i].signatures,
          candidate: pairs.candidate[i].signatures,
        });
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(
    path.join(E, "stable-style-comparison.json"),
    JSON.stringify(
      {
        passed: results.every((r) => r.identical),
        method:
          "Stable headings, page actions, toolbar controls, table headers and indicator styles only; no data-dependent row buttons or option text.",
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      checks: results.length,
      passed: results.filter((r) => r.identical).length,
      failures: results
        .filter((r) => !r.identical)
        .map((r) => ({ route: r.route, width: r.width })),
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
