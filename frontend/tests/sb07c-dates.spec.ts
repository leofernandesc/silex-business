import { expect, test } from "@playwright/test";
import { dateField, enterDate, expectDate } from "./dateHelpers";

const fixture = "http://127.0.0.1:18086/tests/fixtures/date-controls.html";

for (const locale of ["pt-BR", "en-US", "de-DE"]) {
  for (const timezoneId of ["America/Manaus", "America/Sao_Paulo", "UTC"]) {
    test(`components: civil ISO and Brazilian presentation ${locale} ${timezoneId}`, async ({ browser }) => {
      const context = await browser.newContext({ locale, timezoneId });
      try {
        const page = await context.newPage(); await page.goto(fixture);
        await expectDate(page, "Data controlada", "2026-03-04");
        for (const iso of ["2026-04-03", "2024-02-29", "2026-12-31", "2027-01-01", "2026-02-01", "2026-02-28"]) {
          await enterDate(page, "Data controlada", iso);
          await expectDate(page, "Data controlada", iso);
          await expect(page.getByLabel("ISO Data controlada", { exact: true })).toHaveText(iso);
          await page.getByRole('button', { name: 'Enviar Data controlada', exact: true }).click();
          await expect(page.getByLabel('Envio Data controlada', { exact: true })).toHaveText(iso);
        }
      } finally { await context.close(); }
    });
  }
}
test("components: partial, impossible, empty, required, optional and limits", async ({ page }) => {
  await page.goto(fixture);
  const field = dateField(page, "Data controlada");
  await field.locator('[data-type="day"]').focus(); await page.keyboard.press("Backspace");
  await page.getByRole('button', { name: 'Enviar Data controlada', exact: true }).click();
  await expect(page.getByLabel('Envio Data controlada', { exact: true })).toHaveText('não enviado');
  await expect(page.getByLabel('ISO Data controlada', { exact: true })).toHaveText('2026-03-04');
  await expect(field).toContainText('O valor anterior foi mantido');
  await enterDate(page, "Data controlada", "2025-02-29");
  await page.getByRole('button', { name: 'Enviar Data controlada', exact: true }).click();
  await expect(page.getByLabel('Envio Data controlada', { exact: true })).toHaveText('não enviado');
  await expect(page.getByLabel('ISO Data controlada', { exact: true })).toHaveText('2026-03-04');
  await enterDate(page, 'Data controlada', '');
  await page.getByRole('button', { name: 'Enviar Data controlada', exact: true }).click();
  await expect(page.getByLabel('Envio Data controlada', { exact: true })).toHaveText('vazio');
  await page.getByRole('button', { name: 'Enviar Data obrigatória', exact: true }).click();
  await expect(page.getByLabel('Envio Data obrigatória', { exact: true })).toHaveText('não enviado');
  await enterDate(page, 'Data obrigatória', '2024-02-29');
  await page.getByRole('button', { name: 'Enviar Data obrigatória', exact: true }).click();
  await expect(page.getByLabel('Envio Data obrigatória', { exact: true })).toHaveText('2024-02-29');
  for (const invalid of ['2023-12-31', '2027-01-01']) {
    await enterDate(page, 'Data limitada', invalid);
    await page.getByRole('button', { name: 'Enviar Data limitada', exact: true }).click();
    await expect(page.getByLabel('Envio Data limitada', { exact: true })).toHaveText('não enviado');
  }
  for (const valid of ['2024-01-01', '2026-12-31']) {
    await enterDate(page, 'Data limitada', valid);
    await page.getByRole('button', { name: 'Enviar Data limitada', exact: true }).click();
    await expect(page.getByLabel('Envio Data limitada', { exact: true })).toHaveText(valid);
  }
});
test("components: controlled updates, fieldset disabled and read-only", async ({ page }) => {
  await page.goto(fixture);
  await page.getByRole('button', { name: 'Atualizar Data controlada', exact: true }).click();
  await expectDate(page, 'Data controlada', '2024-02-29');
  await page.getByRole('button', { name: 'Bloquear Data controlada', exact: true }).click();
  await expect(dateField(page, 'Data controlada').getByRole('button')).toBeDisabled();
  await expect(dateField(page, 'Data desabilitada').getByRole('button')).toBeDisabled();
  await expect(dateField(page, 'Data somente leitura').getByRole('button')).toBeDisabled();
});
for (const width of [1440, 768, 375, 320]) {
  test(`components: calendar in native Modal, keyboard and viewport ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto(fixture);
    const opener = page.getByRole('button', { name: 'Abrir modal', exact: true });
    await opener.focus(); await page.keyboard.press('Enter');
    const field = dateField(page, 'Data no modal');
    const trigger = field.getByRole('button');
    await trigger.focus(); await page.keyboard.press('Enter');
    const calendar = page.locator('.silex-date-popover');
    await expect(calendar).toBeVisible();
    expect(await calendar.evaluate(e => Boolean(e.closest('dialog:modal')))).toBe(true);
    const bounds = await calendar.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    const day = calendar.locator('[role="button"][data-selected]');
    await expect(day).toBeFocused(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    await expect(calendar).toHaveCount(0);
    await expectDate(page, 'Data no modal', '2026-03-05');
    await trigger.click(); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await page.getByRole('button', { name: 'Confirmar modal', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(opener).toBeFocused();
  });
}
test("components: monthly format, year editing, read-only and ISO contract", async ({ page }) => {
  await page.goto(fixture);
  await expect(page.getByLabel('Competência: mês', { exact: true })).toHaveValue('03');
  const year = page.getByLabel('Competência: ano', { exact: true });
  await expect(year).toHaveValue('2026');
  await page.getByLabel('Competência: mês', { exact: true }).selectOption('12');
  await year.fill('2300'); await year.press('Tab');
  await page.getByRole('button', { name: 'Enviar competência', exact: true }).click();
  await expect(page.getByLabel('Envio mensal', { exact: true })).toHaveText('2300-12');
  await year.fill(''); await page.getByRole('button', { name: 'Enviar competência', exact: true }).click();
  await expect(page.getByLabel('Envio mensal', { exact: true })).toHaveText('2300-12');
  await expect(page.getByLabel('Competência fixa: ano', { exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Competência fixa: mês', { exact: true })).toBeDisabled();
});
