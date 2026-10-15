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
    for (const width of [1440, 768, 375]) {
      const c = await b.newContext({ viewport: { width, height: 900 } }),
        p = await c.newPage();
      await p.addInitScript(() => {
        const original = window.fetch.bind(window);
        window.dashboardReviewMode = "loading";
        window.fetch = async (input, init) => {
          const url = new URL(
            input instanceof Request ? input.url : String(input),
            location.origin,
          );
          if (url.pathname !== "/api/finance/dashboard")
            return original(input, init);
          if (window.dashboardReviewMode === "loading")
            await new Promise((r) => (window.releaseDashboardReview = r));
          const body =
            window.dashboardReviewMode === "error"
              ? { detail: "Erro ilustrativo de consulta" }
              : {
                  start: url.searchParams.get("start"),
                  end: url.searchParams.get("end"),
                  income_cents: 0,
                  expense_cents: 0,
                  net_cents: 0,
                  movement_count: 0,
                  accounts: [],
                  receivable_open_cents: 0,
                  payable_open_cents: 0,
                  receivable_overdue_cents: 0,
                  payable_overdue_cents: 0,
                  monthly: [],
                  result_groups: [],
                  budget_month: "2026-10",
                };
          return new Response(JSON.stringify(body), {
            status: window.dashboardReviewMode === "error" ? 500 : 200,
            headers: { "Content-Type": "application/json" },
          });
        };
      });
      await p.goto("http://127.0.0.1:18045/app#finance-dashboard");
      await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
      await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
      await p.getByRole("button", { name: "Entrar", exact: true }).click();
      await p.getByRole("status").waitFor();
      for (const state of ["loading", "empty", "error"]) {
        if (state === "empty") {
          await p.evaluate(() => {
            window.dashboardReviewMode = "empty";
            window.releaseDashboardReview();
          });
          await p
            .getByText("Nenhuma conta disponível.", { exact: true })
            .waitFor();
        }
        if (state === "error") {
          await p.evaluate(() => (window.dashboardReviewMode = "error"));
          await p.getByLabel("De", { exact: true }).fill("2001-01-01");
          await p
            .getByRole("button", { name: "Atualizar", exact: true })
            .click();
          await p.getByRole("alert").waitFor();
        }
        await p.evaluate(() => scrollTo(0, 0));
        const file = `screenshots/candidate-state-${state}-${width}.png`;
        await p.screenshot({
          path: path.join(E, file),
          animations: "disabled",
        });
        rows.push({
          width,
          state,
          file,
          syntheticFrontendStub: true,
          ...(await p.evaluate(() => ({
            document: document.documentElement.scrollWidth,
            viewport: innerWidth,
            busy: document
              .querySelector(".silex-financial-dashboard")
              .getAttribute("aria-busy"),
            status:
              document.querySelector('[role="status"]')?.textContent || null,
            error:
              document.querySelector('[role="alert"]')?.textContent || null,
            indicators: document.querySelectorAll(".summary-card").length,
          }))),
        });
      }
      await c.close();
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(
    path.join(E, "state-captures.json"),
    JSON.stringify({ rows }, null, 2),
  );
  console.log(
    JSON.stringify({
      captures: rows.length,
      noOverflow: rows.every((r) => r.document <= r.viewport + 1),
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
