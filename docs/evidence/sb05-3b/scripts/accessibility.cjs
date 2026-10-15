const fs = require("node:fs"),
  path = require("node:path");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3b");
const { firefox } = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("playwright");
function inspect() {
  const selectors = [
    ".summary-card span",
    ".summary-card strong",
    ".summary-card small",
    ".panel-heading h2",
    ".panel-heading p",
    ".monthly-bars small:not(.sr-only)",
    "th",
    "td",
    ".settings-list small",
    ".ledger-date-caption",
    "main button",
    "main input",
  ];
  return selectors.flatMap((selector) =>
    [...document.querySelectorAll("main " + selector.replace(/^main /, ""))]
      .filter((e) => e.getClientRects().length)
      .map((e) => {
        let parent = e,
          bg = "";
        while (parent) {
          const c = getComputedStyle(parent).backgroundColor;
          if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
            bg = c;
            break;
          }
          parent = parent.parentElement;
        }
        const s = getComputedStyle(e);
        return {
          selector,
          text: e.tagName === "INPUT" ? e.value : e.textContent,
          color: s.color,
          background: bg || "rgb(255, 255, 255)",
          size: s.fontSize,
          border: s.borderColor,
          borderWidth: s.borderWidth,
        };
      }),
  );
}
function luminance(rgb) {
  const v = rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
    .map((x) => x / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
}
function ratio(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
(async () => {
  const browser = await firefox.launch({
      executablePath:
        "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
    }),
    rows = [];
  try {
    for (const [variant, port] of [
      ["baseline", 18044],
      ["candidate", 18045],
    ])
      for (const width of [1440, 768, 375]) {
        const c = await browser.newContext({
            viewport: { width, height: 900 },
          }),
          p = await c.newPage();
        await p.goto(`http://127.0.0.1:${port}/app#finance-dashboard`);
        await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
        await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
        await p.getByRole("button", { name: "Entrar", exact: true }).click();
        await p.locator(".settings-list li").last().waitFor();
        const samples = await p.evaluate(inspect);
        rows.push({
          variant,
          width,
          samples: samples.map((s) => ({
            ...s,
            ratio: ratio(s.color, s.background),
          })),
        });
        await c.close();
      }
  } finally {
    await browser.close();
  }
  const result = {
    rows,
    failures: rows.map((r) => ({
      variant: r.variant,
      width: r.width,
      failures: r.samples.filter((s) => s.ratio < 4.5),
    })),
  };
  fs.writeFileSync(
    path.join(E, "accessibility.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify(
      result.failures.map((r) => ({
        variant: r.variant,
        width: r.width,
        count: r.failures.length,
        selectors: [...new Set(r.failures.map((s) => s.selector))],
      })),
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
