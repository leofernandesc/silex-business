import { defineConfig } from '@playwright/test';
import original from './playwright.config';

const baseURL = process.env.SILEX_OFX_BASE_URL || 'http://127.0.0.1:18127';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseURL)) throw new Error('OFX tests require an isolated loopback server');
const firefox = process.env.SILEX_OFX_FIREFOX === '1';
export default defineConfig({
  testDir: './tests',
  testMatch: ['ofx-errors.spec.ts', 'reconciliation-interface.spec.ts', 'navigation.spec.ts'],
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL, viewport: { width: 1440, height: 900 },
    browserName: firefox ? 'firefox' : 'chromium',
    launchOptions: firefox ? original.use?.launchOptions : {
      executablePath: process.env.SILEX_CHROMIUM_PATH || '/snap/brave/current/opt/brave.com/brave/brave',
      args: ['--disable-brave-update', '--disable-background-networking'],
    },
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  projects: [{ name: process.env.SILEX_OFX_PROJECT || (firefox ? 'ofx-firefox' : 'ofx') }],
  reporter: [['list'], ['json', { outputFile: process.env.SILEX_OFX_RESULTS || '../docs/evidence/ofx-error-handling/e2e.json' }]],
  outputDir: 'test-results-ofx',
});
