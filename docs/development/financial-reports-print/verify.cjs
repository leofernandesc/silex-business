/* Paired IMP01 regression. Requires two loopback servers with identical disposable fixtures. */
const { resolve, join } = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = resolve(__dirname, '../../..');
const { firefox, chromium, expect } = require(join(root, 'frontend/node_modules/@playwright/test'));
const out = process.env.SILEX_REPORT_EVIDENCE;
assert(out && process.env.SILEX_TEST_PASSWORD, 'Set evidence directory and synthetic fixture password');
for (const dir of ['screenshots', 'pdf']) fs.mkdirSync(join(out, dir), { recursive: true });
const origins = { baseline: 'http://127.0.0.1:18106', candidate: 'http://127.0.0.1:18107' };
const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const norm = text => text.replace(/\s+/g, ' ').trim();
const result = { syntheticOnly: true, reports: [], pagination: [], legacy: [], permissions: [], errors: [] };
async function api(context, path) {
  const response = await context.request.get('/api' + path);
  assert(response.ok(), `${path}: ${response.status()}`);
  return response.json();
}
async function login(context, username = 'demo.admin') {
  const response = await context.request.post('/api/auth/login', { data: { username, password: process.env.SILEX_TEST_PASSWORD } });
  assert(response.ok());
}
async function enterDate(page, label, iso) {
  const field = page.locator('.silex-date-field').filter({ has: page.getByText(label, { exact: true }) });
  const [year, month, day] = iso.split('-');
  for (const [type, value] of [['day', day], ['month', month], ['year', year]]) {
    const segment = field.locator(`[data-type="${type}"]`);
    await segment.focus();
    for (let i = 0; i < 5 && await segment.getAttribute('data-placeholder') === null; i++) await segment.press('Backspace');
    await segment.pressSequentially(value);
  }
  await field.locator('[data-type="year"]').press('Tab');
}
const readRows = table => table.locator('tbody tr').evaluateAll(nodes => nodes.map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent.replace(/\s+/g, ' ').trim())));
async function ready(page, data) {
  const panel = page.locator('.finance-report-print');
  await expect(panel.locator('h2')).toHaveText(data.name);
  await expect(panel.locator('> .table-wrap tbody tr')).toHaveCount(data.items.length || 1);
  await expect(panel.locator('> .table-wrap')).not.toContainText('Carregando registros');
  if (data.items.length) await expect(panel.locator('> .table-wrap tbody tr').first().locator('td')).toHaveCount(Object.keys(data.items[0]).length);
  else await expect(panel.locator('.empty strong')).toHaveText('Nenhum registro encontrado');
  return panel;
}
async function range(page, start, end) {
  await enterDate(page, 'De', start);
  await enterDate(page, 'Até', end);
  const response = page.waitForResponse(r => new URL(r.url()).pathname.startsWith('/api/finance/reports/') && new URL(r.url()).searchParams.get('start') === start && new URL(r.url()).searchParams.get('end') === end);
  await page.getByRole('button', { name: 'Gerar relatório', exact: true }).click();
  const data = await (await response).json();
  await ready(page, data);
  return data;
}
async function printCheck(page, data, variant, engine, suffix = '') {
  const panel = await ready(page, data);
  const screenRows = await readRows(panel.locator('> .table-wrap table'));
  const headers = await panel.locator('> .table-wrap th').allTextContents();
  // The real print action must not fetch another page or recompute the report.
  const requests = [];
  const listener = request => { if (new URL(request.url()).pathname.startsWith('/api/finance/')) requests.push(request.url()); };
  page.on('request', listener);
  await page.evaluate(() => { window.__imp01Print = 0; window.print = () => window.__imp01Print++; });
  await panel.getByRole('button', { name: 'Imprimir', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__imp01Print), 1);
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 1032, height: 703 }); // A4 landscape content box, 12mm margins.
  await page.evaluate(() => document.fonts.ready);
  const metrics = await panel.evaluate(el => ({ display: getComputedStyle(el).display, width: el.clientWidth, scrollWidth: el.scrollWidth, page: getComputedStyle(el).page }));
  if (variant === 'baseline') {
    assert.equal(metrics.display, 'none', 'The approved baseline must reproduce IMP01');
  } else {
    await expect(panel).toBeVisible();
    assert.equal(metrics.page, 'silex-finance-report');
    assert(metrics.scrollWidth <= metrics.width + 1, `${data.id}: print container overflow`);
    assert.equal(await page.locator('main > :not(.finance-report-print):visible').count(), 0);
    assert.equal(await panel.locator('button:visible, input:visible, select:visible, .pagination:visible').count(), 0);
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('.topbar')).toBeHidden();
    const note = panel.locator('.finance-report-print-note');
    await expect(note).toContainText(`Página ${data.page} de ${Math.max(1, Math.ceil(data.total / data.page_size))}`);
    await expect(note).toContainText(`${data.items.length} registros nesta página`);
    if (data.items.length && headers.length > 8) {
      await expect(panel.locator('> .table-wrap')).toBeHidden();
      const bands = panel.locator('.finance-report-column-band table');
      const reconstructed = screenRows.map(() => []), printedHeaders = [];
      for (const table of await bands.all()) {
        printedHeaders.push(...(await table.locator('thead th').allTextContents()).slice(1));
        const rows = await readRows(table);
        assert.equal(rows.length, screenRows.length);
        for (let index = 0; index < rows.length; index++) {
          reconstructed[index].push(...rows[index]);
          assert.equal(norm(await table.locator('tbody tr').nth(index).locator('th').textContent()), String((data.page - 1) * data.page_size + index + 1));
        }
      }
      assert.deepEqual(printedHeaders, headers);
      assert.deepEqual(reconstructed, screenRows, `${data.id}: every displayed cell must survive printing`);
    } else assert.deepEqual(await readRows(panel.locator('> .table-wrap table')), screenRows);
    const clipped = await panel.locator('table:visible td, table:visible th').evaluateAll(cells => cells.filter(cell => cell.scrollWidth > cell.clientWidth + 1).map(cell => ({ text: cell.textContent, width: cell.clientWidth, scroll: cell.scrollWidth })));
    assert.deepEqual(clipped, [], `${data.id}: clipped or overlapping print cells`);
    const money = await panel.locator('table:visible td[data-report-money]').evaluateAll(cells => cells.map(cell => ({ text: cell.textContent, whiteSpace: getComputedStyle(cell).whiteSpace })));
    assert(money.every(cell => cell.whiteSpace === 'nowrap'));
    if (engine === 'chromium') await page.pdf({ path: join(out, 'pdf', `${data.id}${suffix}.pdf`), preferCSSPageSize: true, printBackground: true });
  }
  if (engine === 'firefox' && (data.id === 'cash-monthly' || suffix)) await page.screenshot({ path: join(out, 'screenshots', `${variant}-${data.id}${suffix}-print.png`), fullPage: true });
  page.off('request', listener);
  assert.deepEqual(requests, [], 'Print must use only the loaded page');
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 1440, height: 900 });
  result.reports.push({ engine, variant, id: data.id, suffix, rows: data.items.length, total: data.total, page: data.page, columns: headers.length, screenCellsHash: hash(screenRows), headers, ...metrics });
  return { data, screenRows, headers };
}
async function legacy(context, page, engine, variant) {
  const summaries = {};
  await page.goto('/app#finance');
  await page.locator('.silex-ledger').waitFor();
  const ledgerResponse = page.waitForResponse(r => r.url().includes('/api/finance/movements?') && !new URL(r.url()).searchParams.has('start'));
  await page.getByRole('button', { name: 'Tudo', exact: true }).click(); await ledgerResponse;
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
  await expect(page.locator('.ledger-print tbody tr').first()).toBeAttached();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.ledger-print')).toBeVisible();
  summaries.ledger = { text: norm(await page.locator('.ledger-print').innerText()), rows: await readRows(page.locator('.ledger-print table')) };
  if (engine === 'chromium') await page.pdf({ path: join(out, 'pdf', `${variant}-ledger.pdf`), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  const sales = await api(context, '/sales?page_size=100');
  const sale = sales.items.find(row => row.status === 'finalized'); assert(sale);
  await page.goto('/app#sales');
  await page.getByRole('button', { name: `Ver venda ${sale.id}`, exact: true }).click();
  const receipt = page.locator('.receipt'); await receipt.waitFor();
  await page.emulateMedia({ media: 'print' }); await expect(receipt).toBeVisible();
  summaries.receipt = { text: norm(await receipt.innerText()), rows: await readRows(receipt.locator('table')) };
  if (engine === 'chromium') await page.pdf({ path: join(out, 'pdf', `${variant}-receipt.pdf`), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  summaries.titles = {};
  for (const direction of ['expense', 'income']) {
    const response = await context.request.get(`/api/finance/print?direction=${direction}`);
    assert(response.ok()); summaries.titles[direction] = await response.text();
    const popup = await context.newPage(); await popup.goto(`/api/finance/print?direction=${direction}`);
    await expect(popup.locator('h1')).toHaveText('Silex Business · Lançamentos financeiros');
    await popup.emulateMedia({ media: 'print' }); await expect(popup.locator('table')).toBeVisible(); await popup.close();
  }
  result.legacy.push({ engine, variant, ledgerHash: hash(summaries.ledger), receiptHash: hash(summaries.receipt), titlesHash: hash(summaries.titles) });
  return summaries;
}
if (require.main === module) (async () => {
  for (const engine of ['firefox', 'chromium']) {
    const executablePath = engine === 'firefox' ? process.env.GESTAO_FIREFOX_PATH || '/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox' : process.env.SILEX_CHROMIUM_PATH || '/snap/brave/current/opt/brave.com/brave/brave';
    assert(fs.existsSync(executablePath));
    const browser = await (engine === 'firefox' ? firefox : chromium).launch({ executablePath, args: engine === 'chromium' ? ['--disable-brave-update', '--disable-background-networking'] : [] });
    const snapshots = [];
    try {
      for (const [variant, baseURL] of Object.entries(origins)) {
        const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, locale: engine === 'firefox' ? 'pt-BR' : 'en-US', timezoneId: 'America/Manaus' });
        try {
          await login(context);
          const page = await context.newPage(); page.on('pageerror', error => result.errors.push({ engine, variant, message: error.message }));
          await page.goto('/app#finance-reports'); await expect(page.locator('.finance-report-print h2')).toHaveText('Fluxo de caixa mensal');
          let data = await range(page, '2020-01-01', '2030-12-31');
          const catalog = await api(context, '/finance/reports/catalog'); assert.equal(catalog.length, 26);
          const snapshot = { catalog, reports: {}, csv: {}, page2: null, empty: null, filtered: null, legacy: null };
          for (const definition of catalog) {
            if (definition.id !== data.id) {
              const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/finance/reports/' + definition.id);
              await page.getByLabel('Relatório', { exact: true }).selectOption(definition.id);
              data = await (await response).json();
            }
            assert(data.items.length > 0, `${definition.id}: fixture must exercise actual columns`);
            snapshot.reports[definition.id] = await printCheck(page, data, variant, engine);
            const csv = await context.request.get(`/api/finance/reports/${definition.id}.csv?start=2020-01-01&end=2030-12-31`);
            assert(csv.ok()); snapshot.csv[definition.id] = hash(await csv.body());
            if (definition.id === 'cash-monthly') await page.screenshot({ path: join(out, 'screenshots', `${variant}-${engine}-monthly-screen.png`), fullPage: true });
          }
          let response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/finance/reports/titles-due');
          await page.getByLabel('Relatório', { exact: true }).selectOption('titles-due'); data = await (await response).json(); await ready(page, data);
          response = page.waitForResponse(r => new URL(r.url()).searchParams.get('page') === '2' && r.url().includes('/reports/titles-due?'));
          await page.getByRole('button', { name: 'Próxima página', exact: true }).click(); data = await (await response).json();
          assert.equal(data.page, 2); assert.equal(data.items.length, 20); assert(data.total > 40);
          const all = await api(context, '/finance/reports/titles-due?start=2020-01-01&end=2030-12-31&page_size=100');
          assert.deepEqual(data.items, all.items.slice(20, 40));
          snapshot.page2 = await printCheck(page, data, variant, engine, '-page2'); result.pagination.push({ engine, variant, page: data.page, count: data.items.length, total: data.total });
          // Draft filter dates must not replace the applied period in the document.
          await enterDate(page, 'De', '2024-01-01');
          assert((await page.locator('.finance-report-print .panel-heading p').textContent()).includes('01/01/2020'));
          await page.getByLabel('Conta', { exact: true }).selectOption(String(JSON.parse(fs.readFileSync(join(out, 'fixture.json'))).account_id));
          data = await range(page, '2024-01-01', '2024-12-31'); assert.equal(data.page, 1);
          snapshot.filtered = await printCheck(page, data, variant, engine, '-filtered');
          data = await range(page, '2001-01-01', '2001-12-31'); assert.equal(data.items.length, 0);
          snapshot.empty = await printCheck(page, data, variant, engine, '-empty');
          snapshot.legacy = await legacy(context, page, engine, variant);
          snapshots.push(snapshot);
          const operator = await browser.newContext({ baseURL }); await login(operator, 'demo.operador');
          assert.equal((await operator.request.get('/api/finance/reports/catalog')).status(), 403);
          assert.equal((await operator.request.get('/api/finance/reports/cash-monthly')).status(), 403);
          assert.equal((await operator.request.get('/api/finance/reports/cash-monthly.csv')).status(), 403);
          await operator.close(); result.permissions.push({ engine, variant, operatorDenied: true });
        } finally { await context.close(); }
      }
      assert.deepEqual(snapshots[1], snapshots[0], `${engine}: APIs, CSV, screen rows, filters, pagination and old printouts must remain identical`);
      if (engine === 'firefox') assert.equal(hash(fs.readFileSync(join(out, 'screenshots', 'baseline-firefox-monthly-screen.png'))), hash(fs.readFileSync(join(out, 'screenshots', 'candidate-firefox-monthly-screen.png'))));
      console.log(`${engine}: 26 reports, loaded page 2, filtered/empty states, permissions and legacy printouts passed`);
    } finally { await browser.close(); }
  }
  assert.deepEqual(result.errors, []); result.passed = true;
})().catch(error => { result.failure = error.stack; process.exitCode = 1; console.error(error.stack); }).finally(() => {
  fs.writeFileSync(join(out, 'validation.json'), JSON.stringify(result, null, 2));
});
module.exports = { enterDate, range, ready, readRows };
