import { dateField, enterDate, expectDate } from "./dateHelpers";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const modules = [
  {
    route: "finance-payable",
    direction: "expense",
    title: "Contas a Pagar",
    add: "Nova despesa",
  },
  {
    route: "finance-receivable",
    direction: "income",
    title: "Contas a Receber",
    add: "Nova receita",
  },
];
async function start(page: Page, route: string, title: string) {
  await page.goto(`/app#${route}`);
  await page.getByLabel("Usuário", { exact: true }).fill("demo.admin");
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tudo", exact: true }).click();
  await page.waitForLoadState("networkidle");
}
async function overflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function search(page: Page, text: string) {
  await page.getByLabel("Busca", { exact: true }).fill(text);
  await page.getByLabel("Busca", { exact: true }).press("Enter");
  await page.waitForLoadState("networkidle");
}
for (const m of modules) {
  test.describe(m.title, () => {
    test("summary amounts stay whole and visible at different widths and text sizes", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      const values = [
        "R$ 0,00",
        "R$ 2.797,00",
        "R$ 1.234.567,89",
        "R$ 1.618,00",
      ];
      const setValues = async () => {
        await page.evaluate((amounts) => {
          document
            .querySelectorAll<HTMLElement>(
              ".finance-summary-grid .summary-card strong",
            )
            .forEach((node, index) => {
              node.textContent = amounts[index];
            });
        }, values);
      };
      const assertWholeValues = async (checkPageWidth = true) => {
        const result = await page.evaluate(() => {
          const grid = document.querySelector<HTMLElement>(
            ".finance-summary-grid",
          )!;
          const amounts = [
            ...document.querySelectorAll<HTMLElement>(
              ".finance-summary-grid .summary-card strong",
            ),
          ].map((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return {
              lines: range.getClientRects().length,
              clientWidth: node.clientWidth,
              scrollWidth: node.scrollWidth,
              value: node.textContent,
            };
          });
          return {
            pageWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
            gridWidth: grid.clientWidth,
            gridScrollWidth: grid.scrollWidth,
            amounts,
          };
        });
        if (checkPageWidth)
          expect(result.pageWidth).toBeLessThanOrEqual(result.viewport + 1);
        expect(result.gridScrollWidth).toBeLessThanOrEqual(
          result.gridWidth + 1,
        );
        for (const amount of result.amounts) {
          expect(amount.lines, amount.value ?? "sem valor").toBe(1);
          expect(
            amount.scrollWidth,
            amount.value ?? "sem valor",
          ).toBeLessThanOrEqual(amount.clientWidth + 1);
        }
      };

      await setValues();
      await assertWholeValues();

      const viewport = page.viewportSize()!;
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await assertWholeValues();

      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
        document.querySelector<HTMLElement>(".silex-accounts")!.style.zoom =
          "2";
      });
      await assertWholeValues();

      await page.evaluate(() => {
        document.querySelector<HTMLElement>(".silex-accounts")!.style.zoom = "";
      });
      await page.setViewportSize({
        width: Math.floor(viewport.width / 2),
        height: Math.floor(viewport.height / 2),
      });
      // The 187 px CSS viewport emulates a 375 px screen at browser zoom 200%.
      // The shell has the same pre-existing overflow before and after this CSS change.
      await assertWholeValues(false);
    });

    test("P02 search focus and P06 creation hierarchy remain intact", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      const searchInput = page.getByLabel("Busca", { exact: true });
      await page.getByLabel("Buscar por").focus();
      await page.keyboard.press("Tab");
      await expect(searchInput).toBeFocused();
      const focus = await searchInput.evaluate((el) => {
        const style = getComputedStyle(el.parentElement!);
        return {
          width: parseFloat(style.outlineWidth),
          style: style.outlineStyle,
          offset: parseFloat(style.outlineOffset),
          color: style.outlineColor,
        };
      });
      expect(focus).toEqual({
        width: 2,
        style: "solid",
        offset: 3,
        color: "rgb(23, 105, 232)",
      });
      const createButton = page.getByRole("button", {
        name: m.add,
        exact: true,
      });
      await expect(createButton).toHaveClass(
        m.direction === "expense" ? /accounts-new-expense/ : /primary/,
      );
      if (m.direction === "expense")
        await expect(createButton).not.toHaveClass(/danger|primary/);
      await overflow(page);
    });

    test("P02 visible keyboard focus, creation hierarchy, all columns and horizontal actions", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      const input = page.getByLabel("Busca", { exact: true });
      await page.getByLabel("Buscar por").focus();
      await page.keyboard.press("Tab");
      await expect(input).toBeFocused();
      const focus = await input.evaluate((el) => {
        const s = getComputedStyle(el.parentElement!);
        return {
          width: parseFloat(s.outlineWidth),
          style: s.outlineStyle,
          offset: parseFloat(s.outlineOffset),
          color: s.outlineColor,
          clipped: getComputedStyle(el.parentElement!.parentElement!).overflow,
        };
      });
      expect(focus).toMatchObject({
        width: 2,
        style: "solid",
        offset: 3,
        color: "rgb(23, 105, 232)",
      });
      expect(focus.clipped).not.toBe("hidden");
      await expect(
        page.getByRole("button", { name: m.add, exact: true }),
      ).toHaveClass(
        m.direction === "expense" ? /accounts-new-expense/ : /primary/,
      );
      if (m.direction === "expense")
        await expect(
          page.getByRole("button", { name: m.add, exact: true }),
        ).not.toHaveClass(/danger|primary/);
      for (const name of [
        "Hoje",
        "Semana",
        "Mês",
        "Mês anterior",
        "Ano",
        "Tudo",
        "Personalizado",
        "Todos",
        "Em aberto",
        "Parciais",
        "Baixados",
        "Vencidos",
        "Cancelados",
      ]) {
        const control = page.getByRole("button", { name, exact: true });
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeInViewport();
        const bounds = await control.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
          page.viewportSize()!.width + 1,
        );
      }
      await search(page, `Título ilustrativo SB052 ${m.direction} 26`);
      const table = page.locator(".finance-ledger .table-wrap");
      await expect(table.locator("thead th")).toHaveCount(7);
      await table.focus();
      const dims = await table.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
      }));
      if (dims.scroll > dims.client + 1) {
        await expect(
          page.locator(".finance-ledger .ledger-scroll-hint"),
        ).toBeVisible();
        await expect(table).toHaveAttribute("aria-describedby", /.+/);
        for (let n = 0; n < 10; n++) await page.keyboard.press("ArrowRight");
        await expect
          .poll(() => table.evaluate((el) => el.scrollLeft))
          .toBeGreaterThan(0);
        await table.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });
        await table.locator("th").last().scrollIntoViewIfNeeded();
        await expect(table.locator("th").last()).toBeInViewport();
      }
      // Segment controls change filter height. Bring the action into view before
      // checking it; reaching the table header does not guarantee its row is visible.
      await table.getByRole("button", { name: "Quitar", exact: true }).scrollIntoViewIfNeeded();
      await expect(
        table.getByRole("button", { name: "Quitar", exact: true }),
      ).toBeInViewport();
      await expect(
        table.getByRole("button", { name: "Cancelar", exact: true }),
      ).toHaveClass(/danger/);
      await overflow(page);
    });
    test("draft/applied filters, descending IDs, pagination, date intervals and states remain intact", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      const before = (
        await (
          await page.request.get(
            `/api/finance?direction=${m.direction}&page_size=100`,
          )
        ).json()
      ).items;
      expect(before.length).toBeGreaterThan(20);
      expect(before.map((x: { id: number }) => x.id)).toEqual(
        before
          .map((x: { id: number }) => x.id)
          .sort((a: number, b: number) => b - a),
      );
      await page
        .getByRole("button", { name: "Próxima página", exact: true })
        .click();
      await expect(page.locator(".pagination")).toContainText(
        `2 de ${Math.ceil(before.length / 20)}`,
      );
      await page.locator(".finance-table-heading select").selectOption("100");
      await expect(page.locator(".finance-ledger tbody tr")).toHaveCount(
        before.length,
      );
      await page
        .getByLabel("Busca", { exact: true })
        .fill(`SB052-${m.direction}-02`);
      await expect(page.locator(".finance-ledger tbody tr")).toHaveCount(
        before.length,
      );
      await page.getByLabel("Buscar por").selectOption("document");
      await page
        .getByRole("button", { name: "Pesquisar", exact: true })
        .click();
      await expect(page.locator(".finance-ledger tbody tr")).toHaveCount(1);
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Parcial",
      );
      await expect(
        page.locator(".finance-filter-grid select:disabled"),
      ).toBeDisabled();
      await expect(
        page.locator(".finance-filter-grid select:disabled"),
      ).toHaveValue(m.direction);
      await page.getByLabel("Busca", { exact: true }).fill("");
      await page.getByRole("button", { name: "Vencidos", exact: true }).click();
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Vencida",
      );
      await page.getByRole("button", { name: "Parciais", exact: true }).click();
      await expect(page.locator(".finance-ledger tbody tr")).toHaveCount(1);
      await page.getByRole("button", { name: "Baixados", exact: true }).click();
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Quitado",
      );
      await page
        .getByRole("button", { name: "Cancelados", exact: true })
        .click();
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Cancelado",
      );
      await page.getByRole("button", { name: "Todos", exact: true }).click();
      await page.getByLabel("Período por").selectOption("competence");
      await enterDate(page, "De", "2024-02-29");
      await enterDate(page, "Até", "2024-02-29");
      await page
        .getByRole("button", { name: "Pesquisar", exact: true })
        .click();
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Nenhum registro encontrado",
      );
      await enterDate(page, "De", "2026-12-31");
      await enterDate(page, "Até", "2026-01-01");
      await page
        .getByRole("button", { name: "Pesquisar", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "Data inicial deve ser anterior",
      );
      await overflow(page);
    });
    for (const locale of ["pt-BR", "en-US"]) {
      test(`P05 ISO constraints and Brazilian segments in ${locale}`, async ({
        browser,
        viewport,
      }) => {
        const context = await browser.newContext({ locale, viewport });
        const page = await context.newPage();
        await start(page, m.route, m.title);
        for (const [iso, display] of [
          ["2026-01-10", "10/01/2026"],
          ["2026-10-01", "01/10/2026"],
          ["2024-02-29", "29/02/2024"],
        ]) {
          await enterDate(page, "De", iso);
          await expectDate(page, "De", iso);
          expect((await dateField(page, "De").locator(".silex-date-input").innerText()).replace(/\s/g, "")).toBe(display);
        }
        await enterDate(page, "De", "");
        await expectDate(page, "De", "");
        await page.getByRole("button", { name: m.add, exact: true }).click();
        const dialog = page.getByRole("dialog");
        for (const label of ["Vencimento *", "Competência *"]) {
          await expect(dateField(dialog, label).locator('input[hidden]')).toHaveAttribute("required", "");
          await enterDate(dialog, label, "2024-02-29");
          await expectDate(dialog, label, "2024-02-29");
        }
        await enterDate(dialog, "Vencimento *", "");
        expect(await dateField(dialog, "Vencimento *").locator('input[hidden]').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
        await context.close();
      });
    }
    test("create, partial/full settlement, attachments, reversal and cancellation preserve cents and audit history", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      const name = `SB052 fluxo ${m.direction} ${Date.now()}`;
      await page.getByRole("button", { name: m.add, exact: true }).click();
      let dialog = page.getByRole("dialog");
      await dialog.getByLabel("Histórico *", { exact: true }).fill(name);
      await dialog
        .getByLabel("Valor de cada título (R$) *", { exact: true })
        .fill("100,00");
      const due = await dateField(dialog, "Vencimento *").locator('input[type="date"]').inputValue();
      if (m.direction === "expense") {
        await dialog
          .getByLabel("Beneficiário", { exact: true })
          .selectOption({ label: "Diarista Ilustrativo · Diarista" });
        await expect(
          dialog.getByLabel("Chave PIX", { exact: true }),
        ).toHaveValue("pix@example.test");
      } else {
        const clients = await (
          await page.request.get("/api/customers?active=true&page_size=100")
        ).json();
        await dialog
          .getByLabel("Cliente", { exact: true })
          .selectOption(String(clients.items[0].id));
      }
      const created = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/finance") && r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", { name: "Criar título", exact: true })
        .click();
      const response = await created;
      expect(response.status()).toBe(201);
      let entry = await response.json();
      expect(entry).toMatchObject({
        direction: m.direction,
        amount_cents: 10000,
        due_date: due,
        status: "open",
        paid_principal_cents: 0,
      });
      expect(response.request().postDataJSON()).toMatchObject({
        direction: m.direction,
        amount_cents: 10000,
        due_date: due,
        competence_date: due,
      });
      await search(page, name);
      await page
        .locator(".finance-ledger tbody")
        .getByRole("button", { name: "Quitar", exact: true })
        .click();
      dialog = page.getByRole("dialog");
      await dialog
        .getByLabel("Principal nesta baixa (R$) *", { exact: true })
        .fill("40,00");
      await dialog.getByLabel("Juros (R$)", { exact: true }).fill("2,00");
      await dialog.getByLabel("Multa (R$)", { exact: true }).fill("1,00");
      await dialog.getByLabel("Desconto (R$)", { exact: true }).fill("0,50");
      const partial = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/finance/${entry.id}/settle`) &&
          r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", {
          name: "Registrar pagamento parcial",
          exact: true,
        })
        .click();
      const paid = await partial;
      expect(paid.status()).toBe(200);
      entry = await paid.json();
      expect(paid.request().postDataJSON()).toMatchObject({
        principal_cents: 4000,
        interest_cents: 200,
        fine_cents: 100,
        discount_cents: 50,
      });
      expect(entry).toMatchObject({
        status: "partial",
        paid_principal_cents: 4000,
        remaining_cents: 6000,
      });
      expect(Math.abs(entry.payments[0].amount_cents)).toBe(4250);
      await page
        .locator(".finance-ledger tbody")
        .getByRole("button", { name: /Baixas \(/ })
        .click();
      dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Estornar baixa", exact: true }),
      ).toBeDisabled();
      await dialog
        .locator('input[type="file"]')
        .last()
        .setInputFiles({
          name: "comprovante-ilustrativo.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\nComprovante fictício SB052\n%%EOF"),
        });
      await expect(page.locator(".finance-ledger tbody")).toContainText(name);
      await expect(page.getByRole("dialog")).toHaveCount(0); // Existing done closes history after upload.
      await page
        .locator(".finance-ledger tbody")
        .getByRole("button", { name: /Baixas \(/ })
        .click();
      dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("link", { name: /comprovante-ilustrativo/ }),
      ).toBeVisible();
      await dialog
        .getByLabel("Motivo de estorno", { exact: true })
        .fill("Baixa ilustrativa duplicada");
      const reversal = page.waitForResponse(
        (r) => r.url().includes("/reverse") && r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", { name: "Estornar baixa", exact: true })
        .click();
      expect((await reversal).status()).toBe(200);
      let refreshed = (
        await (
          await page.request.get(`/api/finance?q=${encodeURIComponent(name)}`)
        ).json()
      ).items[0];
      expect(refreshed).toMatchObject({
        status: "open",
        paid_principal_cents: 0,
        remaining_cents: 10000,
      });
      expect(refreshed.payments).toHaveLength(2);
      await page
        .locator(".finance-ledger tbody")
        .getByRole("button", { name: "Quitar", exact: true })
        .click();
      dialog = page.getByRole("dialog");
      const full = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/finance/${entry.id}/settle`) &&
          r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", {
          name: "Confirmar quitação integral",
          exact: true,
        })
        .click();
      expect((await full).status()).toBe(200);
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Quitado",
      );
      await page
        .locator(".finance-ledger tbody")
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      dialog = page.getByRole("dialog");
      await dialog
        .getByLabel("Motivo *", { exact: true })
        .fill("Cancelamento de título ilustrativo");
      const cancel = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/finance/${entry.id}/cancel`) &&
          r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", { name: "Confirmar cancelamento", exact: true })
        .click();
      expect((await cancel).status()).toBe(200);
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Cancelado",
      );
      refreshed = (
        await (
          await page.request.get(`/api/finance?q=${encodeURIComponent(name)}`)
        ).json()
      ).items[0];
      expect(refreshed.status).toBe("canceled");
      expect(refreshed.payments.length).toBeGreaterThanOrEqual(4);
      await expect(
        page
          .locator(".finance-ledger tbody")
          .getByRole("button", { name: "Quitar", exact: true }),
      ).toHaveCount(0);
      await expect(
        page
          .locator(".finance-ledger tbody")
          .getByRole("button", { name: "Cancelar", exact: true }),
      ).toHaveCount(0);
      await overflow(page);
    });
    test("recurrence and form errors keep native validation and the existing title API", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      await page.getByRole("button", { name: m.add, exact: true }).click();
      const dialog = page.getByRole("dialog");
      const name = `SB052 série ${m.direction} ${Date.now()}`;
      await dialog.getByLabel("Histórico *", { exact: true }).fill(name);
      await dialog
        .getByLabel("Valor de cada título (R$) *", { exact: true })
        .fill("abc");
      await dialog
        .getByRole("button", { name: "Criar título", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await dialog
        .getByLabel("Valor de cada título (R$) *", { exact: true })
        .fill("12,34");
      await dialog
        .getByLabel("Quantidade de títulos *", { exact: true })
        .fill("2");
      await dialog
        .getByLabel("Frequência", { exact: true })
        .selectOption("monthly");
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/finance") && r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", { name: "Criar títulos recorrentes", exact: true })
        .click();
      const saved = await response;
      expect(saved.status()).toBe(201);
      expect(saved.request().postDataJSON()).toMatchObject({
        recurrence_count: 2,
        recurrence_frequency: "monthly",
        amount_cents: 1234,
      });
      const series = await saved.json();
      expect(series.items).toHaveLength(2);
      expect(
        series.items.every(
          (x: { direction: string; amount_cents: number }) =>
            x.direction === m.direction && x.amount_cents === 1234,
        ),
      ).toBe(true);
      await search(page, name);
      await expect(page.locator(".finance-ledger tbody tr")).toHaveCount(2);
      await expect(page.locator(".finance-ledger tbody")).toContainText(
        "Ocorrência 2/2",
      );
      await expect(page.locator(".summary-card").first()).toContainText(
        "24,68",
      );
      await overflow(page);
    });
    test("CSV and backend print retain applied filters and original templates", async ({
      page,
    }) => {
      await start(page, m.route, m.title);
      const fixture = `Título ilustrativo SB052 ${m.direction} 02`;
      await search(page, fixture);
      await page
        .getByLabel("Busca", { exact: true })
        .fill("draft não aplicado");
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Exportar CSV", exact: true })
        .click();
      const file = await (await download).path();
      expect(file).not.toBeNull();
      const csv = await readFile(file!, "utf8");
      expect(csv).toContain(fixture);
      expect(csv).not.toContain("draft não aplicado");
      const popup = page.waitForEvent("popup");
      await page.getByRole("button", { name: "Imprimir", exact: true }).click();
      const printed = await popup;
      await printed.waitForLoadState();
      await expect(
        printed.getByRole("heading", {
          name: "Gestão · Lançamentos financeiros",
          exact: true,
        }),
      ).toBeVisible();
      await expect(printed.locator("tbody tr")).toHaveCount(1);
      await expect(printed.locator("tbody")).toContainText(fixture);
      expect(new URL(printed.url()).searchParams.get("q")).toBe(fixture);
      expect(new URL(printed.url()).searchParams.get("direction")).toBe(
        m.direction,
      );
      await printed.close();
    });
  });
}
test("operator sees neither title screen nor shortcuts and backend denies financial reads and writes", async ({
  page,
}) => {
  await page.goto("/app#finance-payable");
  await page.getByLabel("Usuário", { exact: true }).fill("demo.operador");
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  await page.goto("/app#finance-receivable");
  await expect(page).toHaveURL(/\/app#dashboard$/);
  await expect(page.locator(".silex-accounts")).toHaveCount(0);
  expect((await page.request.get("/api/finance")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/finance", {
        data: {
          description: "Não criar",
          direction: "expense",
          amount_cents: 100,
          account_id: 1,
          category_id: 1,
          due_date: "2026-10-14",
        },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/app#home");
  await expect(
    page.getByRole("link", { name: /Contas a Pagar|Contas a Receber/ }),
  ).toHaveCount(0);
  await overflow(page);
});
