import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Credentials below belong only to the disposable, fictitious demonstration fixture.
async function login(page: Page, username = "demo.admin") {
  await page.goto("/app#finance-reconcile");
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill("DemoLocal#2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}
async function openStatement(page: Page) {
  await login(page);
  const row = page
    .getByRole("row")
    .filter({ hasText: "Extrato ilustrativo SB053A.ofx" });
  await row.getByRole("button", { name: "Revisar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Extrato ilustrativo SB053A.ofx",
      exact: true,
    }),
  ).toBeVisible();
  return page.locator(".reconciliation-statement");
}
function ofx(date: string, rows: [string, number, string][]) {
  return Buffer.from(
    "OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>" +
      rows
        .map(
          ([id, cents, name]) =>
            `<STMTTRN>\n<TRNTYPE>${cents > 0 ? "CREDIT" : "DEBIT"}\n<DTPOSTED>${date.replaceAll("-", "")}120000[-4:AMT]\n<TRNAMT>${(cents / 100).toFixed(2)}\n<FITID>${id}\n<NAME>${name}\n</STMTTRN>`,
        )
        .join("\n") +
      "</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>",
  );
}

test("states, five columns, complete monetary values, dates and keyboard scroll", async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  const section = await openStatement(page);
  await expect(section.locator("thead th")).toHaveText([
    "Data",
    "FITID / histórico",
    "Valor",
    "Situação",
    "Vínculo / ação",
  ]);
  await expect(section.locator("tbody tr")).toHaveCount(7);
  for (const state of ["Conciliado", "Lançado", "Ignorado", "Pendente"])
    await expect(
      section.getByText(state, { exact: true }).first(),
    ).toBeVisible();
  await expect(section.getByText(/Duplicado #/)).toBeVisible();
  const metrics = await section.locator("td.numeric").evaluateAll((nodes) =>
    nodes.map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        text: el.textContent,
        lines: range.getClientRects().length,
        width: el.clientWidth,
        scroll: el.scrollWidth,
        overflow: getComputedStyle(el).textOverflow,
      };
    }),
  );
  expect(metrics.map((m) => m.text?.replaceAll("\u00a0", " "))).toEqual([
    "-R$ 100,00",
    "R$ 12,34",
    "-R$ 3,50",
    "-R$ 25,00",
    "R$ 1.234.567,89",
    "-R$ 1.234.567,89",
    "R$ 0,01",
  ]);
  for (const m of metrics) {
    expect(m.lines).toBe(1);
    expect(m.scroll).toBeLessThanOrEqual(m.width + 1);
    expect(m.overflow).not.toBe("ellipsis");
  }
  for (const date of await section
    .locator("tbody tr td:first-child")
    .allTextContents())
    expect(date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  const wrap = section.locator(".table-wrap");
  await page.keyboard.press("Tab");
  await wrap.focus();
  await expect(wrap).toBeFocused();
  expect(await wrap.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );
  const overflow = await wrap.evaluate(
    (el) => el.scrollWidth > el.clientWidth + 1,
  );
  if (overflow) {
    await expect(section.locator(".ledger-scroll-hint")).toBeVisible();
    await page.keyboard.press("End");
    for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => wrap.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
  }
  await wrap.locator("th").last().scrollIntoViewIfNeeded();
  const last = await wrap.locator("th").last().boundingBox(),
    bounds = await wrap.boundingBox();
  expect(last!.x + last!.width).toBeLessThanOrEqual(
    bounds!.x + bounds!.width + 2,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(requests.filter((u) => u.includes("/finance/dashboard"))).toEqual([]);
  expect(errors).toEqual([]);
});

test("existing dialogs, field focus, validation and state text remain accessible", async ({
  page,
}) => {
  const section = await openStatement(page);
  await section
    .getByRole("row")
    .filter({ hasText: "Entrada sintética elevada" })
    .getByRole("button", { name: "Revisar / confirmar", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".modal-content > p strong")).toContainText(
    "1.234.567,89",
  );
  await page
    .getByRole("button", { name: "Confirmar conciliação", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Selecione um título pendente",
  );
  await expect(
    dialog.getByRole("button", { name: "Ignorar esta linha", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Criar lançamento", exact: true })
    .click();
  await expect(dialog.getByLabel("Categoria *", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Cliente", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await dialog.getByLabel("Categoria *", { exact: true }).focus();
  expect(
    await dialog
      .getByLabel("Categoria *", { exact: true })
      .evaluate((e) => getComputedStyle(e).outlineStyle),
  ).toBe("solid");
  await expect
    .poll(() =>
      dialog.locator(".tabs button.selected").evaluate((e) => ({
        color: getComputedStyle(e).color,
        bg: getComputedStyle(e).backgroundColor,
      })),
    )
    .toEqual({ color: "rgb(255, 255, 255)", bg: "rgb(16, 45, 92)" });
  await dialog.evaluate((root) => {
    const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")];
    const sizes = nodes.map((e) => parseFloat(getComputedStyle(e).fontSize));
    nodes.forEach((e, i) => {
      (e as HTMLElement).style.fontSize = `${sizes[i] * 2}px`;
    });
  });
  const enlarged = await dialog
    .locator(".modal-content")
    .evaluate((content) => {
      const value = content.querySelector("p strong")!;
      const range = document.createRange();
      range.selectNodeContents(value);
      return {
        client: content.clientWidth,
        scroll: content.scrollWidth,
        lines: range.getClientRects().length,
        text: value.textContent,
      };
    });
  expect(enlarged.scroll).toBeLessThanOrEqual(enlarged.client + 1);
  expect(enlarged.lines).toBe(1);
  expect(enlarged.text).toContain("1.234.567,89");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("200 percent text and zoom retain money and contain table overflow", async ({
  page,
}) => {
  const section = await openStatement(page),
    viewport = page.viewportSize()!;
  const check = async (checkDocument = true) => {
    const result = await section.evaluate((root) => ({
      client: root.clientWidth,
      scroll: root.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: innerWidth,
      values: [...root.querySelectorAll("td.numeric")].map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return {
          lines: range.getClientRects().length,
          client: el.clientWidth,
          scroll: el.scrollWidth,
        };
      }),
    }));
    expect(result.scroll).toBeLessThanOrEqual(result.client + 1);
    if (checkDocument)
      expect(result.document).toBeLessThanOrEqual(result.viewport + 1);
    for (const value of result.values) {
      expect(value.lines).toBe(1);
      expect(value.scroll).toBeLessThanOrEqual(value.client + 1);
    }
  };
  await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        ".silex-reconciliation, .silex-reconciliation *",
      ),
    ].filter((e) => e.getClientRects().length);
    const sizes = nodes.map((e) => parseFloat(getComputedStyle(e).fontSize));
    nodes.forEach((e, i) => (e.style.fontSize = `${sizes[i] * 2}px`));
  });
  await check();
  await page.reload();
  await expect(section.locator("td.numeric")).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: "Extrato ilustrativo SB053A.ofx" })
    .getByRole("button", { name: "Revisar", exact: true })
    .click();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await check(false);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  });
  await page.setViewportSize({
    width: Math.floor(viewport.width / 2),
    height: viewport.height,
  });
  await check(viewport.width !== 375); // R02: preexisting shell overflow at 187 CSS pixels is reported separately.
});

