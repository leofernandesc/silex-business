import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// The Playwright launcher always creates/deletes its own local SQLite database.
const fixturePassword = "CustomerFixtureOnly#2026";

async function prepareAccounts(request: APIRequestContext) {
  expect((await request.post("/api/auth/login", { data: { username: "demo.admin", password: "DemoLocal#2026" } })).ok()).toBeTruthy();
  const users = await (await request.get("/api/users")).json();
  for (const [username, name] of [["demo.restricted.admin", "Avaliadora fictícia"], ["customer.other.admin", "demo.restricted.admin"]]) {
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

const collection = { postal_code: "00000-001", street: "Rua de coleta fictícia", address_number: "12", complement: "Bloco A", neighborhood: "Bairro da coleta", city: "Manaus", state: "AM" };
const delivery = { postal_code: "00000-002", street: "Rua de entrega fictícia", address_number: "34", complement: "Sala B", neighborhood: "Bairro da entrega", city: "São Paulo", state: "SP" };
const addressLabels = { postal_code: "CEP", street: "Logradouro", address_number: "Número", complement: "Complemento", neighborhood: "Bairro", city: "Cidade", state: "UF" };

async function expectTwoAddressGroups(page: Page) {
  await expect(page.locator(".customer-address-group")).toHaveCount(2);
  for (const kind of ["coleta", "entrega"]) {
    const group = page.getByRole("group", { name: `Endereço de ${kind}`, exact: true });
    await expect(group).toBeVisible();
    await expect(group.locator("input")).toHaveCount(7);
    for (const label of Object.values(addressLabels)) await expect(group.getByLabel(`${label} da ${kind}`, { exact: true })).toHaveCount(1);
  }
  for (const label of ["CEP", "Logradouro", "Endereço inicial", "Endereço final", "Endereço em texto livre (legado)"]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
  }
  await expect(page.locator("dialog textarea")).toHaveCount(0);
}

async function fillAddress(page: Page, kind: "coleta" | "entrega", values: typeof collection) {
  for (const key of Object.keys(addressLabels) as (keyof typeof collection)[]) {
    await page.getByLabel(`${addressLabels[key]} da ${kind}`, { exact: true }).fill(key === "state" ? values[key].toLowerCase() : values[key]);
  }
}

async function expectAddress(page: Page, kind: "coleta" | "entrega", values: typeof collection) {
  for (const key of Object.keys(addressLabels) as (keyof typeof collection)[]) {
    await expect(page.getByLabel(`${addressLabels[key]} da ${kind}`, { exact: true })).toHaveValue(values[key]);
  }
}

async function saveCustomer(page: Page, identifier?: number) {
  const saved = page.waitForResponse(r => new URL(r.url()).pathname === `/api/customers${identifier ? `/${identifier}` : ""}` && r.request().method() === (identifier ? "PUT" : "POST"));
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(identifier ? 200 : 201);
  const payload = response.request().postDataJSON();
  for (const key of [...Object.keys(addressLabels), "address"]) expect(payload).not.toHaveProperty(key);
  expect(payload.service_details).not.toHaveProperty("start_address");
  expect(payload.service_details).not.toHaveProperty("end_address");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return response.json();
}

test("exatamente dois endereços completos: criar, editar independentemente e recarregar", async ({ page }, info) => {
  await login(page, "demo.restricted.admin");
  const name = `Cliente exclusivo ${info.project.name} ${Date.now()}`;
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await expectTwoAddressGroups(page);
  await page.getByLabel("Nome *", { exact: true }).fill(name);
  await page.getByLabel("Telefone", { exact: true }).fill("(92) 0000-1234");
  await fillAddress(page, "coleta", collection);
  await fillAddress(page, "entrega", delivery);
  const select = page.getByLabel("Tipo de serviço", { exact: true });
  await expect(select.locator("option")).toHaveText(["Não informado", "Local", "Interestadual"]);
  await select.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await expect(select).toHaveValue("interstate");
  await expect(page.getByRole("button", { name: "Voltar", exact: true })).toBeFocused();
  for (const kind of ["coleta", "entrega"]) {
    const group = page.getByRole("group", { name: `Endereço de ${kind}`, exact: true });
    await group.screenshot({ path: info.outputPath(`${kind}-form.png`) });
    for (const input of await group.locator("input").all()) {
      const box = await input.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  }
  const created = await saveCustomer(page);
  expect(created.service_details).toMatchObject({ collection_address: collection, delivery_address: delivery, service_type: "interstate" });
  const row = page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
  await expect(row).toContainText(`Coleta: ${collection.street}`);
  await expect(row).toContainText(`Entrega: ${delivery.street}`);
  expect((await row.innerText()).split("(92) 0000-1234").length - 1).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expectTwoAddressGroups(page);
  await expectAddress(page, "coleta", collection);
  await expectAddress(page, "entrega", delivery);
  await page.getByLabel("Cidade da coleta", { exact: true }).fill("Nova cidade de coleta");
  await select.selectOption("local");
  const edited = await saveCustomer(page, created.id);
  expect(edited.service_details.collection_address).toEqual({ ...collection, city: "Nova cidade de coleta" });
  expect(edited.service_details.delivery_address).toEqual(delivery);
  await page.reload();
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expectAddress(page, "coleta", { ...collection, city: "Nova cidade de coleta" });
  await expectAddress(page, "entrega", delivery);
  await expect(select).toHaveValue("local");
  await page.getByLabel("Logradouro da entrega", { exact: true }).fill("Nova rua de entrega");
  const last = await saveCustomer(page, created.id);
  expect(last.service_details.collection_address).toEqual(edited.service_details.collection_address);
  expect(last.service_details.delivery_address.street).toBe("Nova rua de entrega");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

for (const username of ["demo.admin", "demo.operador", "customer.other.admin"]) {
  test(`${username}: formulário comum não oferece nem envia os campos exclusivos`, async ({ page }, info) => {
    await login(page, username);
    const name = `Cliente comum ${username} ${info.project.name} ${Date.now()}`;
    await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
    await expect(page.locator(".customer-address-group")).toHaveCount(0);
    await expect(page.getByLabel("Logradouro", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Endereço inicial", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Endereço final", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Tipo de serviço", { exact: true })).toHaveCount(0);
    await page.getByLabel("Nome *", { exact: true }).fill(name);
    const sent = page.waitForRequest(r => new URL(r.url()).pathname === "/api/customers" && r.method() === "POST");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    expect((await sent).postDataJSON()).not.toHaveProperty("service_details");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
    await expect(page.locator(".customer-address-group")).toHaveCount(0);
    await expect(page.getByLabel("Logradouro", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.getByRole("button", { name: `Editar ${name}`, exact: true })).toBeFocused();
  });
}

test("cadastro anterior exige confirmação e textos 0011 permanecem recuperáveis", async ({ page, request }, info) => {
  const name = `Cliente anterior ${info.project.name} ${Date.now()}`;
  const originalText = "Texto cadastral preservado";
  const original = await request.post("/api/customers", { data: { name, address: originalText, ...collection } });
  expect(original.status()).toBe(201);
  const customer = await original.json();
  expect((await request.post("/api/auth/login", { data: { username: "demo.restricted.admin", password: fixturePassword } })).status()).toBe(200);
  const oldTexts = { start_address: "Origem anterior\n" + "x".repeat(1900), end_address: "Destino anterior preservado" };
  expect((await request.put(`/api/customers/${customer.id}`, { data: { name, service_details: oldTexts } })).status()).toBe(200);
  await login(page, "demo.restricted.admin");
  await page.getByRole("textbox", { name: "Pesquisar", exact: true }).fill(name);
  const row = page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
  await expect(row).not.toContainText(originalText);
  await expect(row).not.toContainText(collection.street);
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expectTwoAddressGroups(page);
  const empty = Object.fromEntries(Object.keys(addressLabels).map(key => [key, ""])) as typeof collection;
  await expectAddress(page, "coleta", empty);
  await expectAddress(page, "entrega", empty);
  await page.getByText("Conferir cadastro anterior para coleta", { exact: true }).click();
  await page.getByRole("button", { name: "Usar endereço anterior na coleta", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar cópia", exact: true }).click();
  await expect(page.getByRole("button", { name: "Usar endereço anterior na coleta", exact: true })).toBeFocused();
  await expectAddress(page, "coleta", empty);
  await page.getByRole("button", { name: "Usar endereço anterior na coleta", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar cópia para coleta", exact: true }).click();
  await expect(page.getByLabel("CEP da coleta", { exact: true })).toBeFocused();
  await expectAddress(page, "coleta", collection);
  await expectAddress(page, "entrega", empty);
  await fillAddress(page, "entrega", delivery);
  // Simulate a concurrent generic edit while the personalized form is open.
  expect((await request.post("/api/auth/login", { data: { username: "demo.admin", password: "DemoLocal#2026" } })).status()).toBe(200);
  expect((await request.put(`/api/customers/${customer.id}`, { data: { name, address: originalText, ...collection, street: "Cadastro atualizado por outra conta" } })).status()).toBe(200);
  const edited = await saveCustomer(page, customer.id);
  expect(edited.address).toBe(originalText);
  expect(edited.street).toBe("Cadastro atualizado por outra conta");
  expect(edited.service_details).toMatchObject({ ...oldTexts, collection_address: collection, delivery_address: delivery });
  await page.reload();
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expectTwoAddressGroups(page);
  await page.getByText("Consultar texto anterior da coleta", { exact: true }).click();
  await expect(page.getByText(oldTexts.start_address, { exact: true })).toBeVisible();
  await page.getByText("Consultar texto anterior da entrega", { exact: true }).click();
  await expect(page.getByText(oldTexts.end_address, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  expect(await page.locator("dialog").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();
});

test("texto cadastral curto só vai ao logradouro após confirmação explícita", async ({ page, request }, info) => {
  const name = `Cliente texto ${info.project.name} ${Date.now()}`;
  const source = "Rua fictícia, 99, texto anterior sem interpretação";
  const customer = await (await request.post("/api/customers", { data: { name, address: source } })).json();
  await login(page, "demo.restricted.admin");
  await page.getByRole("textbox", { name: "Pesquisar", exact: true }).fill(name);
  await page.getByRole("button", { name: `Editar ${name}`, exact: true }).click();
  await expectTwoAddressGroups(page);
  await expect(page.getByLabel("Logradouro da coleta", { exact: true })).toHaveValue("");
  await page.getByText("Conferir cadastro anterior para coleta", { exact: true }).click();
  await page.getByRole("button", { name: "Usar endereço anterior na coleta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("só possui texto livre");
  await page.getByRole("button", { name: "Confirmar cópia para coleta", exact: true }).click();
  await expect(page.getByLabel("Logradouro da coleta", { exact: true })).toHaveValue(source);
  await expect(page.getByLabel("Logradouro da entrega", { exact: true })).toHaveValue("");
  const saved = await saveCustomer(page, customer.id);
  expect(saved.address).toBe(source);
  expect(saved.service_details.collection_address.street).toBe(source);
});

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
