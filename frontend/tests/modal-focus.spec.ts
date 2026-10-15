import { test, expect, type Page, type Locator } from "@playwright/test";
const origin = process.env.SILEX_MODAL_ORIGIN || "http://127.0.0.1:18564";
export async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 300; index++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press("Tab");
  }
  throw new Error(
    "Controle não alcançado por Tab: " + (await target.textContent()),
  );
}
async function open(page: Page, mode = "normal") {
  await page.goto(origin + "/tests/fixtures/modal-focus.html?mode=" + mode);
  const opener = page.getByRole("button", {
    name: "Abrir diálogo",
    exact: true,
  });
  await tabTo(page, opener);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Diálogo de teste", exact: true }),
  ).toBeVisible();
  return opener;
}
async function activate(page: Page, name: string) {
  await tabTo(page, page.getByRole("button", { name, exact: true }));
  await page.keyboard.press("Enter");
}
for (const mode of ["normal", "autofocus"]) {
  test(`componente: foco inicial ${mode}, Tab/Shift+Tab e fundo modal inerte`, async ({
    page,
  }) => {
    const opener = await open(page, mode);
    // Existing native dialog behavior: safe close action, also with React autoFocus hints.
    await expect(
      page.getByRole("button", { name: "Fechar janela" }),
    ).toBeFocused();
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press(key);
        expect(
          await page
            .locator("dialog")
            .evaluate((e) => e.contains(document.activeElement)),
        ).toBe(true);
        expect(
          await page.evaluate(() =>
            document.activeElement?.matches(":disabled, [hidden]"),
          ),
        ).toBe(false);
      }
    }
    // A real pointer click on the inert background cannot activate its action.
    await page.locator("main > button").nth(1).click({ force: true });
    await expect(opener).toHaveCount(1);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  });
}
for (const method of ["Escape", "Fechar janela", "Voltar", "Confirmar"]) {
  test(`componente: fechamento por ${method} retorna ao acionador`, async ({
    page,
  }) => {
    const opener = await open(page);
    if (method === "Escape") await page.keyboard.press("Escape");
    else await activate(page, method);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
for (const mode of [
  "async",
  "removed",
  "disabled",
  "hidden",
  "route",
  "late-removed",
  "late-disabled",
  "late-hidden",
]) {
  test(`componente: confirmação ${mode} preserva destino acessível`, async ({
    page,
  }) => {
    const opener = await open(page, mode);
    await activate(page, "Confirmar");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const target =
      mode === "async"
        ? opener
        : mode === "route"
          ? page.getByRole("heading", { name: "Novo destino" })
          : page.getByRole("main");
    await expect(target).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement !== document.body),
    ).toBe(true);
  });
}
test("componente: rota muda durante desmontagem sem roubar foco do novo destino", async ({
  page,
}) => {
  await open(page);
  await tabTo(
    page,
    page.getByRole("link", { name: "Navegar para outro destino" }),
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Novo destino" }),
  ).toBeFocused();
});
test("componente: diálogo sobre outro diálogo preserva topo modal e acionadores", async ({
  page,
}) => {
  const opener = await open(page);
  const nested = page.getByRole("button", { name: "Abrir segundo diálogo" });
  await activate(page, "Abrir segundo diálogo");
  await expect(
    page.getByRole("dialog", { name: "Segundo diálogo", exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog", { name: "Segundo diálogo", exact: true })
        .evaluate((e) => e.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(nested).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("componente: seguir o fluxo encerra acompanhamento sem roubar foco", async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press("Escape");
  await tabTo(
    page,
    page.getByRole("button", { name: "Próxima ação", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Abrir diálogo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Próxima ação", exact: true }),
  ).toBeFocused();
});
