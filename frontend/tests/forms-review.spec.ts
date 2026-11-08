import { test, expect, type Page } from "./integrationTest";

const password = "DemoLocal#2026"; // Disposable seed only.
async function login(page: Page, route = "customers", transport = false) {
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: transport ? "transport.fixture.admin" : "demo.admin", password: transport ? "CustomerFixtureOnly#2026" : password },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/app#" + route);
  await expect(page.locator("main h1")).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("password visibility preserves value, keyboard, validation and login payload", async ({
  page,
  browserName,
}, info) => {
  await page.goto("/entrar");
  const input = page.getByLabel("Senha", { exact: true });
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await input.fill(password);
  await expect(input).toHaveAttribute("type", "password");
  await input.press("Tab");
  const show = page.getByRole("button", { name: "Mostrar senha", exact: true });
  await expect(show).toBeFocused();
  await show.press("Space");
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveValue(password);
  await expect(
    page.getByRole("button", { name: "Ocultar senha" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/entrar$/);
  await noOverflow(page);
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await page.screenshot({
    path: `../docs/evidence/system-review/login-${browserName}-${info.project.name}.png`,
    fullPage: true,
  });
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/api/auth/login"),
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({
    username: "demo.admin",
    password,
  });
  await expect(page).toHaveURL(/app#home$/);
  await page.goto("/app#users");
  await page.getByRole("button", { name: "Novo usuário" }).click();
  const newPassword = page.getByLabel("Senha *", { exact: true });
  await newPassword.fill("Senha fictícia #2026");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(newPassword).toHaveAttribute("autocomplete", "new-password");
  await expect(newPassword).toHaveAttribute("type", "text");
  await expect(page.getByRole("dialog")).toBeVisible();
  await newPassword.fill("");
  await expect(newPassword).toHaveAttribute("type", "password");
});

test("document punctuation, caret edits, invalid input and normalized persistence", async ({
  page,
}, info) => {
  await login(page);
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  const name = `Cliente formulário ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Nome *", { exact: true }).fill(name);
  const doc = page.getByLabel("CPF / CNPJ", { exact: true });
  await doc.pressSequentially("0123");
  await expect(doc).toHaveValue("012.3");
  // Backspace/Delete across a separator must remove one digit, without a stuck caret.
  await doc.evaluate((input: HTMLInputElement) =>
    input.setSelectionRange(4, 4),
  );
  await doc.press("Backspace");
  await expect(doc).toHaveValue("013");
  await doc.fill("01234567890");
  await expect(doc).toHaveValue("012.345.678-90");
  await doc.evaluate((input: HTMLInputElement) =>
    input.setSelectionRange(3, 3),
  );
  await doc.press("Delete");
  await expect(doc).toHaveValue("012.456.789-0");
  await doc.fill("01234567890");
  await doc.evaluate((input: HTMLInputElement) =>
    input.setSelectionRange(4, 7),
  );
  await doc.pressSequentially("999");
  await expect(doc).toHaveValue("012.999.678-90");
  // Length validation is local; optional clearing remains allowed.
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/customers"))
      posts++;
  });
  await doc.fill("1234");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  expect(
    await doc.evaluate(
      (input: HTMLInputElement) => input.validity.patternMismatch,
    ),
  ).toBe(true);
  expect(posts).toBe(0);
  const document = info.project.name.includes("mobile")
    ? "98xyz76501de35"
    : "12abc34501de35";
  await doc.fill(document);
  const formatted = await doc.inputValue();
  await expect(doc).toHaveValue(
    document.startsWith("98") ? "98.XYZ.765/01DE-35" : "12.ABC.345/01DE-35",
  );
  await page.getByLabel("CEP", { exact: true }).fill("69000123");
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue(
    "69000-123",
  );
  await noOverflow(page);
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/customers") && r.request().method() === "POST",
  );
  await page.screenshot({
    path: `../docs/evidence/system-review/document-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const row = await (await saved).json();
  expect(row.document).toBe(document.toUpperCase());
  expect(row.postal_code).toBe("69000-123");
  await page.reload();
  await page.getByLabel("Pesquisar por").selectOption("document");
  await page
    .getByRole("textbox", { name: "Pesquisar", exact: true })
    .fill(formatted);
  await page
    .getByRole("button", { name: "Editar " + name, exact: true })
    .click();
  await expect(doc).toHaveValue(formatted);
  await doc.fill("");
  const updated = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" &&
      r.url().endsWith(`/api/customers/${row.id}`),
  );
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  expect((await (await updated).json()).document).toBeNull();
});

for (const [route, button, nameLabel, kind] of [
  ["suppliers", "Novo fornecedor", "Nome *", "supplier"],
  ["day-workers", "Novo diarista", "Nome completo *", "day_worker"],
  [
    "subcontracted-freight",
    "Novo prestador de frete",
    "Nome / razão social *",
    "subcontracted_freight",
  ],
])
  test(`${kind}: registration and contact do not duplicate the phone`, async ({
    page,
  }, info) => {
    await login(page, route, kind === "subcontracted_freight");
    await page.getByRole("button", { name: button, exact: true }).click();
    const name = `Parceiro formulário ${kind} ${info.project.name} ${Date.now()}`;
    await page.getByLabel(nameLabel, { exact: true }).fill(name);
    await page.getByLabel("Telefone", { exact: true }).fill("(92) 90000-1234");
    const partnerDocument = `${kind === "supplier" ? "11" : kind === "day_worker" ? "22" : "33"}ABC34501DE${info.project.name === "mobile" ? "36" : "35"}`;
    await page.getByLabel("CPF / CNPJ", { exact: true }).fill(partnerDocument);
    await page.getByLabel("Cidade", { exact: true }).fill("Cidade fictícia");
    await page.getByLabel("UF", { exact: true }).fill("am");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill("contato@example.test");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible();
    const contact = row.locator("td").nth(2);
    expect(
      ((await contact.innerText()).match(/90000-1234/g) || []).length,
    ).toBe(1);
    await expect(contact).toContainText("Cidade fictícia / AM");
    await expect(contact).toContainText("contato@example.test");
    await row.getByRole("button", { name: "Editar " + name }).click();
    await expect(page.getByLabel("CPF / CNPJ", { exact: true })).toHaveValue(
      `${partnerDocument.slice(0, 2)}.ABC.345/01DE-${partnerDocument.slice(-2)}`,
    );
    await page
      .getByLabel("Pessoa de contato", { exact: true })
      .fill("Pessoa fictícia");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(contact).toContainText("Pessoa fictícia");
    await expect(contact).toContainText("Cidade fictícia / AM");
    expect(
      ((await contact.innerText()).match(/90000-1234/g) || []).length,
    ).toBe(1);
    await noOverflow(page);
  });

async function service(page: Page) {
  await login(page, "service-orders");
  const customer = await (
    await page.request.post("/api/customers", {
      data: { name: "Cliente fictício do serviço" },
    })
  ).json();
  const response = await page.request.post("/api/service-orders", {
    data: {
      customer_id: customer.id,
      description: "Serviço fictício",
      service_date: "2026-03-04",
      negotiated_cents: 12345,
      costs: [],
    },
  });
  expect(response.ok()).toBe(true);
  const order = await response.json();
  await page.reload();
  await page
    .getByRole("button", { name: "Ver " + order.code, exact: true })
    .click();
  return order;
}

test("service cancellation reports failure, locks submissions and updates the list only on success", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const order = await service(page);
  let calls = 0,
    release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pattern = `**/api/service-orders/${order.id}/cancel`;
  await page.route(pattern, async (route) => {
    calls++;
    await gate;
    await route.fulfill({
      status: 503,
      json: { detail: "Operação indisponível. Tente novamente." },
    });
  });
  await page
    .getByLabel("Motivo para cancelar o serviço")
    .fill("Cancelamento fictício");
  await page
    .getByRole("dialog")
    .locator("form")
    .evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  await expect.poll(() => calls).toBe(1);
  await expect(
    page.getByRole("button", { name: "Cancelando serviço..." }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Salvando...", exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Operação indisponível",
  );
  expect(
    (await (await page.request.get(`/api/service-orders/${order.id}`)).json())
      .status,
  ).toBe("draft");
  await page.unroute(pattern);
  await page
    .getByRole("button", { name: "Cancelar serviço e preservar o histórico" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: order.code }),
  ).toContainText("Cancelado");
  expect(errors).toEqual([]);
});

test("service refresh failure remains retryable; a late response does not reopen a closed modal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const order = await service(page),
    pattern = `**/api/service-orders/${order.id}`;
  await page.route(pattern, (route) =>
    route.fulfill({ status: 500, json: { detail: "Indisponível" } }),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Atualizar", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "última consulta",
  );
  await page.unroute(pattern);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    await gate;
    await route.fulfill({ json: order });
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Atualizar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Atualizando…" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Fechar janela" }).click();
  const finished = page.waitForResponse((r) =>
    r.url().endsWith(`/api/service-orders/${order.id}`),
  );
  release();
  await finished;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("obsolete lookup is aborted without an error or stale results", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    (window as any).abortedLookups = 0;
    window.fetch = (input, init) => {
      if (String(input).includes("q=obsolete"))
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            (window as any).abortedLookups++;
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      return original(input, init);
    };
  });
  await login(page);
  const search = page.getByRole("textbox", { name: "Pesquisar", exact: true });
  await search.fill("obsolete");
  await expect(page.getByText("Carregando registros...")).toBeVisible();
  await search.fill("no-such-fictional-customer");
  await expect(page.getByText("Nenhum registro encontrado")).toBeVisible();
  expect(await page.evaluate(() => (window as any).abortedLookups)).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
