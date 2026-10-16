/* Focus/loading/print isolation and actual PDF text checks complement the 26-format matrix. */
const { resolve, join } = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '../../..');
const { chromium, expect } = require(join(root, 'frontend/node_modules/@playwright/test'));
const { range, ready, readRows } = require('./verify.cjs');
const out = process.env.SILEX_REPORT_EVIDENCE;
const hash = value => createHash('sha256').update(value).digest('hex');
const compact = text => text.replace(/\s/g, '');
const result = { responsive: [], pdfs: [], loading: false, error: false, modal: false, keyboard: false };
(async () => {
  // Installed Firefox has the documented E01 interception protocol limitation.
  const browser = await chromium.launch({ executablePath: process.env.SILEX_CHROMIUM_PATH || '/snap/brave/current/opt/brave.com/brave/brave', args: ['--disable-brave-update', '--disable-background-networking'] });
  try {
    const snapshots = [];
    for (const [variant, baseURL] of Object.entries({ baseline: 'http://127.0.0.1:18106', candidate: 'http://127.0.0.1:18107' })) {
      const context = await browser.newContext({ baseURL, locale: 'pt-BR' });
      try {
        assert((await context.request.post('/api/auth/login', { data: { username: 'demo.admin', password: process.env.SILEX_TEST_PASSWORD } })).ok());
        const page = await context.newPage(); await page.goto('/app#finance-reports');
        await expect(page.locator('.finance-report-print h2')).toHaveText('Fluxo de caixa mensal');
        await expect(page.locator('.finance-report-print > .table-wrap')).not.toContainText('Carregando registros');
        await page.evaluate(() => document.fonts.ready);
        const responsive = [];
        for (const width of [1440, 768, 375]) {
          await page.setViewportSize({ width, height: 900 });
          const png = await page.screenshot({ path: join(out, 'screenshots', `${variant}-screen-${width}.png`), fullPage: true });
          const measure = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
          responsive.push({ width, sha256: hash(png), ...measure });
          result.responsive.push({ variant, ...responsive.at(-1) });
        }
        snapshots.push(responsive);
        if (variant === 'baseline') continue;
        await page.setViewportSize({ width: 1440, height: 900 });
        let release, entered;
        const held = new Promise(resolve => { release = resolve; });
        const started = new Promise(resolve => { entered = resolve; });
        await page.route('**/api/finance/reports/cash-daily?*', async route => { entered(); await held; await route.continue(); });
        const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/reports/cash-daily'));
        await page.getByLabel('Relatório', { exact: true }).selectOption('cash-daily');
        await started;
        await expect(page.getByRole('button', { name: 'Imprimir', exact: true })).toBeDisabled();
        release(); await ready(page, await (await response).json());
        await page.unroute('**/api/finance/reports/cash-daily?*');
        await expect(page.getByRole('button', { name: 'Imprimir', exact: true })).toBeEnabled();
        result.loading = true;
        await page.route('**/api/finance/reports/by-method?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Falha fictícia de consulta IMP01' }) }));
        await page.getByLabel('Relatório', { exact: true }).selectOption('by-method');
        await expect(page.getByRole('alert')).toContainText('Falha fictícia de consulta IMP01');
        await expect(page.getByRole('button', { name: 'Imprimir', exact: true })).toBeDisabled();
        await page.unroute('**/api/finance/reports/by-method?*'); result.error = true;
        let data = await range(page, '2020-01-01', '2030-12-31');
        await page.getByRole('button', { name: 'Nova meta', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.emulateMedia({ media: 'print' });
        await expect(page.getByRole('dialog')).toBeHidden();
        await expect(page.locator('.finance-report-print')).toBeVisible();
        await page.emulateMedia({ media: 'screen' });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Nova meta', exact: true })).toBeFocused(); result.modal = true;
        await page.evaluate(() => { window.__keyboardPrinted = 0; window.print = () => window.__keyboardPrinted++; });
        await page.getByRole('button', { name: 'Exportar CSV', exact: true }).focus();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Imprimir', exact: true })).toBeFocused();
        await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => window.__keyboardPrinted), 1); result.keyboard = true;
        const catalog = await (await context.request.get('/api/finance/reports/catalog')).json();
        for (const definition of catalog) {
          if (definition.id !== data.id) {
            const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/finance/reports/' + definition.id);
            await page.getByLabel('Relatório', { exact: true }).selectOption(definition.id); data = await (await response).json();
          }
          const panel = await ready(page, data);
          const rows = await readRows(panel.locator('> .table-wrap table'));
          // Content-stream order keeps wrapped cell text together; -layout interleaves columns.
          const text = execFileSync('pdftotext', ['-raw', join(out, 'pdf', `${definition.id}.pdf`), '-'], { encoding: 'utf8' });
          const missing = rows.flat().filter(cell => !compact(text).includes(compact(cell)));
          assert.deepEqual(missing, [], `${definition.id}: every screen cell must be extractable from the actual PDF`);
          result.pdfs.push({ id: definition.id, rows: rows.length, allCellsExtractable: true });
        }
      } finally { await context.close(); }
    }
    assert.deepEqual(snapshots[1], snapshots[0], 'Normal layout must remain identical at all three widths');
    result.passed = true;
  } finally { await browser.close(); }
})().catch(error => { result.failure = error.stack; process.exitCode = 1; console.error(error.stack); }).finally(() => {
  fs.writeFileSync(join(out, 'interactions.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: result.passed, pdfCount: result.pdfs.length, loading: result.loading, error: result.error, modal: result.modal, keyboard: result.keyboard }));
});
