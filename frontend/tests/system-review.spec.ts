import { test, expect } from "./integrationTest";
import {openReadyRoute} from './routeReadiness';
import { canAccessRoute, routes } from "../src/navigation/routes";

for (const width of [1440, 1024, 768, 375, 320]) {
  test(`all registered screens load without horizontal document overflow at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    expect(
      (
        await page.request.post("/api/auth/login", {
          data: { username: "demo.admin", password: "DemoLocal#2026" },
        })
      ).ok(),
    ).toBe(true);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const failures: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 400)
        failures.push(
          `${response.status()} ${new URL(response.url()).pathname}`,
        );
    });
    const current = await (await page.request.get("/api/auth/me")).json();
    for (const route of routes.filter(route => canAccessRoute(current, route.id))) {
      await openReadyRoute(page,route);
      await expect(page.locator(".app-shell main h1")).toBeVisible();
      await expect(
        page.getByText(
          /Carregando (registros|informações financeiras|identificação da empresa)/,
        ),
      ).toHaveCount(0);
      await expect(page.locator("main [role=alert]")).toHaveCount(0);
      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document, route.id).toBeLessThanOrEqual(width + 1);
      await expect(page).toHaveURL(new RegExp(`#${route.id}$`));
    }
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("all 26 financial report types retain the displayed page in print media and CSV remains downloadable", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120000);
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  const catalog = await (
    await page.request.get("/api/finance/reports/catalog")
  ).json();
  expect(catalog).toHaveLength(26);
  await page.goto("/app#finance-reports");
  const select = page.getByLabel("Relatório", { exact: true });
  for (const report of catalog) {
    await page.emulateMedia({ media: "screen" });
    const changed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
        `/api/finance/reports/${report.id}`,
    );
    if ((await select.inputValue()) === report.id) await page.reload();
    else await select.selectOption(report.id);
    const response = await changed;
    expect(response.ok(), report.id).toBe(true);
    const data = await response.json();
    const section = page.locator(".finance-report-print");
    await expect(
      section.getByRole("heading", { name: data.name, exact: true }),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Imprimir", exact: true }),
    ).toBeEnabled();
    const screenCells = await section
      .locator(":scope > .table-wrap th, :scope > .table-wrap td")
      .allTextContents();
    await page.emulateMedia({ media: "print" });
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("heading", { name: data.name, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).toBeHidden();
    await expect(
      section.getByRole("button", { name: "Exportar CSV", exact: true }),
    ).toBeHidden();
    await expect(section.locator(".finance-report-print-note")).toContainText(
      `${data.items.length} registros nesta página`,
    );
    if (Object.keys(data.items[0] || {}).length <= 8) {
      await expect(section.locator(":scope > .table-wrap")).toBeVisible();
      expect(
        await section
          .locator(":scope > .table-wrap th, :scope > .table-wrap td")
          .allTextContents(),
      ).toEqual(screenCells);
    } else
      await expect(
        section.locator(".finance-report-column-bands"),
      ).toBeVisible();
    const csvURL = new URL(response.url());
    csvURL.pathname += ".csv";
    const csv = await page.request.get(csvURL.toString());
    expect(csv.ok(), report.id).toBe(true);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    if (report.id === "cash-monthly") {
      await page.screenshot({
        path: "../docs/evidence/system-review/monthly-print.png",
        fullPage: true,
      });
      if (browserName === "chromium")
        await page.pdf({
          path: "../docs/evidence/system-review/monthly-a4.pdf",
          format: "A4",
          landscape: true,
          printBackground: true,
        });
    }
  }
});
