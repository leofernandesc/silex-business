const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { firefox } = require(
  require.resolve("playwright", { paths: [process.env.SILEX_FRONTEND] }),
);
const out = process.env.SILEX_EVIDENCE,
  origin = process.env.SILEX_ORIGIN,
  variant = process.env.SILEX_VARIANT;
if (![out, origin, variant, process.env.SILEX_TEST_PASSWORD].every(Boolean))
  throw Error("Explicit isolated configuration required");
const widths = [1440, 1024, 768, 375, 320, 256, 187];
const ids = [
  ...fs
    .readFileSync(
      path.join(process.env.SILEX_FRONTEND, "src/navigation/routes.ts"),
      "utf8",
    )
    .matchAll(/id: "([^"]+)"/g),
]
  .map((m) => m[1])
  .filter((id) => id !== "finance-suppliers");
function measure() {
  const header = document.querySelector(".topbar");
  const rect = (e) => {
    const r = e.getBoundingClientRect(),
      s = getComputedStyle(e);
    return {
      selector: e.className || e.tagName,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
      client: e.clientWidth,
      scroll: e.scrollWidth,
      minWidth: s.minWidth,
      flexShrink: s.flexShrink,
      flexWrap: s.flexWrap,
      whiteSpace: s.whiteSpace,
      overflow: s.overflow,
      gap: s.gap,
      display: s.display,
    };
  };
  const main = document.querySelector("main");
  return {
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    documentExcess: document.documentElement.scrollWidth - innerWidth,
    header: rect(header),
    parts: [
      ...header.querySelectorAll(
        ".topbar-left,.topbar-right,.breadcrumb,.breadcrumb strong,.user-profile,.user-avatar,button",
      ),
    ].map(rect),
    headerOffenders: [...header.querySelectorAll("*")]
      .filter(
        (e) =>
          e.getClientRects().length &&
          e.getBoundingClientRect().right > innerWidth + 0.5,
      )
      .map(rect),
    main: { client: main.clientWidth, scroll: main.scrollWidth },
    breadcrumb: header.querySelector(".breadcrumb").textContent,
    user: header.querySelector(".user-profile").textContent,
    mainText: main.innerText,
  };
}
async function signIn(page, role = "admin", long = false) {
  if (long)
    await page.addInitScript(() => {
      const f = window.fetch.bind(window);
      window.fetch = async (...a) => {
        const r = await f(...a),
          url = new URL(
            a[0] instanceof Request ? a[0].url : String(a[0]),
            location.href,
          );
        if (
          !r.ok ||
          ![
            "/api/auth/me",
            "/api/auth/login",
            "/api/company-settings",
          ].includes(url.pathname)
        )
          return r;
        const p = await r.clone().json();
        if (url.pathname === "/api/company-settings") {
          p.company_name =
            "Empresa Ilustrativa de ComercializaçãoIntersetorialComNomeExtenso e Serviços Empresariais — Dados Fictícios";
          p.brand_name = "Apresentação legada ilustrativa";
        } else {
          p.name =
            "Pessoa Administradora Ilustrativa com NomeExtensoSemEspaçosParaRobustez — Dados Fictícios";
        }
        const h = new Headers(r.headers);
        h.delete("content-length");
        return new Response(JSON.stringify(p), {
          status: r.status,
          headers: h,
        });
      };
    });
  await page.goto(origin + "/app#home");
  await page
    .getByLabel("Usuário", { exact: true })
    .fill(role === "admin" ? "demo.admin" : "demo.operador");
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.SILEX_TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator(".topbar").waitFor();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}
(async () => {
  fs.mkdirSync(out + "/captures", { recursive: true });
  const browser = await firefox.launch({
    executablePath:
      "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
  });
  const rows = [],
    extras = [],
    errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      locale: "pt-BR",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await signIn(page);
    for (const id of ids) {
      await page.goto(origin + "/app#" + id);
      await page.waitForLoadState("networkidle");
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  scrollTo(0, 0);
                  resolve();
                }),
              ),
            ),
        );
        const m = await page.evaluate(measure);
        m.mainTextHash = crypto
          .createHash("sha256")
          .update(m.mainText.replace(/\s+/g, " ").trim())
          .digest("hex");
        delete m.mainText;
        const row = { variant, id, width, ...m };
        if (width === 375 || id === "finance") {
          const file = `${variant}-${id}-${width}.png`;
          await page.screenshot({
            path: out + "/captures/" + file,
            clip: {
              x: 0,
              y: 0,
              width,
              height: Math.ceil(m.header.bottom) + 80,
            },
            animations: "disabled",
          });
          row.capture = file;
        }
        rows.push(row);
      }
    }
    await page.goto(origin + "/app#finance");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 375, height: 900 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    const enlarged = await page.evaluate(measure);
    delete enlarged.mainText;
    extras.push({ kind: "root-text200", ...enlarged });
    await page.screenshot({
      path: out + "/captures/" + variant + "-text200.png",
      clip: { x: 0, y: 0, width: 375, height: 250 },
      animations: "disabled",
    });
    await page.close();
    for (const role of ["admin", "operator"]) {
      const p = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      await signIn(p, role, true);
      for (const width of widths) {
        await p.setViewportSize({ width, height: 900 });
        await p.evaluate(() => scrollTo(0, 0));
        const m = await p.evaluate(measure);
        delete m.mainText;
        extras.push({ kind: "long-names", role, width, ...m });
        const file = `${variant}-long-${role}-${width}.png`;
        await p.screenshot({
          path: out + "/captures/" + file,
          clip: { x: 0, y: 0, width, height: Math.ceil(m.header.bottom) + 80 },
          animations: "disabled",
        });
        if (width <= 375) {
          await p
            .getByRole("button", { name: "Abrir menu", exact: true })
            .click();
          await p.waitForFunction(
            () =>
              Math.abs(
                document
                  .querySelector("#app-navigation")
                  .getBoundingClientRect().left,
              ) < 0.5,
          );
          const nav = await p.locator("#app-navigation").evaluate((e) => ({
            width: e.getBoundingClientRect().width,
            scroll: e.scrollWidth,
            close: (() => {
              const r = e.querySelector("button").getBoundingClientRect();
              return { x: r.x, right: r.right, width: r.width };
            })(),
          }));
          extras.push({ kind: "long-names-menu", role, width, nav });
          await p.screenshot({
            path: out + "/captures/" + `${variant}-menu-${role}-${width}.png`,
            animations: "disabled",
          });
          await p.keyboard.press("Escape");
          await p.waitForFunction(
            () =>
              document.querySelector("#app-navigation").getBoundingClientRect()
                .right <= 0.5,
          );
        }
      }
      await p.close();
    }
    fs.writeFileSync(
      out + `/measurements-${variant}.json`,
      JSON.stringify({ rows, extras, errors }, null, 2),
    );
    if (process.env.SILEX_SKIP_GUEST_CAPTURE !== "1") {
      const guest = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      for (const url of ["/", "/entrar"]) {
        await guest.goto(origin + url);
        await guest.waitForLoadState("networkidle");
        for (const width of [1440, 768, 375]) {
          await guest.setViewportSize({ width, height: 900 });
          await guest.screenshot({
            path:
              out +
              "/captures/" +
              `${variant}-${url === "/" ? "public" : "login"}-${width}.png`,
            animations: "disabled",
          });
        }
      }
      await guest.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    out + `/measurements-${variant}.json`,
    JSON.stringify({ rows, extras, errors }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        variant,
        routes: ids.length,
        cases: rows.length,
        errors,
        ledger: rows
          .filter((r) => r.id === "finance")
          .map((r) => ({
            width: r.width,
            document: r.documentWidth,
            header: r.header,
            offenders: r.headerOffenders.map((e) => e.selector),
          })),
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
