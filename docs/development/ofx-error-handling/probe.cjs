/* Read-only reproduction of the approved baseline's F01 failures. */
const { resolve, join } = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '../../..');
const { chromium, expect } = require(join(root, 'frontend/node_modules/@playwright/test'));
const out = process.env.SILEX_OFX_EVIDENCE;
assert(out && process.env.SILEX_TEST_PASSWORD);
const statement = { id: 1, account_id: 2, account_name: 'Conta fictícia', original_name: 'F01-ficticio.ofx', status: 'preview', count: 1, pending: 1, duplicates: 0, items: [{ id: 1, fitid: 'F01-fixture', posted_date: '2026-03-04', amount_cents: -1, name: 'Linha fictícia', memo: '', status: 'pending', matched_entry_id: null, matched_description: null, duplicate_of_id: null }] };
const results = [];
(async () => {
  const browser = await chromium.launch({ executablePath: '/snap/brave/current/opt/brave.com/brave/brave', args: ['--disable-brave-update', '--disable-background-networking'] });
  try {
    for (const scenario of ['queries', 'upload401', 'reopen404', 'suggestions-ignore503']) {
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:18126' });
      try {
        assert((await context.request.post('/api/auth/login', { data: { username: 'demo.admin', password: process.env.SILEX_TEST_PASSWORD } })).ok());
        await context.addInitScript(() => { window.__expired = 0; window.addEventListener('session-expired', () => window.__expired++); });
        const page = await context.newPage(), unhandled = [];
        page.on('pageerror', error => unhandled.push(error.message));
        if (scenario === 'queries') await page.route('**/api/accounts', r => r.fulfill({ status: 500, json: { detail: 'Erro controlado' } }));
        await page.route('**/api/finance/ofx/imports?*', route => route.fulfill(route.request().method() === 'POST'
          ? { status: 401, json: { detail: 'Sessão fictícia expirada' } }
          : scenario === 'queries' ? { status: 503, json: { detail: 'Erro controlado' } }
            : { json: { items: [statement], total: 1, page: 1, page_size: 50 } }));
        await page.route('**/api/finance/ofx/imports/1', route => route.fulfill(scenario === 'reopen404' ? { status: 404, json: { detail: 'Extrato fictício indisponível' } } : { json: statement }));
        await page.route('**/api/finance/ofx/imports/1/items/1/**', route => route.fulfill({ status: 503, json: { detail: 'Erro controlado' } }));
        await page.goto('/app#finance-reconcile');
        await expect(page.getByRole('heading', { name: 'Conciliação Bancária', exact: true })).toBeVisible();
        await expect(page.locator('.reconciliation-history')).not.toContainText('Carregando registros');
        if (scenario === 'upload401') {
          const banks = await (await context.request.get('/api/accounts')).json();
          await page.getByLabel('Conta bancária *', { exact: true }).selectOption(String(banks.find(a => a.active && a.kind === 'bank').id));
          await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles({ name: 'ficticio.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from('OFX controlado') });
          await expect(page.getByRole('alert')).toBeVisible();
        } else if (scenario !== 'queries') {
          await page.getByRole('button', { name: 'Revisar', exact: true }).click();
          if (scenario === 'suggestions-ignore503') {
            await page.getByRole('button', { name: 'Revisar / confirmar', exact: true }).click();
            await page.getByLabel('Motivo para ignorar a linha', { exact: true }).fill('Motivo fictício');
            await page.getByRole('button', { name: 'Ignorar esta linha', exact: true }).click();
          }
          await expect.poll(() => unhandled.length).toBeGreaterThan(0);
        }
        results.push({ scenario, route: new URL(page.url()).pathname, alerts: await page.getByRole('alert').count(), expiredEvents: await page.evaluate(() => window.__expired), unhandled, emptyHistory: await page.locator('.reconciliation-history').getByText('Nenhum registro encontrado', { exact: true }).count() });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  assert.equal(results.find(r => r.scenario === 'queries').alerts, 0);
  assert.equal(results.find(r => r.scenario === 'upload401').expiredEvents, 0);
  fs.writeFileSync(join(out, 'baseline-probe.json'), JSON.stringify(results, null, 2));
  console.log(results);
})().catch(error => { console.error(error); process.exitCode = 1; });
