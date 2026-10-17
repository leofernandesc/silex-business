import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// The Playwright launcher always creates/deletes its own local SQLite database.
const fixturePassword = "CustomerFixtureOnly#2026";

async function prepareAccounts(request: APIRequestContext) {
  expect((await request.post("/api/auth/login", { data: { username: "demo.admin", password: "DemoLocal#2026" } })).ok()).toBeTruthy();
  const users = await (await request.get("/api/users")).json();
  for (const [username, name] of [["sammya.admin", "Avaliadora fictícia"], ["customer.other.admin", "sammya.admin"]]) {
    if (!users.some((u: { username: string }) => u.username === username)) {
      expect((await request.post("/api/users", { data: { username, name, password: fixturePassword, role: "admin" } })).status()).toBe(201);
    }
  }
}

async function login(page: Page, username: string) {
  await page.goto("/entrar");
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(username.startsWith("demo.") ? "DemoLocal#2026" : fixturePassword);
  const authenticated = page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/login" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await authenticated).status()).toBe(200);
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.goto("/app#customers");
  await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
}

test.beforeEach(async ({ request }) => prepareAccounts(request));

test("conta exata cria, edita e recarrega os dados opcionais sem alterar o endereço cadastral", async ({ page }, info) => {
  await login(page, "sammya.admin");
  const name = `Cliente exclusivo ${info.project.name} ${Date.now()}`;
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.getByLabel("Nome *", { exact: true }).fill(name);
  await page.getByLabel("Logradouro", { exact: true }).fill("Rua cadastral fictícia");
  await page.getByLabel("Endereço em texto livre (legado)").fill("Endereço legado preservado");
  await page.getByLabel("Endereço inicial", { exact: true }).fill("Origem fictícia\nBloco 1");
  await page.getByLabel("Endereço final", { exact: true }).fill("Destino fictício");
  const select = page.getByLabel("Tipo de serviço", { exact: true });
  await expect(select.locator("option")).toHaveText(["Não informado", "Local", "Interestadual"]);
  await select.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await expect(select).toHaveValue("interstate");
  await expect(page.getByRole("button", { name: "Voltar", exact: true })).toBeFocused();
  await page.getByLabel("Endereço inicial", { exact: true }).scrollIntoViewIfNeeded();
  const box = await page.getByLabel("Endereço inicial", { exact: true }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: info.outputPath("customer-service-form.png") });
  const saved = page.waitForResponse(r => new URL(r.url()).pathname === "/api/customers" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const created = await (await saved).json();
  expect(created.service_details).toEqual({ start_address: "Origem fictícia\nBloco 1", end_address: "Destino fictício", service_type: "interstate" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expect(page.getByLabel("Endereço inicial", { exact: true })).toHaveValue(created.service_details.start_address);
  await expect(page.getByLabel("Endereço final", { exact: true })).toHaveValue("Destino fictício");
  await expect(select).toHaveValue("interstate");
  await select.selectOption("local");
  await page.getByLabel("Endereço final", { exact: true }).fill("");
  const updated = page.waitForResponse(r => new URL(r.url()).pathname === `/api/customers/${created.id}` && r.request().method() === "PUT");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const edited = await (await updated).json();
  expect(edited).toMatchObject({ street: created.street, address: created.address, service_details: { ...created.service_details, end_address: "", service_type: "local" } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expect(page.getByLabel("Endereço final", { exact: true })).toHaveValue("");
  await expect(select).toHaveValue("local");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

for (const username of ["demo.admin", "demo.operador", "customer.other.admin"]) {
  test(`${username}: formulário comum não oferece nem envia os campos exclusivos`, async ({ page }, info) => {
    await login(page, username);
    const name = `Cliente comum ${username} ${info.project.name} ${Date.now()}`;
    await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
    await expect(page.getByRole("region", { name: "Dados do serviço" })).toHaveCount(0);
    await expect(page.getByLabel("Endereço inicial", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Endereço final", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Tipo de serviço", { exact: true })).toHaveCount(0);
    await page.getByLabel("Nome *", { exact: true }).fill(name);
    const sent = page.waitForRequest(r => new URL(r.url()).pathname === "/api/customers" && r.method() === "POST");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    expect((await sent).postDataJSON()).not.toHaveProperty("service_details");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
    await expect(page.getByRole("region", { name: "Dados do serviço" })).toHaveCount(0);
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.getByRole("button", { name: `Editar ${name}`, exact: true })).toBeFocused();
  });
}

test("Contato / cidade preserva as informações e mostra cada telefone uma única vez", async ({ page, request }, info) => {
  const prefix = `Contato-${info.project.name}-${Date.now()}`;
  const cases = [
    { phone: "(92) 0000-1111" },
    { contact_name: "Contato fictício", phone: "(92) 0000-2222", email: "contato@example.test", city: "Manaus", state: "AM" },
    { city: "Cidade fictícia", state: "SP" },
    { email: "email@example.test" },
    {},
  ];
  for (const [index, values] of cases.entries()) {
    expect((await request.post("/api/customers", { data: { name: `${prefix}-${index}`, ...values } })).status()).toBe(201);
  }
  await login(page, "demo.admin");
  await page.getByRole("textbox", { name: "Pesquisar", exact: true }).fill(prefix);
  for (const [index, values] of cases.entries()) {
    const cell = page.getByRole("row").filter({ has: page.getByText(`${prefix}-${index}`, { exact: true }) }).getByRole("cell").nth(3);
    await expect(cell).toBeVisible();
    const text = await cell.innerText();
    for (const value of Object.values(values)) {
      expect(text).toContain(value);
    }
    if ("phone" in values) expect(text.split(values.phone).length - 1).toBe(1);
    if (!Object.keys(values).length) expect(text).toBe("—");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});
