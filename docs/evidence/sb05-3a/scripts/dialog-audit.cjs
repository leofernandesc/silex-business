const fs = require("node:fs"),
  path = require("node:path");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3a");
const { firefox } = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("playwright");
(async () => {
  const b = await firefox.launch({
      executablePath:
        "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
    }),
    rows = [];
  try {
    for (const [variant, port] of [
      ["baseline", 18040],
      ["candidate", 18041],
    ])
      for (const width of [1440, 768, 375]) {
        const c = await b.newContext({ viewport: { width, height: 900 } }),
          p = await c.newPage();
        await p.goto(`http://127.0.0.1:${port}/app#finance-reconcile`);
        await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
        await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
        await p.getByRole("button", { name: "Entrar", exact: true }).click();
        await p
          .getByRole("row")
          .filter({ hasText: "Extrato ilustrativo SB053A.ofx" })
          .getByRole("button", { name: "Revisar", exact: true })
          .click();
        await p
          .getByRole("row")
          .filter({ hasText: "Entrada sintética elevada" })
          .getByRole("button", { name: "Revisar / confirmar", exact: true })
          .click();
        await p.getByRole("dialog").waitFor();
        for (const mode of ["normal", "text200", "zoom200", "halfCSS"]) {
          await p.setViewportSize({
            width: mode === "halfCSS" ? Math.floor(width / 2) : width,
            height: 900,
          });
          await p.evaluate((mode) => {
            document.documentElement.style.zoom = mode === "zoom200" ? "2" : "";
            const nodes = [...document.querySelectorAll("dialog,dialog *")];
            if (mode === "text200") {
              nodes.forEach(
                (e) => (e.dataset.originalSize = getComputedStyle(e).fontSize),
              );
              nodes.forEach(
                (e) =>
                  (e.style.fontSize =
                    parseFloat(e.dataset.originalSize) * 2 + "px"),
              );
            } else nodes.forEach((e) => (e.style.fontSize = ""));
          }, mode);
          const measure = await p.getByRole("dialog").evaluate((d) => {
            const e = d.querySelector(".modal-content > p strong"),
              r = document.createRange();
            r.selectNodeContents(e);
            return {
              viewport: innerWidth,
              document: document.documentElement.scrollWidth,
              dialogClient: d.clientWidth,
              dialogScroll: d.scrollWidth,
              contentClient: d.querySelector(".modal-content").clientWidth,
              contentScroll: d.querySelector(".modal-content").scrollWidth,
              value: e.textContent,
              lines: [...r.getClientRects()].map((r) => ({
                x: r.x,
                width: r.width,
              })),
              visibleRight: d.getBoundingClientRect().right,
            };
          });
          rows.push({ variant, width, mode, ...measure });
          if (width === 375 && ["normal", "text200"].includes(mode))
            await p.screenshot({
              path: path.join(
                E,
                `screenshots/${variant}-dialog-${mode}-${width}.png`,
              ),
              animations: "disabled",
            });
        }
        await c.close();
      }
  } finally {
    await b.close();
  }
  fs.writeFileSync(
    path.join(E, "dialog-audit.json"),
    JSON.stringify({ rows }, null, 2),
  );
  console.log(
    JSON.stringify(
      rows.map((r) => ({
        variant: r.variant,
        width: r.width,
        mode: r.mode,
        document: r.document,
        dialog: r.dialogClient,
        scroll: r.dialogScroll,
        content: r.contentClient,
        contentScroll: r.contentScroll,
        lines: r.lines.length,
      })),
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
