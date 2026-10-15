const fs = require("node:fs");
const { firefox } = require(
  require.resolve("playwright", { paths: [process.env.SILEX_FRONTEND] }),
);
const out = process.env.SILEX_EVIDENCE,
  origin = process.env.SILEX_ORIGIN,
  variant = process.env.SILEX_VARIANT;
if (!process.env.SILEX_TEST_PASSWORD)
  throw Error("Isolated test credentials required");
function dimensions() {
  const h = document.querySelector(".topbar"),
    r = h.getBoundingClientRect();
  const main = document.querySelector("main");
  const offenders = [...main.querySelectorAll("*")]
    .filter((e) => e instanceof HTMLElement && e.getClientRects().length)
    .flatMap((e) => {
      if (
        ![...e.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
        )
      )
        return [];
      const range = document.createRange();
      range.selectNodeContents(e);
      const b = range.getBoundingClientRect();
      let parent = e.parentElement;
      let internalScroll = false;
      while (parent && parent !== main) {
        if (
          ["auto", "scroll", "hidden"].includes(
            getComputedStyle(parent).overflowX,
          ) &&
          parent.scrollWidth > parent.clientWidth
        )
          internalScroll = true;
        parent = parent.parentElement;
      }
      return b.right > innerWidth + 1
        ? [
            {
              tag: e.tagName,
              class: e.className,
              text: e.textContent.trim().slice(0, 160),
              right: b.right,
              width: b.width,
              parentClass: e.parentElement.className,
              insideScrollableRegion: internalScroll,
            },
          ]
        : [];
    });
  return {
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    header: { width: r.width, scroll: h.scrollWidth, height: r.height },
    headerOffenders: [...h.querySelectorAll("*")].filter(
      (e) =>
        e.getClientRects().length &&
        e.getBoundingClientRect().right > innerWidth + 1,
    ).length,
    mainOffenders: offenders,
  };
}
(async () => {
  const browser = await firefox.launch({
    executablePath:
      "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
  });
  const results = [];
  try {
    const p = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await p.goto(origin + "/app#finance");
    await p.getByLabel("Usuário", { exact: true }).fill("demo.admin");
    await p
      .getByLabel("Senha", { exact: true })
      .fill(process.env.SILEX_TEST_PASSWORD);
    await p.getByRole("button", { name: "Entrar", exact: true }).click();
    await p.locator(".topbar").waitFor();
    await p.waitForLoadState("networkidle");
    for (const width of [1440, 1024, 768, 375, 320, 256, 187]) {
      await p.setViewportSize({ width, height: 900 });
      const fonts = await p.evaluate(() => {
        const elements = [
          ...document.querySelectorAll(
            ".topbar,.topbar *,#app-navigation,#app-navigation *",
          ),
        ].filter((e) => e instanceof HTMLElement);
        for (const e of elements) e.style.removeProperty("font-size");
        const before = parseFloat(
          getComputedStyle(document.querySelector(".breadcrumb")).fontSize,
        );
        const sizes = elements.map((e) => [
          e,
          parseFloat(getComputedStyle(e).fontSize),
        ]);
        for (const [e, s] of sizes) e.style.fontSize = `${s * 2}px`;
        return {
          before,
          after: parseFloat(
            getComputedStyle(document.querySelector(".breadcrumb")).fontSize,
          ),
        };
      });
      const m = await p.evaluate(dimensions);
      results.push({ case: "computed-text200", width, fonts, ...m });
      if ([375, 320, 187].includes(width))
        await p.screenshot({
          path: out + `/captures/${variant}-computed-text200-${width}.png`,
          clip: { x: 0, y: 0, width, height: Math.ceil(m.header.height) + 80 },
          animations: "disabled",
        });
      if (width === 375) {
        await p
          .getByRole("button", { name: "Abrir menu", exact: true })
          .focus();
        await p.keyboard.press("Enter");
        await p.waitForFunction(
          () =>
            Math.abs(
              document.querySelector("#app-navigation").getBoundingClientRect()
                .left,
            ) < 0.5,
        );
        await p.screenshot({
          path: out + `/captures/${variant}-computed-text200-menu.png`,
          animations: "disabled",
        });
        await p.keyboard.press("Escape");
      }
    }
    await p.close();
    const q = await browser.newPage({ viewport: { width: 187, height: 900 } });
    await q.addInitScript(() => {
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
            "/api/company-settings",
            "/api/auth/me",
            "/api/auth/login",
          ].includes(url.pathname)
        )
          return r;
        const p = await r.clone().json();
        if (url.pathname === "/api/company-settings") {
          p.company_name =
            "Empresa Ilustrativa de ComercializaçãoIntersetorialComNomeExtenso e Serviços Empresariais — Dados Fictícios";
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
    await q.goto(origin + "/app#home");
    await q.getByLabel("Usuário", { exact: true }).fill("demo.admin");
    await q
      .getByLabel("Senha", { exact: true })
      .fill(process.env.SILEX_TEST_PASSWORD);
    await q.getByRole("button", { name: "Entrar", exact: true }).click();
    await q.locator(".topbar").waitFor();
    await q.waitForLoadState("networkidle");
    for (const id of ["home", "dashboard"]) {
      await q.goto(origin + "/app#" + id);
      await q.waitForLoadState("networkidle");
      for (const width of [320, 256, 187]) {
        await q.setViewportSize({ width, height: 900 });
        await q.evaluate(() => scrollTo(0, 0));
        results.push({
          case: "independent-content",
          id,
          width,
          ...(await q.evaluate(dimensions)),
        });
      }
    }
    await q.close();
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    out + `/text-and-content-${variant}.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map((r) => ({
        case: r.case,
        id: r.id,
        width: r.width,
        document: r.document,
        header: r.header,
        offenders: r.headerOffenders,
        fonts: r.fonts,
      })),
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
