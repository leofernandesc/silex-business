const fs = require("node:fs"),
  path = require("node:path");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3b");
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
      ["baseline", 18044],
      ["candidate", 18045],
    ]) {
      const c = await b.newContext({
          viewport: { width: 375, height: 812 },
          locale: "pt-BR",
        }),
        p = await c.newPage();
      await p.goto(`http://127.0.0.1:${port}/app#finance`);
      await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
      await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
      await p.getByRole("button", { name: "Entrar", exact: true }).click();
      await p
        .getByRole("heading", {
          name: "Lançamentos (Despesa/Receita)",
          exact: true,
        })
        .waitFor();
      await p.locator(".summary-card strong").first().waitFor();
      await p.waitForLoadState("networkidle");
      await p.getByLabel("De", { exact: true }).fill("");
      await p
        .getByRole("button", { name: "Nova despesa", exact: true })
        .click();
      await p.getByRole("dialog").waitFor();
      await p.keyboard.press("Escape");
      await p.getByRole("dialog").waitFor({ state: "detached" });
      const measured = await p.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        dashboardWrapperCount: document.querySelectorAll(
          ".silex-financial-dashboard",
        ).length,
        values: [...document.querySelectorAll(".summary-card strong")].map(
          (e) => {
            const r = document.createRange();
            r.selectNodeContents(e);
            return {
              text: e.textContent,
              client: e.clientWidth,
              scroll: e.scrollWidth,
              width: e.getBoundingClientRect().width,
              right: e.getBoundingClientRect().right,
              lines: r.getClientRects().length,
              whiteSpace: getComputedStyle(e).whiteSpace,
              fontSize: getComputedStyle(e).fontSize,
            };
          },
        ),
      }));
      await p.evaluate(() => scrollTo(0, 0));
      const file = `screenshots/${variant}-legacy-ledger-375.png`;
      await p.screenshot({ path: path.join(E, file), animations: "disabled" });
      rows.push({ variant, file, ...measured });
      await c.close();
    }
  } finally {
    await b.close();
  }
  const a = rows[0],
    d = rows[1];
  const equivalent =
    JSON.stringify({ ...a, variant: "", file: "" }) ===
    JSON.stringify({ ...d, variant: "", file: "" });
  const result = {
    preexisting: equivalent && a.document > a.viewport,
    identicalDataAndPresentation: equivalent,
    rows,
    scope: "Document only; no ledger, SummaryCard or global CSS changes.",
  };
  fs.writeFileSync(
    path.join(E, "legacy-ledger.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
