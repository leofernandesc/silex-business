import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, username = "demo.admin") {
  await page.goto("/entrar");
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Página inicial", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await navigate(page, "Visão geral");
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
}
async function navigate(page: Page, name: string) {
  const open = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await open.isVisible()) await open.click();
  const nav = page.getByRole("navigation", { name: "Menu principal" });
  const target = nav.getByRole("button", { name, exact: true });
  const group: Record<string, string> = {
    Clientes: "CADASTROS", "Produtos ou Serviços": "CADASTROS", Fornecedores: "CADASTROS", Diaristas: "CADASTROS", "Frete Subcontratado": "CADASTROS",
    Estoque: "MOVIMENTAÇÕES", "Frente de Caixa": "MOVIMENTAÇÕES", Vendas: "MOVIMENTAÇÕES", "Serviços e pedidos": "MOVIMENTAÇÕES", "Controle de caixa": "MOVIMENTAÇÕES",
    "Lançamento (Despesa/Receita)": "FINANCEIRO", "Conciliação Bancária": "FINANCEIRO", "Contas a Pagar": "FINANCEIRO", "Contas a Receber": "FINANCEIRO", Dashboard: "FINANCEIRO", "Cadastro de Contas": "FINANCEIRO", Categorias: "FINANCEIRO", SubCategorias: "FINANCEIRO", "Relatórios Financeiros": "FINANCEIRO",
    Usuários: "ADMINISTRAÇÃO", "Histórico de operações": "ADMINISTRAÇÃO", "Empresa e identidade": "ADMINISTRAÇÃO",
  };
  if (!(await target.isVisible()) && group[name]) await nav.getByRole("button", { name: group[name], exact: true }).click();
  await target.click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBeTruthy();
}
async function waitForMobileMenuToClose(page: Page) {
  await page.waitForFunction(
    () =>
      window.innerWidth > 900 ||
      (document.querySelector(".sidebar")?.getBoundingClientRect().right ?? 0) <= 0,
  );
}

