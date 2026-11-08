import { test, expect, type Page } from "./integrationTest";
import { openReadyRoute } from "./routeReadiness";
import { routes, canAccessRoute } from "../src/navigation/routes";
const identities = [
  {
    id: "demo",
    username: "demo.admin",
    password: "DemoLocal#2026",
    role: "admin",
    capabilities: [],
  },
  {
    id: "specialized",
    username: "transport.fixture.admin",
    password: "CustomerFixtureOnly#2026",
    role: "admin",
    capabilities: ["transport_operations"],
  },
  {
    id: "generic-second",
    username: "generic.fixture.admin",
    password: "CustomerFixtureOnly#2026",
    role: "admin",
    capabilities: [],
  },
  {
    id: "specialized-second",
    username: "second.transport.fixture.admin",
    password: "CustomerFixtureOnly#2026",
    role: "admin",
    capabilities: ["transport_operations"],
  },
  {
    id: "operator",
    username: "demo.operador",
    password: "DemoLocal#2026",
    role: "operator",
    capabilities: [],
  },
  {
    id: "visitor",
    username: "",
    password: "",
    role: "operator",
    capabilities: [],
  },
] as const;
async function auth(page: Page, identity: (typeof identities)[number]) {
  if (identity.username)
    expect(
      (
        await page.request.post("/api/auth/login", {
          data: { username: identity.username, password: identity.password },
        })
      ).ok(),
    ).toBe(true);
}
for (const identity of identities)
  test(`all route guards for ${identity.id}`, async ({ page }) => {
    test.setTimeout(150000);
    await auth(page, identity);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of routes) {
      const allowed =
        !!identity.username &&
        canAccessRoute(
          { role: identity.role, capabilities: [...identity.capabilities] },
          route.id,
        );
      if (allowed) await openReadyRoute(page, route);
      else await page.goto("/app#" + route.id);
      if (!identity.username) {
        await expect(page).toHaveURL(/\/entrar$/);
        continue;
      }
      if (allowed) {
        await expect(page).toHaveURL(new RegExp("#" + route.id + "$"));
        await expect(page.locator("main h1")).toBeVisible();
      } else {
        await expect(page).toHaveURL(/#dashboard$/);
        await expect(page.getByRole("alert")).toContainText(
          "não tem permissão",
        );
      }
    }
    expect(errors).toEqual([]);
  });
for (const width of [1440, 1024, 768, 375, 320])
  test(`specialized routes reflow at ${width}px`, async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width, height: 900 });
    await auth(page, identities[1]);
    for (const route of routes) {
      await openReadyRoute(page, route);
      await expect(page.locator("main [role=alert]")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        route.id,
      ).toBeLessThanOrEqual(width + 1);
    }
  });

test("specialized metadata stays private across authorized identities; denied promotion is atomic", async ({
  page,
  browser,
}) => {
  await auth(page, identities[1]);
  const r = await page.request.post("/api/customers", {
    data: {
      name: "Cliente fictício da integração",
      service_details: {
        collection_address: {
          postal_code: "00000-000",
          street: "Origem fictícia",
          address_number: "1",
          complement: "A",
          neighborhood: "Centro",
          city: "Cidade fictícia",
          state: "AM",
        },
        delivery_address: { street: "Destino fictício" },
        service_type: "interstate",
      },
    },
  });
  expect(r.status()).toBe(201);
  const row = await r.json();
  const ctx = await browser.newContext({ baseURL: "http://127.0.0.1:8011" });
  try {
    const second = await ctx.newPage();
    await auth(second, identities[3]);
    const view = await (await second.request.get("/api/customers")).json();
    const seen = view.items.find((x: any) => x.id === row.id);
    expect(seen.service_details.collection_address.street).toBe("");
    await auth(second, identities[0]);
    const generic = (
      await (await second.request.get("/api/customers")).json()
    ).items.find((x: any) => x.id === row.id);
    expect(generic).not.toHaveProperty("service_details");
    expect(
      (
        await second.request.put("/api/customers/" + row.id, {
          data: { name: row.name, service_details: row.service_details },
        })
      ).status(),
    ).toBe(403);
    const own = (
      await (await page.request.get("/api/customers")).json()
    ).items.find((x: any) => x.id === row.id);
    expect(own.service_details).toEqual(row.service_details);
  } finally {
    await ctx.close();
  }
});
