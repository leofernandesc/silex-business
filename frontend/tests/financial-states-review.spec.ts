import { test, expect } from "./integrationTest";

for (const [route, path, selector, count] of [
  ["finance-payable", "/finance", ".finance-summary-grid", 4],
  ["finance-receivable", "/finance", ".finance-summary-grid", 4],
  ["finance", "/finance/movements", ".ledger-summary", 4],
  ["cash", "/cash-sessions/current", ".summary-grid", 3],
] as const) {
  test(`${route}: pending and failed queries do not imply zero; successful zeros remain valid`, async ({
    page,
  }) => {
    expect(
      (
        await page.request.post("/api/auth/login", {
          data: { username: "demo.admin", password: "DemoLocal#2026" },
        })
      ).ok(),
    ).toBe(true);
    const source = await page.request.get("/api" + path);
    expect(source.ok()).toBe(true);
    const original = await source.json();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pattern = "**/api" + path + (route === "cash" ? "" : "?*");
    await page.route(pattern, async (intercept) => {
      await pending;
      await intercept.fulfill({
        status: 503,
        json: { detail: "Consulta ficticiamente indisponível." },
      });
    });
    await page.goto(`/app#${route}`);
    const values = page.locator(`${selector} .summary-card strong`);
    await expect(values).toHaveText(Array(count).fill("—"));
    if (route === "cash") {
      await expect(
        page.getByRole("button", { name: "Abrir meu caixa", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Fechar meu caixa", exact: true }),
      ).toHaveCount(0);
    }
    release();
    await expect(page.locator("main [role=alert]")).toContainText([
      "Consulta ficticiamente indisponível",
    ]);
    await expect(values).toHaveText(Array(count).fill("—"));
    if (route.startsWith("finance-"))
      await expect(
        page.getByText("Nenhum registro encontrado", { exact: true }),
      ).toHaveCount(0);
    await page.unroute(pattern);
    // A valid response with no movement is distinct from the previous HTTP failure.
    const zero =
      route === "cash"
        ? null
        : {
            ...original,
            items: [],
            total: 0,
            summary: Object.fromEntries(
              Object.entries(original.summary).map(([key, value]) => [
                key,
                typeof value === "number" ? 0 : value,
              ]),
            ),
          };
    await page.route(pattern, (intercept) => intercept.fulfill({ json: zero }));
    await page.reload();
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
    if (route === "cash") {
      await expect(values).toHaveText(["Fechado", /R\$\s0,00/, /R\$\s0,00/]);
      await expect(
        page.getByRole("button", { name: "Abrir meu caixa", exact: true }),
      ).toBeVisible();
    } else
      await expect(values).toHaveText([
        /R\$\s0,00/,
        /R\$\s0,00/,
        /R\$\s0,00/,
        "0",
      ]);
  });
}

test("ledger account failure does not fabricate an all-accounts zero balance", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  await page.route("**/api/accounts", (intercept) =>
    intercept.fulfill({
      status: 500,
      json: { detail: "Contas indisponíveis." },
    }),
  );
  await page.goto("/app#finance");
  await expect(page.getByRole("alert")).toContainText("Contas indisponíveis");
  await expect(page.locator(".account-balances")).toContainText(
    "Saldos das contas indisponíveis.",
  );
  await expect(page.locator(".balance-chips button")).toHaveCount(0);
});