test("cadastros de diaristas e frete com PIX e beneficiário em contas a pagar", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(page);
  const suffix = info.project.name + "-" + Date.now();
  const worker = "Diarista E2E " + suffix, freight = "Frete E2E " + suffix;
  await navigate(page, "Diaristas");
  await page.getByRole("button", { name: "Novo diarista", exact: true }).click();
  await page.getByLabel("Nome completo *", { exact: true }).fill(worker);
  await page.getByLabel("Telefone", { exact: true }).fill("(92) 99999-1234");
  await page.getByLabel("Tipo de chave PIX", { exact: true }).selectOption("email");
  await page.getByLabel("Chave PIX *", { exact: true }).fill("DIARISTA@EXAMPLE.TEST");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: worker })).toContainText("diarista@example.test");
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: worker })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: "../docs/evidence/partners/diaristas-" + info.project.name + ".png", fullPage: true });

  await navigate(page, "Frete Subcontratado");
  await expect(page.getByRole("row").filter({ hasText: worker })).toHaveCount(0);
  await page.getByRole("button", { name: "Novo prestador de frete", exact: true }).click();
  await page.getByLabel("Nome / razão social *", { exact: true }).fill(freight);
  await page.getByLabel("Tipo de chave PIX", { exact: true }).selectOption("phone");
  await page.getByLabel("Chave PIX *", { exact: true }).fill("(92) 99999-5678");
  await page.getByLabel("Titular do PIX", { exact: true }).fill("Titular de frete");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: freight })).toContainText("+5592999995678");
  await noOverflow(page);
  await page.screenshot({ path: "../docs/evidence/partners/frete-" + info.project.name + ".png", fullPage: true });

  await navigate(page, "Contas a Pagar");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  const description = "Despesa de frete " + suffix;
  await page.getByLabel("Histórico *", { exact: true }).fill(description);
  await page.getByLabel("Valor de cada título (R$) *", { exact: true }).fill("125,00");
  await page.getByLabel("Pesquisar beneficiário", { exact: true }).fill(freight);
  await expect(page.getByLabel("Beneficiário", { exact: true }).getByRole("option", { name: freight + " · Frete subcontratado", exact: true })).toHaveCount(1);
  await page.getByLabel("Beneficiário", { exact: true }).selectOption({ label: freight + " · Frete subcontratado" });
  await expect(page.getByLabel("Chave PIX", { exact: true })).toHaveValue("+5592999995678");
  await page.getByRole("button", { name: "Criar título", exact: true }).click();
  await page.getByRole("textbox", { name: "Busca", exact: true }).fill(description);
  const row = page.getByRole("row").filter({ hasText: description });
  await expect(row).toContainText("Em aberto");
  await row.getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(page.getByLabel("Chave PIX", { exact: true })).toHaveValue("+5592999995678");
  await expect(page.getByRole("dialog")).toContainText("Titular de frete");
  // Substitui somente a API de clipboard indisponível em alguns runners Firefox.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async (key: string) => { (window as unknown as { copiedPix: string }).copiedPix = key; },
    } });
  });
  await page.getByRole("button", { name: "Copiar chave PIX", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Chave copiada");
  expect(await page.evaluate(() => (window as unknown as { copiedPix: string }).copiedPix)).toBe("+5592999995678");
  const stored = await page.evaluate(async (q) => (await (await fetch("/api/finance?q=" + encodeURIComponent(q))).json()).items[0], description);
  expect(stored.status).toBe("open");
  expect(stored.payments).toHaveLength(0);
  await waitForMobileMenuToClose(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "../docs/evidence/partners/baixa-pix-" + info.project.name + ".png" });
  await page.getByRole("button", { name: "Confirmar quitação integral", exact: true }).click();
  await expect(row).toContainText("Quitado");
  await navigate(page, "Frete Subcontratado");
  await page.getByRole("row").filter({ hasText: freight }).getByRole("button", { name: "Editar " + freight, exact: true }).click();
  await page.getByLabel("Situação", { exact: true }).selectOption("false");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: freight })).toContainText("Inativo");
  await navigate(page, "Contas a Pagar");
  await page.getByRole("textbox", { name: "Busca", exact: true }).fill(description);
  await expect(page.getByRole("row").filter({ hasText: description })).toContainText(freight);
  expect(errors).toEqual([]);
});

