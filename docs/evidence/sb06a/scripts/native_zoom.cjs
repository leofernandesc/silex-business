const fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const { firefox } = require(
  require.resolve("playwright", { paths: [process.env.SILEX_FRONTEND] }),
);
if (process.env.DISPLAY !== ":196")
  throw Error("Dedicated isolated X display required");
const origin = process.env.SILEX_ORIGIN,
  out = process.env.SILEX_EVIDENCE,
  variant = process.env.SILEX_VARIANT;
const keys = (key, n = 1) =>
  execFileSync(
    "python3",
    [path.join(__dirname, "native_keys.py"), key, String(n)],
    { env: process.env },
  );
(async () => {
  const launchEnv = {
    ...process.env,
    MOZ_ENABLE_WAYLAND: "0",
    GDK_BACKEND: "x11",
  };
  delete launchEnv.WAYLAND_DISPLAY;
  console.error("Launching headed Firefox on isolated X11");
  const browser = await firefox.launch({
    headless: false,
    env: launchEnv,
    executablePath:
      "/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox",
    args: ["--width=1280", "--height=1000"],
  });
  console.error("Firefox launched");
  const context = await browser.newContext({ viewport: null, locale: "pt-BR" }),
    page = await context.newPage(),
    rows = [];
  try {
    console.error("Opening test page");
    await page.goto(origin + "/app#finance");
    await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
    await page
      .getByLabel("Senha", { exact: true })
      .fill(process.env.SILEX_TEST_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.locator(".topbar").waitFor();
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    keys("0");
    const base = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
    }));
    for (const target of [1, 2, 4]) {
      for (let n = 0; n < 12; n++) {
        const ratio = await page.evaluate(
          (d) => devicePixelRatio / d,
          base.dpr,
        );
        if (ratio >= target - 0.01) break;
        keys("plus");
      }
      const state = await page.evaluate((base) => {
        const h = document.querySelector(".topbar"),
          r = h.getBoundingClientRect();
        return {
          nativeZoomRatio: devicePixelRatio / base.dpr,
          baselineWidth: base.width,
          viewport: innerWidth,
          dpr: devicePixelRatio,
          documentWidth: document.documentElement.scrollWidth,
          header: { width: r.width, height: r.height, scroll: h.scrollWidth },
          headerOffenders: [...h.querySelectorAll("*")]
            .filter(
              (e) =>
                e.getClientRects().length &&
                e.getBoundingClientRect().right > innerWidth + 0.5,
            )
            .map((e) => ({
              class: e.className,
              right: e.getBoundingClientRect().right,
            })),
          menuButton: document
            .querySelector('[aria-label="Abrir menu"]')
            .getBoundingClientRect()
            .toJSON(),
          logout: document
            .querySelector('[aria-label="Sair"]')
            .getBoundingClientRect()
            .toJSON(),
        };
      }, base);
      if (Math.abs(state.nativeZoomRatio - target) > 0.01)
        throw Error("Native zoom ratio not proven: " + JSON.stringify(state));
      console.error(JSON.stringify({ target, state }));
      execFileSync("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "x11grab",
        "-video_size",
        "1440x1100",
        "-i",
        ":196",
        "-frames:v",
        "1",
        out + `/captures/${variant}-nativezoom-${target * 100}.png`,
      ]);
      const open = page.getByRole("button", {
        name: "Abrir menu",
        exact: true,
      });
      if (await open.isVisible()) {
        await open.focus();
        await page.keyboard.press("Enter");
        const close = page.getByRole("button", {
          name: "Fechar menu",
          exact: true,
        });
        state.menuFocus = await close.evaluate(
          (e) => e === document.activeElement,
        );
        await page.keyboard.press("Shift+Tab");
        state.trap = await page
          .locator("#app-navigation")
          .evaluate((e) => e.contains(document.activeElement));
        await page.keyboard.press("Escape");
        state.focusReturned = await open.evaluate(
          (e) => e === document.activeElement,
        );
      }
      rows.push(state);
    }
    fs.writeFileSync(
      out + `/nativezoom-${variant}.json`,
      JSON.stringify(
        {
          method:
            "Headed Firefox on isolated Xvfb, native XTest Control+plus, DPR ratio and viewport verified. No CSS scale or viewport override.",
          rows,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
