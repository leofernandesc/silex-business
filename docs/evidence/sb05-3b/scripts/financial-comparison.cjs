const fs = require("node:fs"),
  path = require("node:path");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3b");
const { firefox } = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("playwright");
const fixture = JSON.parse(
  fs.readFileSync(path.join(E, "fixture-dashboard.json")),
);
function ui() {
  return {
    indicators: [...document.querySelectorAll(".summary-card strong")].map(
      (e) => e.textContent,
    ),
    details: [...document.querySelectorAll(".summary-card small")].map(
      (e) => e.textContent,
    ),
    months: [...document.querySelectorAll(".monthly-bars > div")].map((e) => ({
      title: e.getAttribute("title"),
      heights: [...e.querySelectorAll(".bar-pair span")].map(
        (s) => s.style.height,
      ),
    })),
    classification: [...document.querySelectorAll("main section")]
      .find(
        (s) =>
          s.querySelector("h2")?.textContent ===
          "Resultado por classificação e grupo",
      )
      ?.querySelector("tbody")?.textContent,
    accounts: [...document.querySelectorAll(".settings-list li")].map(
      (e) => e.textContent,
    ),
  };
}
(async () => {
  const b = await firefox.launch({
      executablePath:
        "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
    }),
    variants = {},
    clicks = [];
  try {
    for (const [variant, port] of [
      ["baseline", 18044],
      ["candidate", 18045],
    ]) {
      variants[variant] = { responses: [], ui: [] };
      for (const width of [1440, 768, 375]) {
        const c = await b.newContext({
            baseURL: `http://127.0.0.1:${port}`,
            viewport: { width, height: 900 },
            locale: "pt-BR",
          }),
          p = await c.newPage(),
          errors = [];
        await p.addInitScript(() => {
          window.dashboardEvents = [];
          for (const name of ["hashchange", "popstate"])
            addEventListener(name, () =>
              window.dashboardEvents.push({
                name,
                hash: location.hash,
                time: performance.now(),
              }),
            );
        });
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(`http://127.0.0.1:${port}/app#finance-dashboard`);
        await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
        await p.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
        await p.getByRole("button", { name: "Entrar", exact: true }).click();
        await p
          .getByRole("heading", { name: "Dashboard financeiro", exact: true })
          .waitFor();
        await p.locator(".settings-list li").last().waitFor();
        await p.evaluate(() => document.fonts.ready);
        for (const [name, snapshot] of Object.entries(fixture.snapshots)) {
          const query = new URLSearchParams({
              start: snapshot.start,
              end: snapshot.end,
            }),
            r = await p.request.get(`/api/finance/dashboard?${query}`);
          variants[variant].responses.push({
            width,
            name,
            status: r.status(),
            body: await r.json(),
          });
          await p.getByLabel("De", { exact: true }).fill(snapshot.start);
          await p.getByLabel("Até", { exact: true }).fill(snapshot.end);
          const wait =
            name === "default"
              ? null
              : p.waitForResponse(
                  (r) =>
                    new URL(r.url()).pathname === "/api/finance/dashboard" &&
                    new URL(r.url()).searchParams.get("start") ===
                      snapshot.start,
                );
          if (name === "default") {
            // The default query is already loaded; do not force a redundant request.
            await p
              .getByRole("button", { name: "Atualizar", exact: true })
              .click();
          } else {
            await p
              .getByRole("button", { name: "Atualizar", exact: true })
              .click();
            await wait;
          }
          await p.waitForFunction(
            () =>
              !document.querySelector(".silex-financial-dashboard") ||
              document
                .querySelector(".silex-financial-dashboard")
                .getAttribute("aria-busy") === "false",
          );
          await p.locator(".summary-card strong").first().waitFor();
          await p.waitForFunction((data) => {
            const expected = [
              data.income_cents,
              data.expense_cents,
              data.net_cents,
              data.receivable_open_cents,
              data.payable_open_cents,
              data.accounts.reduce((n, a) => n + a.balance_cents, 0),
            ].map((n) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(n / 100),
            );
            return (
              JSON.stringify(
                [...document.querySelectorAll(".summary-card strong")].map(
                  (e) => e.textContent,
                ),
              ) === JSON.stringify(expected) &&
              document
                .querySelector(".monthly-bars > div")
                ?.getAttribute("title")
                ?.startsWith(data.monthly[0].month)
            );
          }, snapshot);
          variants[variant].ui.push({ width, name, ...(await p.evaluate(ui)) });
        }
        for (let n = 1; n <= 10; n++) {
          await p.goto(`http://127.0.0.1:${port}/app#finance-dashboard`);
          await p
            .getByRole("heading", { name: "Dashboard financeiro", exact: true })
            .waitFor();
          await p.locator(".settings-list li").last().waitFor();
          await p.evaluate(() => document.fonts.ready);
          const before = p.url(),
            auth = (await p.request.get("/api/auth/me")).status(),
            state = await p.evaluate(() => ({
              hash: location.hash,
              loading:
                document
                  .querySelector(".silex-financial-dashboard")
                  ?.getAttribute("aria-busy") || "not-present-in-baseline",
              accounts: document.querySelectorAll(".settings-list li").length,
              documentWidth: document.documentElement.scrollWidth,
              viewport: innerWidth,
              eventIndex: window.dashboardEvents.length,
            }));
          let failure = null;
          try {
            await p
              .getByRole("button", { name: "Abrir livro caixa", exact: true })
              .click({ timeout: 5000 });
            await p.waitForURL("**/app#finance", { timeout: 3000 });
            await p
              .getByRole("heading", {
                name: "Lançamentos (Despesa/Receita)",
                exact: true,
              })
              .waitFor({ timeout: 3000 });
          } catch (e) {
            failure = e.message;
            await p.screenshot({
              path: path.join(
                E,
                `screenshots/v01-${variant}-${width}-${n}.png`,
              ),
              animations: "disabled",
            });
          }
          clicks.push({
            variant,
            width,
            execution: n,
            expected: "/app#finance",
            before,
            observed: p.url(),
            authStatus: auth,
            state,
            passed: !failure,
            failure,
            consoleErrors: [...errors],
            events: await p.evaluate(
              (i) => window.dashboardEvents.slice(i),
              state.eventIndex,
            ),
          });
        }
        await c.close();
      }
    }
  } finally {
    await b.close();
  }
  const responseEqual =
      JSON.stringify(variants.baseline.responses) ===
      JSON.stringify(variants.candidate.responses),
    uiEqual =
      JSON.stringify(variants.baseline.ui) ===
      JSON.stringify(variants.candidate.ui);
  const output = {
    responseEqual,
    uiEqual,
    variants,
    v01: {
      executions: clicks.length,
      passed: clicks.filter((c) => c.passed).length,
      observationClosed: false,
      clicks,
    },
  };
  fs.writeFileSync(
    path.join(E, "financial-comparison.json"),
    JSON.stringify(output, null, 2),
  );
  console.log(
    JSON.stringify({
      responseEqual,
      uiEqual,
      clicks: clicks.length,
      passed: clicks.filter((c) => c.passed).length,
      failures: clicks.filter((c) => !c.passed),
    }),
  );
  if (!responseEqual || !uiEqual) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
