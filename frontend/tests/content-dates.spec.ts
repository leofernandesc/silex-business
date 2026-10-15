import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseline = process.env.SILEX_BASELINE!;
const candidate = process.env.SILEX_CANDIDATE!;
const evidence = process.env.SILEX_EVIDENCE!;
const password = process.env.SILEX_TEST_PASSWORD!;
test.beforeAll(() => {
  expect([baseline, candidate]).toEqual(['http://127.0.0.1:18071', 'http://127.0.0.1:18072']);
  expect(password).toBeTruthy();
  mkdirSync(evidence + '/screenshots', { recursive: true });
});
async function ready(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main .empty').filter({ hasText: 'Carregando' })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
function summary() {
  const grid = document.querySelector<HTMLElement>('main .summary-grid')!;
  return {
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    columns: getComputedStyle(grid).gridTemplateColumns,
    values: [...grid.querySelectorAll<HTMLElement>('.summary-card strong')].map(e => {
      const range = document.createRange(); range.selectNodeContents(e);
      const text = range.getBoundingClientRect(), card = e.closest('.summary-card')!.getBoundingClientRect();
      return { text: e.textContent!, lines: range.getClientRects().length, left: text.left, right: text.right, cardLeft: card.left, cardRight: card.right, font: getComputedStyle(e).fontSize };
    }),
  };
}
for (const route of ['dashboard', 'finance', 'finance-payable', 'finance-receivable']) {
  test(`C01 ${route}: original values, full numbers, reflow and baseline comparison`, async ({ browser }) => {
    const rows: unknown[] = [];
    const pages = new Map<string, Page>();
    for (const [name, origin] of [['baseline', baseline], ['candidate', candidate]]) {
      const context = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Manaus' });
      const page = await context.newPage(); pages.set(name, page);
      expect((await page.request.post(origin + '/api/auth/login', { data: { username: 'demo.admin', password } })).status()).toBe(200);
    }
    try {
      for (const width of [1440, 768, 375, 320]) {
        let original: string[] = [];
        for (const [name, origin] of [['baseline', baseline], ['candidate', candidate]]) {
          const page = pages.get(name)!;
          await page.setViewportSize({ width, height: 900 });
          await page.goto(origin + '/app#' + route);
          // Same hash navigation may retain the DOM; reload removes the prior font override.
          if (width !== 1440) await page.reload();
          await page.locator('main h1').waitFor(); await ready(page);
          const normal = await page.evaluate(summary);
          if (name === 'baseline') original = normal.values.map(v => v.text);
          else expect(normal.values.map(v => v.text)).toEqual(original);
          if (width === 375 || width === 1440) await page.screenshot({ path: `${evidence}/screenshots/${name}-${route}-normal-${width}.png` });
          // Same content-only computed-text enlargement used by the approved SB-06E.
          await page.locator('main').evaluate(main => {
            const elements = [main, ...main.querySelectorAll<HTMLElement>('*')];
            const sizes = elements.map(e => parseFloat(getComputedStyle(e).fontSize));
            elements.forEach((e, i) => e.style.fontSize = sizes[i] * 2 + 'px');
          });
          const enlarged = await page.evaluate(summary);
          expect(enlarged.values.map(v => v.text)).toEqual(original);
          rows.push({ name, route, width, normal, enlarged });
          if (width === 375 || width === 768 || (route === 'finance' && width === 320)) {
            await page.locator('main .summary-grid').scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${evidence}/screenshots/${name}-${route}-text200-${width}.png` });
          }
          if (name === 'candidate') {
            for (const state of [normal, enlarged]) {
              expect(state.document, JSON.stringify({ route, width, state })).toBeLessThanOrEqual(width + 1);
              for (const value of state.values) {
                expect(value.lines, value.text).toBe(1);
                expect(value.left).toBeGreaterThanOrEqual(value.cardLeft);
                expect(value.right, JSON.stringify(value)).toBeLessThanOrEqual(value.cardRight + 1);
              }
            }
          }
        }
      }
    } finally {
      writeFileSync(`${evidence}/c01-${route}.json`, JSON.stringify(rows, null, 2));
      for (const page of pages.values()) await page.context().close();
    }
  });
}

async function caption(page: Page, label: string, iso: string, br: string) {
  const input = page.getByLabel(label, { exact: true });
  await expect(input).toHaveAttribute('type', 'date');
  await expect(input).toHaveValue(iso);
  const hint = await input.getAttribute('aria-describedby'); expect(hint).toBeTruthy();
  await expect(page.locator(`[id="${hint}"]`)).toHaveText(br);
  return input;
}
for (const locale of ['pt-BR', 'en-US']) {
  test(`P05 services ${locale}: native input, civil dates, creation, editing and generated titles`, async ({ browser }) => {
    const context = await browser.newContext({ locale, timezoneId: locale === 'pt-BR' ? 'America/Manaus' : 'Pacific/Kiritimati', viewport: { width: 375, height: 900 } });
    const page = await context.newPage(); const requests: unknown[] = [];
    try {
      expect((await page.request.post(candidate + '/api/auth/login', { data: { username: 'demo.admin', password } })).status()).toBe(200);
      await page.goto(candidate + '/app#service-orders'); await page.locator('main h1').waitFor(); await ready(page);
      await page.getByRole('button', { name: 'Novo serviço/pedido', exact: true }).click();
      const input = page.getByLabel('Data do serviço *', { exact: true });
      for (const [iso, br] of [['2024-02-29', '29/02/2024'], ['2026-03-04', '04/03/2026'], ['2026-12-31', '31/12/2026'], ['2027-01-01', '01/01/2027']]) {
        await input.fill(iso); await caption(page, 'Data do serviço *', iso, 'Data: ' + br);
      }
      await input.fill(''); expect(await input.evaluate(e => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
      await caption(page, 'Data do serviço *', '', 'Formato brasileiro: dd/mm/aaaa');
      await input.fill('2026-03-04');
      const description = 'Serviço sintético SB07A ' + locale + ' ' + Date.now();
      await page.getByLabel('Cliente *', { exact: true }).selectOption({ index: 1 });
      await page.getByLabel('Descrição do serviço/pedido *', { exact: true }).fill(description);
      await page.getByLabel('Valor negociado (R$) *', { exact: true }).fill('1234,56');
      for (let i = 0; i < 12 && !await input.evaluate(e => e === document.activeElement); i++) await page.keyboard.press('Shift+Tab');
      await expect(input).toBeFocused(); await page.screenshot({ path: `${evidence}/screenshots/candidate-service-date-${locale}-375.png` });
      const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/service-orders' && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Cadastrar serviço', exact: true }).click();
      const response = await created; expect(response.status()).toBe(201);
      const body = response.request().postDataJSON(); expect(body.service_date).toBe('2026-03-04'); expect(body.negotiated_cents).toBe(123456); requests.push(body);
      const order = await response.json();
      const row = page.getByRole('row').filter({ hasText: description }); await expect(row).toContainText('04/03/2026');
      await row.getByRole('button', { name: 'Editar ' + order.code, exact: true }).click();
      await caption(page, 'Data do serviço *', '2026-03-04', 'Data: 04/03/2026');
      await page.getByLabel('Data do serviço *', { exact: true }).fill('2024-02-29');
      const edited = page.waitForResponse(r => new URL(r.url()).pathname === '/api/service-orders/' + order.id && r.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      const update = await edited; expect(update.status()).toBe(200); expect(update.request().postDataJSON().service_date).toBe('2024-02-29'); requests.push(update.request().postDataJSON());
      await page.reload(); await page.locator('main h1').waitFor(); await ready(page); await expect(row).toContainText('29/02/2024');
      expect((await (await page.request.get(candidate + '/api/service-orders/' + order.id)).json()).service_date).toBe('2024-02-29');
      await row.getByRole('button', { name: 'Gerar títulos', exact: true }).click();
      const due = page.getByLabel('Vencimento *', { exact: true }), competence = page.getByLabel('Competência *', { exact: true });
      await due.fill('2026-12-31'); await competence.fill('2027-01-01');
      await caption(page, 'Vencimento *', '2026-12-31', 'Data: 31/12/2026'); await caption(page, 'Competência *', '2027-01-01', 'Data: 01/01/2027');
      await page.getByLabel('Conta associada aos títulos *', { exact: true }).selectOption({ index: 1 });
      const generated = page.waitForResponse(r => new URL(r.url()).pathname === `/api/service-orders/${order.id}/generate-titles` && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Confirmar geração de títulos', exact: true }).click();
      const result = await generated; expect(result.ok()).toBe(true); const payload = result.request().postDataJSON(); requests.push(payload); expect(payload.due_date).toBe('2026-12-31'); expect(payload.competence_date).toBe('2027-01-01');
      await expect(row).toContainText('Títulos gerados');
    } finally {
      writeFileSync(`${evidence}/p05-${locale}.json`, JSON.stringify({ locale, requests }, null, 2));
      await context.close();
    }
  });
}
