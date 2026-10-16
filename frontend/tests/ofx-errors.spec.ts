import { test, expect, type Page, type Route } from '@playwright/test';

// These responses are synthetic. Successful financial contracts are also exercised
// against the real disposable backend by reconciliation-interface.spec.ts.
const id = 9001;
const item = { id, fitid: 'F01-SYNTHETIC', posted_date: '2026-03-04', amount_cents: -100, name: 'Movimento fictício F01', memo: '', status: 'pending', matched_entry_id: null, matched_description: null, duplicate_of_id: null };
const statement = { id, account_id: 2, account_name: 'Conta fictícia', original_name: 'F01-ficticio.ofx', status: 'preview', count: 1, pending: 1, duplicates: 0, items: [item] };
const entry = { id: 777, description: 'Título fictício', amount_cents: 100, remaining_cents: 100 };
const uploadPath = '**/api/finance/ofx/imports?*';
const detailPath = `**/api/finance/ofx/imports/${id}`;
const confirmPath = `**/api/finance/ofx/imports/${id}/items/${id}/confirm`;
const suggestionsPath = `**/api/finance/ofx/imports/${id}/items/${id}/suggestions`;
const file = { name: 'Extrato fictício.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from('OFX fictício controlado') };
const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  await page.addInitScript(() => {
    (window as any).f01Expired = 0;
    window.addEventListener('session-expired', () => (window as any).f01Expired++);
  });
  await page.route(uploadPath, route => route.request().method() === 'GET'
    ? route.fulfill({ json: { items: [statement], total: 1, page: 1, page_size: 50 } })
    : route.continue());
  await page.route(detailPath, route => route.fulfill({ json: statement }));
  await page.route(suggestionsPath, route => route.fulfill({ json: [{ entry, difference_cents: 0, same_date: true }] }));
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function open(page: Page) {
  expect((await page.request.post('/api/auth/login', { data: { username: 'demo.admin', password: process.env.SILEX_TEST_PASSWORD } })).ok()).toBe(true);
  await page.goto('/app#finance-reconcile');
  await expect(page.getByRole('heading', { name: 'Conciliação Bancária', exact: true })).toBeVisible();
  await expect(page.locator('.reconciliation-history')).not.toContainText('Carregando registros');
}
async function bank(page: Page) {
  const banks = await (await page.request.get('/api/accounts')).json();
  await page.getByLabel('Conta bancária *', { exact: true }).selectOption(String(banks.find((a: any) => a.active && a.kind === 'bank').id));
}
async function modal(page: Page) {
  await open(page);
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar / confirmar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
function hold() {
  let release!: () => void, entered!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  return { pending, started, release: () => release(), enter: () => entered() };
}

for (const status of [400, 401, 403, 404, 422, 500, 503]) {
  test(`upload HTTP ${status}: central session handling and safe feedback`, async ({ page }) => {
    let uploads = 0;
    await page.route(uploadPath, route => {
      if (route.request().method() !== 'POST') return route.fallback();
      uploads++; expect(route.request().postDataBuffer()).toEqual(file.buffer);
      expect(route.request().headers()['content-type']).toBe('application/x-ofx');
      expect(route.request().headers()['x-statement-name']).toBe(encodeURIComponent(file.name));
      return route.fulfill({ status, json: { detail: 'INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY' } });
    });
    await open(page); await bank(page);
    const before = await (await page.request.get('/api/accounts')).json();
    await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles(file);
    if (status === 401) {
      await expect(page).toHaveURL(/\/entrar$/);
      await expect(page.getByRole('alert')).toContainText('Sua sessão terminou');
      expect(await page.evaluate(() => (window as any).f01Expired)).toBe(1);
    } else {
      await expect(page.locator('.silex-reconciliation > [role="alert"]')).toBeVisible();
      await expect(page).toHaveURL(/#finance-reconcile$/);
      expect(await page.evaluate(() => (window as any).f01Expired)).toBe(0);
      expect((await page.request.get('/api/auth/me')).status()).toBe(200);
    }
    await expect(page.locator('body')).not.toContainText('INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY');
    expect(uploads).toBe(1);
    expect(await (await page.request.get('/api/accounts')).json()).toEqual(before);
  });
}
for (const kind of ['network', 'non-json-error', 'non-json-success']) {
  test(`upload ${kind} does not leak diagnostics or retry`, async ({ page }) => {
    let uploads = 0;
    await page.route(uploadPath, route => {
      if (route.request().method() !== 'POST') return route.fallback();
      uploads++;
      return kind === 'network' ? route.abort('connectionrefused') : route.fulfill({ status: kind === 'non-json-error' ? 500 : 200, contentType: 'text/html', body: '<html>INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY</html>' });
    });
    await open(page); await bank(page);
    await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles(file);
    await expect(page.locator('.silex-reconciliation > [role="alert"]')).toContainText('Confira o histórico');
    await expect(page.locator('body')).not.toContainText('INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY');
    expect(uploads).toBe(1); expect(await page.evaluate(() => (window as any).f01Expired)).toBe(0);
  });
}
test('a late upload 401 cannot log out a newly authenticated session', async ({ page }) => {
  const held = hold(); let uploads = 0;
  await page.route(uploadPath, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    uploads++; held.enter(); await held.pending; await route.fulfill({ status: 401, json: { detail: 'Sessão antiga' } });
  });
  await open(page); await bank(page);
  const late = page.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/api/finance/ofx/imports?'));
  await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles(file); await held.started;
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByLabel('Usuário', { exact: true }).fill('demo.admin');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.SILEX_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/app#home$/);
  held.release(); expect((await late).status()).toBe(401);
  await expect(page).toHaveURL(/\/app#home$/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  expect(await page.evaluate(() => (window as any).f01Expired)).toBe(0); expect(uploads).toBe(1);
});
test('simultaneous auxiliary 401 responses expire the session only once', async ({ page }) => {
  const held = hold(); let waiting = 0;
  const expire = async (route: Route) => { if (++waiting === 2) held.enter(); await held.pending; await route.fulfill({ status: 401, json: {} }); };
  await page.route('**/api/accounts', expire);
  await page.route(uploadPath, expire);
  expect((await page.request.post('/api/auth/login', { data: { username: 'demo.admin', password: process.env.SILEX_TEST_PASSWORD } })).ok()).toBe(true);
  await page.goto('/app#finance-reconcile'); await held.started; held.release();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(await page.evaluate(() => (window as any).f01Expired)).toBe(1);
});
for (const source of ['accounts', 'history']) {
  test(`${source} failure is distinct from an empty result and recovers on reopening`, async ({ page }) => {
    const path = source === 'accounts' ? '**/api/accounts' : uploadPath;
    await page.route(path, route => route.fulfill({ status: 503, json: { detail: 'INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY' } }));
    await open(page);
    const section = page.locator(source === 'accounts' ? '.reconciliation-import' : '.reconciliation-history');
    await expect(section.getByRole('alert')).toContainText('Não foi possível carregar');
    await expect(section).not.toContainText('Nenhum registro encontrado');
    await expect(section).not.toContainText('Nenhuma conta bancária ativa');
    if (source === 'accounts') await expect(page.getByLabel('Arquivo OFX *', { exact: true })).toBeDisabled();
    await page.unroute(path); await page.reload();
    if (source === 'history') await expect(page.locator('.reconciliation-history')).not.toContainText('Carregando registros');
    else await expect(page.getByLabel('Conta bancária *', { exact: true })).toBeEnabled();
    await expect(section.getByRole('alert')).toHaveCount(0);
  });
}
test('legitimately empty accounts and history have no error and cannot upload without a valid bank', async ({ page }) => {
  let uploads = 0;
  await page.route('**/api/accounts', route => route.fulfill({ json: [] }));
  await page.route(uploadPath, route => { if (route.request().method() === 'POST') uploads++; return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 50 } }); });
  await open(page);
  await expect(page.getByText('Nenhuma conta bancária ativa disponível.', { exact: true })).toBeVisible();
  await expect(page.locator('.reconciliation-history').getByText('Nenhum registro encontrado', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles(file);
  await expect(page.getByRole('alert')).toContainText('Selecione a conta bancária'); expect(uploads).toBe(0);
});
test('history pagination errors do not present the previous page as current', async ({ page }) => {
  await page.route(uploadPath, route => {
    const pageNumber = new URL(route.request().url()).searchParams.get('page');
    return route.fulfill(pageNumber === '2' ? { status: 500, json: {} } : { json: { items: [statement], total: 51, page: 1, page_size: 50 } });
  });
  await open(page); await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await expect(page.locator('.reconciliation-history').getByRole('alert')).toBeVisible();
  await expect(page.locator('.reconciliation-history').getByRole('button', { name: 'Revisar', exact: true })).toHaveCount(0);
  await expect(page.locator('.reconciliation-history .pagination')).toHaveCount(0);
});
test('reopening a missing statement reports failure, hides old rows and permits retry', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await expect(page.locator('.reconciliation-statement')).toBeVisible();
  await page.route(detailPath, route => route.fulfill({ status: 404, json: {} }));
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('não está disponível');
  await expect(page.locator('.reconciliation-statement')).toHaveCount(0);
  await page.unroute(detailPath);
  await page.route(detailPath, route => route.fulfill({ json: statement }));
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await expect(page.locator('.reconciliation-statement')).toBeVisible();
});
for (const failed of [false, true]) {
  test(`suggestions ${failed ? 'failure' : 'empty'} is explicit and never confirms unavailable data`, async ({ page }) => {
    let posts = 0;
    await page.route(suggestionsPath, route => route.fulfill(failed ? { status: 503, json: {} } : { json: [] }));
    await page.route(confirmPath, route => { posts++; return route.fulfill({ status: 500, json: {} }); });
    await modal(page);
    if (failed) await expect(page.getByRole('dialog').getByRole('alert')).toContainText('sugestões');
    else { await expect(page.getByText('Nenhum título pendente sugerido.', { exact: true })).toBeVisible(); await expect(page.getByRole('alert')).toHaveCount(0); }
    await page.getByRole('button', { name: 'Confirmar conciliação', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert').last()).toBeVisible(); expect(posts).toBe(0);
  });
}
for (const resource of ['categories', 'subcategories', 'suppliers?active=true&page_size=100']) {
  test(`creation lookup ${resource} failure blocks confirmation`, async ({ page }) => {
    let posts = 0;
    await page.route(`**/api/${resource}`, route => route.fulfill({ status: 500, json: {} }));
    await page.route(confirmPath, route => { posts++; return route.fulfill({ status: 500, json: {} }); });
    await modal(page); await page.getByRole('button', { name: 'Criar lançamento', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('categorias');
    await page.getByRole('button', { name: 'Confirmar conciliação', exact: true }).click();
    expect(posts).toBe(0); await expect(page.getByRole('dialog')).toBeVisible();
  });
}
for (const status of [400, 403, 404, 422, 500, 503, 'network', 'non-json'] as const) {
  test(`ignore ${status}: keeps the modal and reason without a mutation`, async ({ page }) => {
    let posts = 0;
    await page.route(confirmPath, route => {
      posts++; expect(route.request().postDataJSON()).toEqual({ ignore: true, reason: 'Motivo fictício' });
      return status === 'network' ? route.abort('connectionrefused') : status === 'non-json' ? route.fulfill({ status: 500, contentType: 'text/html', body: 'INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY' }) : route.fulfill({ status, json: { detail: 'INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY' } });
    });
    await modal(page);
    const before = await (await page.request.get('/api/accounts')).json();
    await page.getByLabel('Motivo para ignorar a linha', { exact: true }).fill('Motivo fictício');
    await page.getByRole('button', { name: 'Ignorar esta linha', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Motivo para ignorar a linha', { exact: true })).toHaveValue('Motivo fictício');
    await expect(page.getByRole('dialog')).not.toContainText('INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY');
    expect(posts).toBe(1); expect(await (await page.request.get('/api/accounts')).json()).toEqual(before);
  });
}
test('ignore locks rapid clicks and closes only after success and refreshed statement', async ({ page }) => {
  const held = hold(); let posts = 0, done = false;
  await page.route(confirmPath, async route => { posts++; held.enter(); await held.pending; done = true; await route.fulfill({ json: { ...statement, pending: 0, status: 'complete', items: [{ ...item, status: 'ignored' }] } }); });
  await page.route(detailPath, route => route.fulfill({ json: done ? { ...statement, pending: 0, status: 'complete', items: [{ ...item, status: 'ignored' }] } : statement }));
  await modal(page);
  const reason = page.getByLabel('Motivo para ignorar a linha', { exact: true });
  await reason.fill('ab'); await expect(page.getByRole('button', { name: 'Ignorar esta linha', exact: true })).toBeDisabled();
  await reason.fill('Motivo fictício');
  await page.getByRole('button', { name: 'Ignorar esta linha', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await held.started;
  await expect(page.getByRole('button', { name: 'Ignorar esta linha', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Confirmar conciliação', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog')).toBeVisible(); expect(posts).toBe(1);
  held.release(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.reconciliation-statement')).toContainText('Ignorado');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});
test('a successful operation with failed refresh retries only GET, never POST', async ({ page }) => {
  let posts = 0, unavailable = false;
  await page.route(confirmPath, route => { posts++; unavailable = true; return route.fulfill({ json: { ...statement, pending: 0 } }); });
  await page.route(detailPath, route => route.fulfill(unavailable ? { status: 503, json: {} } : { json: posts ? { ...statement, pending: 0, status: 'complete', items: [{ ...item, status: 'ignored' }] } : statement }));
  await modal(page); await page.getByLabel('Motivo para ignorar a linha', { exact: true }).fill('Motivo fictício');
  await page.getByRole('button', { name: 'Ignorar esta linha', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('operação não será enviada novamente');
  await expect(page.getByRole('button', { name: 'Ignorar esta linha', exact: true })).toHaveCount(0);
  unavailable = false; await page.getByRole('button', { name: 'Atualizar extrato', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(posts).toBe(1);
  await expect(page.locator('.reconciliation-statement')).toContainText('Ignorado');
});

test('normal confirmation failures stay in Form with no false success', async ({ page }) => {
  let posts = 0;
  await page.route(confirmPath, route => {
    posts++;
    expect(route.request().postDataJSON()).toEqual({ entry_id: entry.id, principal_cents: 100, interest_cents: 0, fine_cents: 0, discount_cents: 0 });
    return route.fulfill({ status: 503, json: { detail: 'INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY' } });
  });
  await modal(page);
  await page.getByLabel('Título pendente sugerido', { exact: true }).selectOption(String(entry.id));
  await page.getByRole('button', { name: 'Confirmar conciliação', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('indisponível');
  await expect(page.getByRole('dialog')).not.toContainText('INTERNAL_DIAGNOSTIC_DO_NOT_DISPLAY');
  await expect(page.getByRole('dialog')).toBeVisible(); expect(posts).toBe(1);
});
test('rapid statement reopen requests are locked until the current read finishes', async ({ page }) => {
  const held = hold(); let reads = 0;
  await page.route(detailPath, async route => { reads++; held.enter(); await held.pending; await route.fulfill({ json: statement }); });
  await open(page);
  await page.getByRole('button', { name: 'Revisar', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await held.started;
  await expect(page.getByRole('button', { name: 'Revisar', exact: true })).toBeDisabled();
  expect(reads).toBe(1); held.release();
  await expect(page.locator('.reconciliation-statement')).toBeVisible();
});
test('closing a pending modal cannot reopen and resubmit the same operation', async ({ page }) => {
  const held = hold(); let posts = 0;
  await page.route(confirmPath, async route => { posts++; held.enter(); await held.pending; await route.fulfill({ status: 503, json: {} }); });
  await modal(page); await page.getByLabel('Motivo para ignorar a linha', { exact: true }).fill('Motivo fictício');
  await page.getByRole('button', { name: 'Ignorar esta linha', exact: true }).click(); await held.started;
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Revisar / confirmar', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Revisar', exact: true })).toBeDisabled();
  held.release();
  await expect(page.getByRole('button', { name: 'Revisar / confirmar', exact: true })).toBeEnabled();
  await expect(page.locator('.silex-reconciliation > [role="alert"]')).toContainText('indisponível');
  await page.getByRole('button', { name: 'Revisar / confirmar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); expect(posts).toBe(1);
});
test('pending upload and statement reads reject duplicate actions; size/invalid OFX keep existing limits', async ({ page }) => {
  const held = hold(); let uploads = 0;
  await page.route(uploadPath, async route => { if (route.request().method() !== 'POST') return route.fallback(); uploads++; held.enter(); await held.pending; await route.fulfill({ status: 422, json: {} }); });
  await open(page); await bank(page);
  await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles({ ...file, buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('OFX deve ter até 10 MB'); expect(uploads).toBe(0);
  await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles(file); await held.started;
  await expect(page.getByLabel('Arquivo OFX *', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Revisar', exact: true })).toBeDisabled();
  expect(uploads).toBe(1); held.release();
  await expect(page.getByRole('alert')).toContainText('Confira o arquivo OFX');
});
test('error feedback remains accessible at desktop, tablet and mobile widths', async ({ page }, info) => {
  await page.route('**/api/accounts', route => route.fulfill({ status: 503, json: {} }));
  await open(page);
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.reconciliation-import').getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await info.attach(`feedback-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
});

test('invalid OFX is rejected by the unchanged backend without creating an import', async ({ page }) => {
  await open(page); await bank(page);
  const before = await (await page.request.get('/api/finance/ofx/imports')).json();
  const response = page.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/api/finance/ofx/imports?'));
  await page.getByLabel('Arquivo OFX *', { exact: true }).setInputFiles({ ...file, buffer: Buffer.from('invalid OFX') });
  expect((await response).status()).toBe(422);
  await expect(page.locator('.silex-reconciliation > [role="alert"]')).toContainText('Confira o arquivo OFX');
  const after = await (await page.request.get('/api/finance/ofx/imports')).json();
  expect(after).toEqual(before);
});