test("upload errors, bank selection and history pagination retain behavior", async ({
  page,
}) => {
  await login(page);
  const file = page.getByLabel("Arquivo OFX *", { exact: true });
  await file.setInputFiles({
    name: "invalid.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Selecione a conta bancária",
  );
  const bank = (await (await page.request.get("/api/accounts")).json()).find(
    (a: any) => a.active && a.kind === "bank",
  );
  await page
    .getByLabel("Conta bancária *", { exact: true })
    .selectOption(String(bank.id));
  await file.setInputFiles({
    name: "too-large.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("OFX deve ter até 10 MB");
  await file.setInputFiles({
    name: "invalid.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).not.toContainText("Selecione a conta");
  await expect(page.getByRole("alert")).not.toContainText("10 MB");
  const next = page.getByRole("button", {
    name: "Próxima página",
    exact: true,
  });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(
    page.getByRole("row").filter({ hasText: "historico-ilustrativo-00.ofx" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Página anterior", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Extrato ilustrativo SB053A.ofx" }),
  ).toBeVisible();
});

test("empty history retains five headers and the existing empty-state message", async ({
  page,
}) => {
  // Frontend presentation only: intercept this one query, without changing any database.
  // Browser fetch stub avoids network interception unsupported by the installed Firefox protocol.
  await page.addInitScript(() => {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        location.origin,
      );
      if (
        url.pathname === "/api/finance/ofx/imports" &&
        (!init?.method || init.method === "GET")
      )
        return Promise.resolve(
          new Response(
            JSON.stringify({ items: [], total: 0, page: 1, page_size: 50 }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      return fetchOriginal(input, init);
    };
  });
  await login(page);
  const history = page.locator(".reconciliation-history");
  await expect(history.locator("thead th")).toHaveText([
    "Arquivo / conta",
    "Situação",
    "Transações",
    "Pendentes / duplicadas",
    "Ação",
  ]);
  await expect(
    history.getByText("Nenhum registro encontrado", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: "Revisar", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("anonymous and operator cannot use reconciliation endpoints or direct route", async ({
  page,
}) => {
  expect((await page.request.get("/api/finance/ofx/imports")).status()).toBe(
    401,
  );
  await login(page, "demo.operador");
  await expect(
    page.getByRole("heading", { name: "Conciliação Bancária", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Menu principal" })
      .getByRole("button", { name: "Conciliação Bancária", exact: true }),
  ).toHaveCount(0);
  for (const path of [
    "/api/finance/ofx/imports",
    "/api/finance/ofx/imports/52",
    "/api/finance/ofx/imports/52/items/52/suggestions",
  ])
    expect((await page.request.get(path)).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/finance/ofx/imports?account_id=2", {
        data: "invalid",
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/finance/ofx/imports/52/items/52/confirm", {
        data: { ignore: true, reason: "Teste isolado" },
      })
    ).status(),
  ).toBe(403);
});

test("functional comparison: import, match, create, ignore, duplicate and cents are preserved", async ({
  page,
}, info) => {
  await login(page);
  const accounts = await (await page.request.get("/api/accounts")).json(),
    bank = accounts.find((a: any) => a.active && a.kind === "bank");
  const categories = await (await page.request.get("/api/categories")).json(),
    subs = await (await page.request.get("/api/subcategories")).json();
  const expense = categories.find(
      (c: any) => c.name === "Despesas operacionais",
    ),
    income = categories.find((c: any) => c.name === "Outras receitas");
  const expenseSub = subs.find((s: any) => s.category_id === expense.id),
    incomeSub = subs.find((s: any) => s.category_id === income.id);
  const date = (await (await page.request.get("/api/finance/dashboard")).json())
    .end;
  const prefix = `SB053A-FUNCTIONAL-${info.project.name}`;
  const created = await page.request.post("/api/finance", {
    data: {
      description: prefix,
      direction: "expense",
      amount_cents: 2200,
      account_id: bank.id,
      category_id: expense.id,
      due_date: date,
    },
  });
  expect(created.status()).toBe(201);
  const title = await created.json();
  const rows: [string, number, string][] = [
    [prefix + "-match", -2250, prefix],
    [prefix + "-income", 1234, "Receita ilustrativa " + prefix],
    [prefix + "-expense", -350, "Despesa ilustrativa " + prefix],
    [prefix + "-ignore", -1, "Linha ilustrativa " + prefix],
  ];
  await page
    .getByLabel("Conta bancária *", { exact: true })
    .selectOption(String(bank.id));
  const upload = page.waitForResponse(
    (r) =>
      r.url().includes("/api/finance/ofx/imports?") &&
      r.request().method() === "POST",
  );
  await page.getByLabel("Arquivo OFX *", { exact: true }).setInputFiles({
    name: prefix + ".ofx",
    mimeType: "application/x-ofx",
    buffer: ofx(date, rows),
  });
  const response = await upload;
  expect(response.status()).toBe(201);
  const imported = await response.json();
  const result: any = {
    upload: response.status(),
    initialPending: imported.pending,
    requests: [],
    resolutionStatuses: [],
    date,
  };
  const table = page.locator("section").filter({
    has: page.getByRole("heading", { name: prefix + ".ofx", exact: true }),
  });
  for (let n = 0; n < 4; n++) {
    await table
      .getByRole("row")
      .filter({ hasText: rows[n][0] })
      .getByRole("button", { name: "Revisar / confirmar", exact: true })
      .click();
    let body: any;
    if (n === 0) {
      await page
        .getByLabel("Título pendente sugerido", { exact: true })
        .selectOption(String(title.id));
      for (const [label, value] of [
        ["Principal (R$)", "22,00"],
        ["Juros (R$)", "1,00"],
        ["Multa (R$)", "0,50"],
        ["Desconto (R$)", "1,00"],
      ])
        await page.getByLabel(label, { exact: true }).fill(value);
      body = {
        entry_id: title.id,
        principal_cents: 2200,
        interest_cents: 100,
        fine_cents: 50,
        discount_cents: 100,
      };
    } else if (n < 3) {
      await page
        .getByRole("button", { name: "Criar lançamento", exact: true })
        .click();
      await page
        .getByLabel("Categoria *", { exact: true })
        .selectOption(String(n === 1 ? income.id : expense.id));
      await page
        .getByLabel("Subcategoria *", { exact: true })
        .selectOption(String(n === 1 ? incomeSub.id : expenseSub.id));
      body = {
        create_title: true,
        category_id: n === 1 ? income.id : expense.id,
        subcategory_id: n === 1 ? incomeSub.id : expenseSub.id,
        [n === 1 ? "customer_id" : "supplier_id"]: null,
      };
    } else {
      await page
        .getByLabel("Motivo para ignorar a linha", { exact: true })
        .fill("Movimento fictício ignorado");
      body = { ignore: true, reason: "Movimento fictício ignorado" };
    }
    const confirmation = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/items/${imported.items[n].id}/confirm`) &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", {
        name: n === 3 ? "Ignorar esta linha" : "Confirmar conciliação",
        exact: true,
      })
      .click();
    const resolved = await confirmation;
    expect(resolved.status()).toBe(200);
    expect(resolved.request().postDataJSON()).toEqual(body);
    result.requests.push(body);
    result.resolutionStatuses.push(
      (await resolved.json()).items.map((i: any) => i.status),
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      table.getByRole("row").filter({ hasText: rows[n][0] }),
    ).toContainText(n === 0 ? "Conciliado" : n < 3 ? "Lançado" : "Ignorado");
  }
  const detail = await (
    await page.request.get(`/api/finance/ofx/imports/${imported.id}`)
  ).json();
  expect(detail.pending).toBe(0);
  expect(detail.status).toBe("complete");
  result.final = {
    status: detail.status,
    pending: detail.pending,
    amounts: detail.items.map((i: any) => i.amount_cents),
    dates: detail.items.map((i: any) => i.posted_date),
  };
  const balances = await (await page.request.get("/api/accounts")).json();
  result.balanceDelta =
    balances.find((a: any) => a.id === bank.id).balance_cents -
    bank.balance_cents;
  expect(result.balanceDelta).toBe(-1366);
  const titleAfter = (
    await (
      await page.request.get(
        `/api/finance?q=${encodeURIComponent(prefix)}&page_size=100`,
      )
    ).json()
  ).items.find((i: any) => i.id === title.id);
  expect(titleAfter.status).toBe("paid");
  expect(titleAfter.remaining_cents).toBe(0);
  result.title = {
    status: titleAfter.status,
    amount_cents: titleAfter.amount_cents,
    remaining_cents: titleAfter.remaining_cents,
  };
  const replay = await page.request.post(
    `/api/finance/ofx/imports/${imported.id}/items/${imported.items[0].id}/confirm`,
    { data: result.requests[0] },
  );
  expect(replay.status()).toBe(200);
  result.replayStatus = replay.status();
  const duplicate = await page.request.post(
    `/api/finance/ofx/imports?account_id=${bank.id}`,
    {
      data: ofx(date, rows),
      headers: {
        "Content-Type": "application/x-ofx",
        "X-Statement-Name": "duplicado-ilustrativo.ofx",
      },
    },
  );
  expect(duplicate.status()).toBe(201);
  const dup = await duplicate.json();
  expect(dup.duplicates).toBe(4);
  result.duplicate = {
    duplicates: dup.duplicates,
    pending: dup.pending,
    states: dup.items.map((i: any) => i.status),
  };
  const reject = await page.request.post(
    `/api/finance/ofx/imports/${dup.id}/items/${dup.items[0].id}/confirm`,
    { data: result.requests[0] },
  );
  expect(reject.ok()).toBe(false);
  result.duplicateRejected = reject.status();
  const afterReplay = await (await page.request.get("/api/accounts")).json();
  expect(afterReplay.find((a: any) => a.id === bank.id).balance_cents).toBe(
    balances.find((a: any) => a.id === bank.id).balance_cents,
  );
  if (process.env.SILEX_COMPARISON_DIR) {
    mkdirSync(process.env.SILEX_COMPARISON_DIR, { recursive: true });
    writeFileSync(
      join(
        process.env.SILEX_COMPARISON_DIR,
        `${process.env.SILEX_VARIANT}-${info.project.name}.json`,
      ),
      JSON.stringify(result, null, 2),
    );
  }
});
