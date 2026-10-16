// A real browser against the disposable local TLS proxy, never a Railway account.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const fixture = JSON.parse(fs.readFileSync(0, 'utf8'));
const hostname = new URL(fixture.url).hostname;
const browser = await chromium.launch({
  executablePath: process.env.SILEX_CHROMIUM_PATH || '/snap/brave/current/opt/brave.com/brave/brave',
  args: [`--host-resolver-rules=MAP ${hostname} 127.0.0.1`, '--no-proxy-server'],
});
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(fixture.url + '/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
  await page.goto(fixture.url + '/app#finance-dashboard');
  await page.getByLabel('Usuário', { exact: true }).fill('pilot.admin');
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('.silex-financial-dashboard')).toBeVisible();
  await expect(page.locator('.silex-financial-dashboard')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.summary-card')).toHaveCount(6);
  const cookie = (await context.cookies()).find(c => c.name === 'gestao_session');
  if (!cookie?.secure || !cookie.httpOnly || cookie.sameSite !== 'Strict') throw new Error('Cookie flags');
  await page.getByRole('button', { name: 'Abrir livro caixa', exact: true }).click();
  await expect(page).toHaveURL(/#finance$/);
  const logout = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/logout');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  if ((await logout).status() !== 200) throw new Error('Logout response');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect.poll(async () => (await context.cookies()).some(c => c.name === 'gestao_session')).toBe(false);
  console.log('Browser HTTPS: public page, protected return, login, dashboard, book cash, logout and Secure cookie passed.');
} catch (error) {
  // Redact even a Playwright fill trace containing the generated test credential.
  console.error(String(error.message).replaceAll(fixture.password, '[redacted]'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
