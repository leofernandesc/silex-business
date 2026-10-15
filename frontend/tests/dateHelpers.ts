import { expect, type Locator, type Page } from "@playwright/test";

export function dateField(scope: Page | Locator, label: string) {
  const page = "keyboard" in scope ? scope : scope.page();
  return scope.locator(".silex-date-field").filter({ has: page.getByText(label, { exact: true }) });
}
export async function enterDate(scope: Page | Locator, label: string, iso: string) {
  const field = dateField(scope, label);
  if (!iso) {
    await field.getByRole("button").click();
    // Popover may be portalled into a native Modal rather than the field.
    const page = "keyboard" in scope ? scope : scope.page();
    await page.getByRole("button", { name: "Limpar data", exact: true }).click();
    return;
  }
  const [year, month, day] = iso.split("-");
  for (const [type, text] of [["day", day], ["month", month], ["year", year]]) {
    const segment = field.locator(`[data-type="${type}"]`);
    await segment.focus();
    // React Aria deletes one digit at a time; never assume one Backspace clears a year.
    for (let i = 0; i < 5 && (await segment.getAttribute("data-placeholder")) === null; i++) await segment.press("Backspace");
    await expect(segment).toHaveAttribute("data-placeholder", "true");
    await segment.pressSequentially(text);
  }
  await field.locator('[data-type="year"]').press("Tab");
}
export async function expectDate(scope: Page | Locator, label: string, iso: string) {
  const field = dateField(scope, label);
  await expect(field.locator('input[type="date"]')).toHaveValue(iso);
  const [year, month, day] = iso.split("-");
  if (iso) {
    await expect(field.locator('[data-type="day"]')).toHaveText(day);
    await expect(field.locator('[data-type="month"]')).toHaveText(month);
    await expect(field.locator('[data-type="year"]')).toHaveText(year);
    const order = await field.locator('.silex-date-segment').evaluateAll(nodes => nodes.filter(n => n.getAttribute('role') === 'spinbutton').map(n => n.getAttribute('data-type')));
    expect(order).toEqual(["day", "month", "year"]);
  }
}
