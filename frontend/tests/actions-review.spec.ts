import { test, expect, type Page } from "./integrationTest";
import { localDate } from "../src/format";

async function login(page: Page) {
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: {
          username: "demo.admin",
          password: "DemoLocal#2026", // Disposable fixture only.
        },
      })
    ).ok(),
  ).toBe(true);
}
function gate() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release: () => release() };
}

test("payment reversal catches HTTP failure, prevents duplicate requests and preserves the payment", async ({
  page,
}) => {
  await login(page);
  const accounts = await (await page.request.get("/api/accounts")).json();
  const bank = accounts.find(
    (account: any) => account.kind === "bank" && account.active,
  );
  const categories = await (await page.request.get("/api/categories")).json();
  const category = categories.find(
    (item: any) => item.name === "Outras receitas",
  );
  const response = await page.request.post("/api/finance", {
    data: {
      description: "Recebimento fictício da revisão",
      direction: "income",
      amount_cents: 12345,
      account_id: bank.id,
      category_id: category.id,
      due_date: localDate(),
    },
  });
  expect(response.ok()).toBe(true);
  const entry = await response.json();
  const settled = await page.request.post(`/api/finance/${entry.id}/settle`, {
    data: {
      method: "pix",
      account_id: bank.id,
      request_key: `system-review-payment-${entry.id}`,
    },
  });
  expect(settled.ok(), await settled.text()).toBe(true);
  const paid = await settled.json(),
    payment = paid.payments[0];
  await page.goto("/app#finance-receivable");
  await page
    .getByRole("textbox", { name: "Busca", exact: true })
    .fill(entry.description);
  await page
    .getByRole("row")
    .filter({ hasText: entry.description })
    .getByRole("button", { name: "Baixas (1)" })
    .click();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const hold = gate();
  let calls = 0;
  const pattern = `**/api/finance/payments/${payment.id}/reverse`;
  await page.route(pattern, async (route) => {
    calls++;
    await hold.pending;
    await route.fulfill({
      status: 503,
      json: { detail: "Estorno indisponível. Tente novamente." },
    });
  });
  await page.getByLabel("Motivo de estorno").fill("Ajuste fictício autorizado");
  await page
    .getByRole("button", { name: "Estornar baixa", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => calls).toBe(1);
  await expect(
    page.getByRole("button", { name: "Estornando…" }),
  ).toBeDisabled();
  hold.release();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Estorno indisponível",
  );
  expect(
    (
      await (
        await page.request.get(
          `/api/finance?q=${encodeURIComponent(entry.description)}`,
        )
      ).json()
    ).items[0].payments,
  ).toEqual(paid.payments);
  await page.unroute(pattern);
  await page
    .getByRole("button", { name: "Estornar baixa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const updated = (
    await (
      await page.request.get(
        `/api/finance?q=${encodeURIComponent(entry.description)}`,
      )
    ).json()
  ).items[0];
  expect(updated.status).toBe("open");
  expect(updated.remaining_cents).toBe(12345);
  expect(
    updated.payments.filter((item: any) => item.reversal_of === payment.id),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("budget deactivation catches failure and changes data only after successful retry", async ({
  page,
}) => {
  await login(page);
  const categories = await (await page.request.get("/api/categories")).json();
  const category = categories.find(
    (item: any) => item.name === "Despesas operacionais",
  );
  const today = new Date();
  const response = await page.request.post("/api/finance/budgets", {
    data: {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      category_id: category.id,
      target_cents: 98765,
    },
  });
  expect(response.ok()).toBe(true);
  const budget = await response.json();
  await page.goto("/app#finance-reports");
  const section = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Orçamento mensal por categoria",
      exact: true,
    }),
  });
  const row = section.getByRole("row").filter({ hasText: category.name });
  await expect(row).toBeVisible();
  const hold = gate();
  let calls = 0;
  const pattern = `**/api/finance/budgets/${budget.id}`;
  await page.route(pattern, async (route) => {
    calls++;
    await hold.pending;
    await route.fulfill({
      status: 500,
      json: { detail: "Não foi possível desativar a meta." },
    });
  });
  await row
    .getByRole("button", { name: "Desativar", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => calls).toBe(1);
  await expect(
    row.getByRole("button", { name: "Desativando…" }),
  ).toBeDisabled();
  hold.release();
  await expect(section.getByRole("alert")).toContainText("desativar a meta");
  const url = `/api/finance/budgets?year=${today.getFullYear()}&month=${today.getMonth() + 1}`;
  expect(
    (await (await page.request.get(url)).json()).some(
      (item: any) => item.id === budget.id,
    ),
  ).toBe(true);
  await page.unroute(pattern);
  await row.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(
    (await (await page.request.get(url)).json()).some(
      (item: any) => item.id === budget.id,
    ),
  ).toBe(false);
});

test("company query failure is not perpetual loading and can be retried", async ({
  page,
}) => {
  await login(page);
  // Fail the page and shell queries independently of React effect ordering.
  const pattern = "**/api/company-settings";
  await page.route(pattern, (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "Identificação indisponível." },
    }),
  );
  await page.goto("/app#company-settings");
  await expect(page.getByRole("alert")).toContainText(
    "Identificação indisponível",
  );
  await expect(
    page.getByText("Carregando identificação da empresa…"),
  ).toHaveCount(0);
  await page.unroute(pattern);
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Empresa e identidade", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome de apresentação *")).toBeVisible();
});
