import { test, expect, type Page, type Locator } from "@playwright/test";
// Real keyboard paths; never use locator.focus() to manufacture an opener.
async function reach(page: Page, locator: Locator) {
  for (let i = 0; i < 400; i++) {
    if (await locator.evaluate((e) => e === document.activeElement)) return;
    const reverse = await locator.evaluate((e) =>
      Boolean(
        document.activeElement &&
        e.compareDocumentPosition(document.activeElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    );
    await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
  }
  throw new Error(
    "Acionador não alcançado por teclado: " +
      (await locator.evaluate((e) => e.outerHTML)),
  );
}
async function activate(page: Page, locator: Locator) {
  await reach(page, locator);
  await page.keyboard.press("Enter");
}
async function login(page: Page, route: string) {
  await page.goto("/app#" + route);
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.SILEX_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
}
async function accessibleFocus(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return (
          el !== document.body &&
          el.isConnected &&
          !el.matches(":disabled") &&
          !el.closest('[inert], [hidden], [aria-hidden="true"]') &&
          el.getClientRects().length > 0
        );
      }),
    )
    .toBe(true);
}
test("Clientes: salvar, editar e cancelar preservam o formulário e o foco", async ({
  page,
}, info) => {
  await login(page, "customers");
  const add = page.getByRole("button", { name: "Novo cliente", exact: true });
  await activate(page, add);
  const name = `Cliente fictício foco ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Nome *", { exact: true }).fill(name);
  await activate(
    page,
    page.getByRole("button", { name: "Salvar", exact: true }),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await expect(add).toBeFocused();
  await page
    .getByRole("textbox", { name: "Pesquisar", exact: true })
    .fill(name);
  const row = page.getByRole("row").filter({ hasText: name });
  const edit = row.getByRole("button", { name: "Editar " + name, exact: true });
  await activate(page, edit);
  await activate(
    page,
    page.getByRole("button", { name: "Voltar", exact: true }),
  );
  await expect(edit).toBeFocused();
  await expect(row).toContainText(name);
});
for (const [route, addName] of [
  ["finance-payable", "Nova despesa"],
  ["finance-receivable", "Nova receita"],
]) {
  test(`${route}: cadastro, baixa assíncrona, histórico e cancelamento`, async ({
    page,
  }, info) => {
    await login(page, route);
    await page.getByRole("button", { name: "Tudo", exact: true }).click();
    const add = page.getByRole("button", { name: addName, exact: true });
    await activate(page, add);
    const description = `Título fictício P01 ${info.project.name} ${route} ${Date.now()}`;
    await page.getByLabel("Histórico *", { exact: true }).fill(description);
    await page
      .getByLabel("Valor de cada título (R$) *", { exact: true })
      .fill("42,50");
    await activate(
      page,
      page.getByRole("button", { name: "Criar título", exact: true }),
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await expect(add).toBeFocused();
    const search = page.getByRole("textbox", { name: "Busca", exact: true });
    await search.fill(description);
    await search.press("Enter");
    const row = page.getByRole("row").filter({ hasText: description });
    const settle = row.getByRole("button", { name: "Quitar", exact: true });
    await activate(page, settle);
    await expect(
      page.getByRole("button", { name: "Fechar janela" }),
    ).toBeFocused();
    await page.getByLabel("Pagamento", { exact: true }).selectOption("pix");
    await activate(
      page,
      page.getByRole("button", {
        name: "Confirmar quitação integral",
        exact: true,
      }),
    );
    await expect(row).toContainText("Quitado");
    await page.waitForLoadState("networkidle");
    await accessibleFocus(page);
    const history = row.getByRole("button", {
      name: "Baixas (1)",
      exact: true,
    });
    await activate(page, history);
    await page.keyboard.press("Escape");
    await expect(history).toBeFocused();
    const cancel = row.getByRole("button", { name: "Cancelar", exact: true });
    await activate(page, cancel);
    await expect(
      page.getByRole("button", { name: "Fechar janela" }),
    ).toBeFocused();
    await page
      .getByLabel("Motivo *", { exact: true })
      .fill("Cancelamento sintético para validação P01");
    await activate(
      page,
      page.getByRole("button", { name: "Confirmar cancelamento", exact: true }),
    );
    await expect(row).toContainText("Cancelado");
    await page.waitForLoadState("networkidle");
    await accessibleFocus(page);
    const stored = await page.evaluate(
      async (q) =>
        (await (await fetch("/api/finance?q=" + encodeURIComponent(q))).json())
          .items[0],
      description,
    );
    expect(stored.amount_cents).toBe(4250);
    expect(stored.status).toBe("canceled");
  });
}
test("Conciliação: revisão, erro existente e Escape preservam acionador e dados", async ({
  page,
}) => {
  await login(page, "finance-reconcile");
  const statement = page
    .getByRole("row")
    .filter({ hasText: "Extrato ilustrativo SB053A.ofx" });
  await activate(
    page,
    statement.getByRole("button", { name: "Revisar", exact: true }),
  );
  const open = page
    .locator(".reconciliation-statement")
    .getByRole("button", { name: "Revisar / confirmar", exact: true })
    .first();
  await activate(page, open);
  await activate(
    page,
    page.getByRole("button", { name: "Confirmar conciliação", exact: true }),
  );
  await expect(page.getByRole("alert")).toContainText(
    "Selecione um título pendente",
  );
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
});
test("Histórico do navegador desmonta modal e mantém foco do novo módulo", async ({
  page,
}) => {
  await login(page, "home");
  await page.goto("/app#customers");
  await page.waitForLoadState("networkidle");
  await activate(
    page,
    page.getByRole("button", { name: "Novo cliente", exact: true }),
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/app#home$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("main")).toBeFocused();
});

test("Outros padrões: venda, estorno, configurações financeiras, usuário e serviço", async ({
  page,
}, info) => {
  await login(page, "sales");
  // Create only a disposable order, using the existing API, to exercise the
  // generation dialog without depending on the prior fixture's generated order.
  const code = await page.evaluate(async (suffix) => {
    const customer = (
      await (await fetch("/api/customers?page_size=100")).json()
    ).items[0];
    const date = (await (await fetch("/api/finance/dashboard")).json()).end;
    const response = await fetch("/api/service-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customer.id,
        description: "Pedido fictício foco " + suffix,
        service_date: date,
        negotiated_cents: 10000,
        costs: [],
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    return (await response.json()).code as string;
  }, info.project.name + Date.now());
  const checks: [string, RegExp | string][] = [
    ["sales", /^Ver venda /],
    ["finance", "Estornar"],
    ["finance-payable", "Contas e categorias"],
    ["users", "Desativar"],
    ["service-orders", /^Ver /],
    ["service-orders", "Cancelar"],
  ];
  for (const [route, name] of checks) {
    await page.goto("/app#" + route);
    await page.waitForLoadState("networkidle");
    if (route === "finance") {
      await page.getByRole("button", { name: "Tudo", exact: true }).click();
      const description = `Movimento fictício foco ${info.project.name} ${Date.now()}`;
      await activate(
        page,
        page.getByRole("button", { name: "Nova receita", exact: true }),
      );
      await page.getByLabel("Histórico *", { exact: true }).fill(description);
      await page.getByLabel("Valor (R$) *", { exact: true }).fill("1,23");
      await activate(
        page,
        page.getByRole("button", { name: "Salvar lançamento", exact: true }),
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const search = page.getByLabel("Pesquisar histórico ou documento", {
        exact: true,
      });
      await search.fill(description);
      await search.press("Enter");
    }
    if (route === "service-orders") {
      await page
        .getByRole("textbox", { name: "Buscar", exact: true })
        .fill(code);
      await expect(
        page.getByRole("row").filter({ hasText: code }),
      ).toBeVisible();
    }
    const opener = page
      .locator("main")
      .getByRole("button", { name, exact: typeof name === "string" })
      .first();
    await activate(page, opener);
    await expect(
      page.getByRole("button", { name: "Fechar janela" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  }
  await page.reload();
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("row").filter({ hasText: code });
  const generate = row.getByRole("button", {
    name: "Gerar títulos",
    exact: true,
  });
  await activate(page, generate);
  await page.keyboard.press("Escape");
  await expect(generate).toBeFocused();
});

test("Caixa: confirmação assíncrona troca acionador e mantém destino acessível", async ({
  page,
}) => {
  await login(page, "cash");
  const close = page.getByRole("button", {
    name: "Fechar meu caixa",
    exact: true,
  });
  const open = page.getByRole("button", {
    name: "Abrir meu caixa",
    exact: true,
  });
  if (await close.isVisible()) {
    await activate(page, close);
    await activate(
      page,
      page.getByRole("button", { name: "Confirmar fechamento", exact: true }),
    );
    await expect(open).toBeVisible();
    await page.waitForLoadState("networkidle");
    await accessibleFocus(page);
  }
  await activate(page, open);
  await activate(
    page,
    page.getByRole("button", { name: "Confirmar abertura", exact: true }),
  );
  await expect(close).toBeVisible();
  await page.waitForLoadState("networkidle");
  await accessibleFocus(page);
  await activate(page, close);
  await activate(
    page,
    page.getByRole("button", { name: "Confirmar fechamento", exact: true }),
  );
  await expect(open).toBeVisible();
  await page.waitForLoadState("networkidle");
  await accessibleFocus(page);
});