test("sessão persistente, navegação e tabelas responsivas", async ({
  page,
}, info) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (
      request.url().startsWith("http") &&
      !request.url().startsWith("http://127.0.0.1:8011/")
    )
      external.push(request.url());
  });
  await login(page);
  await noOverflow(page);
  await page.screenshot({
    path: `../docs/evidence/sprint8/dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await page.getByRole("link", { name: "Pular para o conteúdo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  for (const [nav, heading] of [
    ["Clientes", "Clientes"],
    ["Produtos ou Serviços", "Produtos ou Serviços"],
    ["Estoque", "Movimentações de estoque"],
    ["Controle de caixa", "Controle de caixa"],
    ["Vendas", "Vendas"],
    ["Lançamento (Despesa/Receita)", "Lançamentos (Despesa/Receita)"],
    ["Usuários", "Usuários"],
    ["Histórico de operações", "Histórico de operações"],
  ]) {
    await navigate(page, nav);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await noOverflow(page);
  }
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("cliente e produto persistem; estoque, venda, recibo e estorno", async ({
  page,
}, info) => {
  await login(page);
  const suffix = `${info.project.name}-${Date.now()}`,
    product = `Produto E2E ${suffix}`,
    customer = `Cliente E2E ${suffix}`;
  await navigate(page, "Clientes");
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.getByLabel("Nome *", { exact: true }).fill(customer);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(customer, { exact: true })).toBeVisible();
  await navigate(page, "Produtos ou Serviços");
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  await page.getByLabel("Descrição *").fill(product);
  await page.getByLabel("Código *", { exact: true }).fill(suffix);
  await page.getByLabel("Preço de venda (R$) *").fill("10,25");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(product, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(product, { exact: true })).toBeVisible();
  await navigate(page, "Estoque");
  await page
    .getByRole("button", { name: "Novo lançamento", exact: true })
    .click();
  await page
    .getByLabel("Produto *", { exact: true })
    .selectOption({ label: `${suffix} · ${product}` });
  await page.getByLabel("Quantidade *", { exact: true }).fill("2,5");
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Entrada para teste de navegador");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: product })
      .getByText("Entrada para teste de navegador", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Frente de Caixa");
  await page
    .getByRole("textbox", { name: "Pesquisar", exact: true })
    .fill(product);
  await page.getByRole("button").filter({ hasText: product }).click();
  await page.getByLabel("Quantidade (UN)").fill("0,5");
  await page.getByLabel("Pesquisar cliente", { exact: true }).fill(customer);
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: customer });
  await page.getByLabel("Forma de pagamento").selectOption("cash");
  await page.screenshot({
    path: `../docs/evidence/sprint8/pdv-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finalizar venda", exact: true })
    .click();
  const receipt = page.getByRole("dialog");
  await expect(
    receipt.getByText("Recibo sem valor fiscal", { exact: true }),
  ).toBeVisible();
  await expect(
    receipt.getByText("R$ 5,13", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/evidence/sprint8/recibo-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".receipt")).toBeVisible();
  await expect(page.locator(".topbar")).toBeHidden();
  await expect(page.locator(".pos-layout")).toBeHidden();
  await expect(
    receipt.getByRole("button", { name: "Imprimir recibo" }),
  ).toBeHidden();
  await page.screenshot({
    path: `../docs/evidence/sprint8/recibo-impressao-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });
  await receipt
    .getByRole("button", { name: "Cancelar venda", exact: true })
    .click();
  await receipt
    .getByLabel("Motivo do cancelamento *")
    .fill("Cancelamento do teste de navegador");
  await receipt
    .getByRole("button", { name: "Confirmar cancelamento", exact: true })
    .click();
  await expect(receipt.getByText("Cancelado", { exact: true })).toBeVisible();
  await receipt.getByRole("button", { name: "Fechar janela" }).click();
  await navigate(page, "Produtos ou Serviços");
  await page
    .getByRole("textbox", { name: "Pesquisar", exact: true })
    .fill(product);
  await expect(
    page.getByRole("cell", { name: "2,5 UN", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("financeiro: vencimento, exportação filtrada e quitação", async ({
  page,
}, info) => {
  await login(page);
  await navigate(page, "Contas a Receber");
  await page
    .getByRole("button", { name: "Nova receita", exact: true })
    .click();
  const description = `Receita E2E ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Histórico *", { exact: true }).fill(description);
  await page.getByLabel("Valor de cada título (R$) *", { exact: true }).fill("21,35");
  await page.getByRole("button", { name: "Criar título", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Busca", exact: true })
    .fill(description);
  const row = page.getByRole("row").filter({ hasText: description });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Quitar", exact: true }).click();
  await page.getByLabel("Pagamento", { exact: true }).selectOption("pix");
  await page
    .getByRole("button", { name: "Confirmar quitação integral", exact: true })
    .click();
  await expect(row.getByText("Quitado", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("finance.csv");
  await download.saveAs(`../test-results/finance-${info.project.name}.csv`);
  await noOverflow(page);
});

test("serviço/pedido vincula custos e gera títulos sem antecipar pagamentos", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const suffix = `${info.project.name}-${Date.now()}`;
  const customer = `Cliente OS ${suffix}`, worker = `Diarista OS ${suffix}`, freight = `Frete OS ${suffix}`;

  await navigate(page, "Clientes");
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.getByLabel("Nome *", { exact: true }).fill(customer);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await navigate(page, "Diaristas");
  await page.getByRole("button", { name: "Novo diarista", exact: true }).click();
  await page.getByLabel("Nome completo *", { exact: true }).fill(worker);
  await page.getByLabel("Valor padrão sugerido por diária (R$)", { exact: true }).fill("125,00");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await navigate(page, "Frete Subcontratado");
  await page.getByRole("button", { name: "Novo prestador de frete", exact: true }).click();
  await page.getByLabel("Nome / razão social *", { exact: true }).fill(freight);
  await page.getByLabel("Valor de referência do frete (R$)", { exact: true }).fill("80,00");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await navigate(page, "Serviços e pedidos");
  await page.getByRole("button", { name: "Novo serviço/pedido", exact: true }).click();
  await page.getByLabel("Cliente *", { exact: true }).selectOption({ label: customer });
  await page.getByLabel("Descrição do serviço/pedido *", { exact: true }).fill(`Manutenção OS ${suffix}`);
  await page.getByLabel("Valor negociado (R$) *", { exact: true }).fill("1000,00");
  await page.getByRole("button", { name: "Adicionar diarista", exact: true }).click();
  const workerCost = page.locator(".service-cost-row").first();
  await workerCost.getByLabel("Diarista *", { exact: true }).selectOption({ label: worker });
  await expect(workerCost.getByLabel("Valor acordado neste serviço (R$) *", { exact: true })).toHaveValue("125,00");
  await workerCost.getByLabel("Quantidade de diárias *", { exact: true }).fill("2");
  await expect(workerCost.getByLabel("Valor acordado neste serviço (R$) *", { exact: true })).toHaveValue("250,00");
  await workerCost.getByLabel("Valor acordado neste serviço (R$) *", { exact: true }).fill("275,00");
  await workerCost.getByLabel("Quantidade de diárias *", { exact: true }).fill("3");
  await expect(workerCost.getByLabel("Valor acordado neste serviço (R$) *", { exact: true })).toHaveValue("275,00");
  await page.getByRole("button", { name: "Adicionar frete", exact: true }).click();
  const freightCost = page.locator(".service-cost-row").nth(1);
  await freightCost.getByLabel("Prestador de frete *", { exact: true }).selectOption({ label: freight });
  await expect(freightCost.getByLabel("Valor acordado neste serviço (R$) *", { exact: true })).toHaveValue("80,00");
  await freightCost.getByLabel("Valor acordado neste serviço (R$) *", { exact: true }).fill("90,00");
  await page.getByRole("button", { name: "Cadastrar serviço", exact: true }).click();

  const row = page.getByRole("row").filter({ hasText: `Manutenção OS ${suffix}` });
  await expect(row).toContainText("R$ 365,00");
  await expect(row).toContainText("R$ 635,00");
  await expect(row).toContainText("R$ 0,00");
  await row.getByRole("button", { name: /Gerar títulos/ }).click();
  await page.getByLabel("Conta associada aos títulos *", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Confirmar geração de títulos", exact: true }).click();
  await expect(row).toContainText("Títulos gerados");
  await row.getByRole("button", { name: /Ver OS-/ }).click();
  const details = page.getByRole("dialog");
  await expect(details.getByRole("heading", { name: "Títulos financeiros", exact: true })).toBeVisible();
  await expect(details.getByRole("row").filter({ hasText: "Receber" })).toHaveCount(1);
  await expect(details.getByRole("row").filter({ hasText: "Pagar" })).toHaveCount(2);
  await expect(details).toContainText(worker);
  await expect(details).toContainText(freight);
  await expect(details.getByRole("row").filter({ hasText: worker }).first()).toContainText("Em aberto");
  const lastPayable = details.getByRole("row").filter({ hasText: "Pagar" }).last();
  await lastPayable.scrollIntoViewIfNeeded();
  await expect(lastPayable).toBeInViewport();
  await page.screenshot({ path: `../docs/evidence/service-orders/orders-${info.project.name}.png`, fullPage: true });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("operador tem escopo restrito e abre/fecha seu caixa", async ({
  page,
}) => {
  await login(page, "demo.operador");
  await navigate(page, "Controle de caixa");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Financeiro", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(async () => (await fetch("/api/finance")).status),
  ).toBe(403);
  await page
    .getByRole("button", { name: "Abrir meu caixa", exact: true })
    .click();
  await page.getByLabel("Dinheiro inicial (R$) *").fill("100,00");
  await page
    .getByRole("button", { name: "Confirmar abertura", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fechar meu caixa", exact: true })
    .click();
  await page.getByLabel("Dinheiro contado (R$) *").fill("99,50");
  await page
    .getByRole("button", { name: "Confirmar fechamento", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "-R$ 0,50", exact: true }).first(),
  ).toBeVisible();
  await noOverflow(page);
});

test("rascunho a prazo, quitação e modal por teclado", async ({ page }) => {
  await login(page);
  await navigate(page, "Clientes");
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Frente de Caixa");
  await page
    .getByRole("button")
    .filter({ hasText: "Organização de documentos" })
    .click();
  await page.getByLabel("Quantidade (HR)").fill("inválido");
  await page
    .getByRole("button")
    .filter({ hasText: "Organização de documentos" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Corrija a quantidade");
  await page.getByLabel("Quantidade (HR)").fill("1");
  await page
    .getByRole("button")
    .filter({ hasText: "Organização de documentos" })
    .click();
  await page.getByLabel("Quantidade (HR)").fill("1");
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: "Ana Exemplo" });
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Rascunho", { exact: true })).toBeVisible();
  await dialog.getByLabel("Pagamento", { exact: true }).selectOption("credit");
  await dialog
    .getByRole("button", { name: "Finalizar rascunho", exact: true })
    .click();
  await expect(dialog.getByText("Finalizada", { exact: true })).toBeVisible();
  const heading = await dialog
    .getByRole("heading", { level: 2 })
    .first()
    .textContent();
  const id = heading?.match(/#(\d+)/)?.[1];
  expect(id).toBeTruthy();
  await dialog.getByRole("button", { name: "Fechar janela" }).click();
  await navigate(page, "Contas a Receber");
  await page
    .getByRole("textbox", { name: "Busca", exact: true })
    .fill(`Venda #${id}`);
  const row = page.getByRole("row").filter({ hasText: `Venda #${id}` });
  await row.getByRole("button", { name: "Quitar", exact: true }).click();
  await page.getByLabel("Pagamento", { exact: true }).selectOption("pix");
  await page
    .getByRole("button", { name: "Confirmar quitação integral", exact: true })
    .click();
  await expect(row.getByText("Quitado", { exact: true })).toBeVisible();
  await noOverflow(page);
});

test("financeiro ampliado: recorrência, baixa parcial, comprovante, OFX, painel e relatórios", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const suffix = `${info.project.name}-${Date.now()}`;

  await navigate(page, "Contas a Receber");
  await page.getByRole("button", { name: "Tudo", exact: true }).click();
  await page.getByRole("button", { name: "Nova receita", exact: true }).click();
  await page.getByLabel("Histórico *", { exact: true }).fill(`Recorrência E2E ${suffix}`);
  await page.getByLabel("Valor de cada título (R$) *", { exact: true }).fill("100,00");
  await page.getByLabel("Número do documento", { exact: true }).fill(`DOC-${suffix}`);
  await page.getByLabel("Quantidade de títulos *", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Criar títulos recorrentes", exact: true }).click();
  await page.getByRole("textbox", { name: "Busca", exact: true }).fill(`Recorrência E2E ${suffix}`);
  const recurringRows = page.getByRole("row").filter({ hasText: `Recorrência E2E ${suffix}` });
  await expect(recurringRows).toHaveCount(2);
  const firstOccurrence = recurringRows.filter({ hasText: "Ocorrência 1/2" });
  const secondOccurrence = recurringRows.filter({ hasText: "Ocorrência 2/2" });
  await expect(firstOccurrence).toHaveCount(1);
  await expect(secondOccurrence).toHaveCount(1);
  const row = firstOccurrence;
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Quitar", exact: true }).click();
  await page.getByLabel("Principal nesta baixa (R$) *", { exact: true }).fill("25,00");
  await page.getByLabel("Juros (R$)", { exact: true }).fill("1,50");
  await page.getByLabel("Multa (R$)", { exact: true }).fill("0,50");
  await page.getByLabel("Desconto (R$)", { exact: true }).fill("2,00");
  await page.getByRole("button", { name: "Registrar pagamento parcial", exact: true }).click();
  await expect(row).toContainText("Parcial");
  await row.getByRole("button", { name: "Baixas (1)", exact: true }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "comprovante-e2e.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\ncomprovante de navegador"),
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await row.getByRole("button", { name: "Baixas (1)", exact: true }).click();
  await page.getByLabel("Motivo de estorno", { exact: true }).fill("Estorno da baixa de teste");
  await page.getByRole("button", { name: "Estornar baixa", exact: true }).click();
  await expect(row).toContainText("Em aberto");

  await navigate(page, "Dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard financeiro", exact: true })).toBeVisible();
  await waitForMobileMenuToClose(page);
  await page.screenshot({ path: `../docs/evidence/sprint9-13/dashboard-${info.project.name}.png`, fullPage: true });
  await noOverflow(page);

  const titleId = await page.evaluate(async (description) => {
    const get = async (path: string) => (await fetch(`/api${path}`)).json();
    const [accounts, categories, dates] = await Promise.all([
      get("/accounts"), get("/categories"), get("/finance/dashboard"),
    ]);
    const bank = accounts.find((account: { kind: string; active: boolean }) => account.kind === "bank" && account.active);
    const category = categories.find((row: { name: string }) => row.name === "Despesas operacionais");
    const created = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description, direction: "expense", amount_cents: 2250,
        account_id: bank.id, category_id: category.id,
        due_date: dates.end, competence_date: dates.end, document: `OFX-${description}`,
      }),
    });
    if (!created.ok) throw new Error(await created.text());
    return (await created.json()).id as number;
  }, `OFX E2E ${suffix}`);
  const dashboard = await page.evaluate(async () => (await (await fetch("/api/finance/dashboard")).json()).end as string);
  const fitid = `FITID-${suffix}`;
  const posted = dashboard.replaceAll("-", "");
  const ofxText = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>${posted}120000[-4:AMT]\n<TRNAMT>-22.50\n<FITID>${fitid}\n<NAME>OFX E2E\n<MEMO>Conciliação de teste\n</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  await navigate(page, "Conciliação Bancária");
  await expect(page.getByRole("heading", { name: "Conciliação Bancária", exact: true })).toBeVisible();
  const bankId = await page.evaluate(async () => {
    const rows = await (await fetch("/api/accounts")).json();
    return rows.find((row: { kind: string; active: boolean }) => row.kind === "bank" && row.active).id as number;
  });
  await page.getByLabel("Conta bancária *", { exact: true }).selectOption(String(bankId));
  await page.locator('input[type="file"]').setInputFiles({
    name: "extrato-e2e.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.from(ofxText),
  });
  await expect(page.getByText("extrato-e2e.ofx", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Revisar / confirmar", exact: true }).click();
  await page.getByLabel("Título pendente sugerido", { exact: true }).selectOption(String(titleId));
  await page.getByRole("button", { name: "Confirmar conciliação", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Conciliado", exact: true })).toBeVisible();
  await waitForMobileMenuToClose(page);
  await page.screenshot({ path: `../docs/evidence/sprint9-13/ofx-${info.project.name}.png`, fullPage: true });
  await noOverflow(page);

  await navigate(page, "Relatórios Financeiros");
  await expect(page.getByRole("heading", { name: "Relatórios Financeiros", exact: true })).toBeVisible();
  await expect(page.getByText(/26 relatórios do financeiro/)).toBeVisible();
  await waitForMobileMenuToClose(page);
  await page.screenshot({ path: `../docs/evidence/sprint9-13/reports-${info.project.name}.png`, fullPage: true });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("Sprint 8: cadastros, livro caixa, filtros aplicados e estorno", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const suffix = `${info.project.name}-${Date.now()}`,
    account = `Banco S8 ${suffix}`,
    category = `Categoria S8 ${suffix}`,
    sub = `Sub S8 ${suffix}`,
    supplier = `Fornecedor S8 ${suffix}`,
    description = `Despesa S8 ${suffix}`;
  await navigate(page, "Cadastro de Contas");
  await page.getByRole("button", { name: "Nova conta", exact: true }).click();
  await page.getByLabel("Nome *", { exact: true }).fill(account);
  await page
    .getByLabel("Saldo inicial (R$) *", { exact: true })
    .fill("1000,00");
  await page.getByLabel("Banco", { exact: true }).fill("Banco fictício");
  await page.getByLabel("Juros por mês (%)").fill("1,50");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: account }),
  ).toContainText("R$ 1.000,00");
  await navigate(page, "Fornecedores");
  await page
    .getByRole("button", { name: "Novo fornecedor", exact: true })
    .click();
  await page.getByLabel("Nome *", { exact: true }).fill(supplier);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("fornecedor@example.test");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(supplier, { exact: true })).toBeVisible();
  await navigate(page, "Categorias");
  await page
    .getByRole("button", { name: "Nova categoria", exact: true })
    .click();
  await page.getByLabel("Nome *", { exact: true }).fill(category);
  await page.getByLabel("Tipo", { exact: true }).selectOption("expense");
  await page
    .getByLabel("Classificação", { exact: true })
    .selectOption("investment");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(category, { exact: true })).toBeVisible();
  await navigate(page, "SubCategorias");
  await page
    .getByRole("button", { name: "Nova subcategoria", exact: true })
    .click();
  await page.getByLabel("Nome *", { exact: true }).fill(sub);
  await page
    .getByLabel("Categoria *", { exact: true })
    .selectOption({ label: category });
  await page
    .getByLabel("Incide no resultado", { exact: true })
    .selectOption("false");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: sub })).toContainText(
    "Não incide no resultado",
  );
  await navigate(page, "Lançamento (Despesa/Receita)");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByLabel("Histórico *", { exact: true }).fill(description);
  await page.getByLabel("Valor (R$) *", { exact: true }).fill("21,35");
  await page
    .getByLabel("Conta *", { exact: true })
    .selectOption({ label: account });
  await page
    .getByLabel("Subcategoria *", { exact: true })
    .selectOption({ label: `${category} / ${sub}` });
  await page
    .getByLabel("Nº documento", { exact: true })
    .fill("DOC-E2E-" + suffix);
  await page.getByLabel("Pesquisar fornecedor", { exact: true }).fill(supplier);
  await page
    .getByLabel("Fornecedor", { exact: true })
    .selectOption({ label: supplier });
  await page
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: description });
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: new RegExp(account) }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(account) }),
  ).toContainText("R$ 978,65");
  await expect(
    page.locator(".ledger-summary").getByText("R$ 21,35", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Pesquisar histórico ou documento", { exact: true })
    .fill("texto que não existe");
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect(
    page.getByText("Nenhum lançamento no período/filtro escolhido."),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/evidence/sprint8/livro-caixa-vazio-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Busca", { exact: true }).selectOption("document");
  await page
    .getByLabel("Pesquisar histórico ou documento", { exact: true })
    .fill("DOC-E2E-" + suffix);
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect(row).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("livro-caixa.csv");
  await noOverflow(page);
  await page.screenshot({
    path: `../docs/evidence/sprint8/livro-caixa-${info.project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole("button", { name: "Imprimir", exact: true }).click();
  await expect(page.locator(".ledger-print")).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".ledger-print")).toBeVisible();
  await expect(page.locator(".ledger-filters")).toBeHidden();
  await expect(page.locator(".topbar")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await row.getByRole("button", { name: "Estornar", exact: true }).click();
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Correção de demonstração");
  await page
    .getByRole("button", { name: "Confirmar estorno", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp(account) }),
  ).toContainText("R$ 1.000,00");
  await expect(
    page.locator(".ledger-summary").getByText("R$ 0,00", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Cadastro de Contas");
  await page
    .getByRole("button", { name: `Editar ${account}`, exact: true })
    .click();
  await page
    .getByLabel("Situação", { exact: true })
    .last()
    .selectOption("false");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: account }),
  ).toContainText("Inativo");
  for (const [name, heading] of [
    ["Dashboard", "Dashboard financeiro"],
    ["Conciliação Bancária", "Conciliação Bancária"],
    ["Relatórios Financeiros", "Relatórios Financeiros"],
    ["Contas a Pagar", "Contas a Pagar"],
  ]) {
    await navigate(page, name);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});
