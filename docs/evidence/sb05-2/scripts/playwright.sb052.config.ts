import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({ ...config, webServer: undefined, use: { ...config.use, baseURL: process.env.SILEX_TEST_ORIGIN || config.use?.baseURL }, reporter: [['list'], ['json', { outputFile: process.env.SILEX_RESULTS || '/home/leofernandesc/controlmax-inspired/docs/evidence/sb05-2/accounts-e2e-results.json' }]], outputDir: './test-results-sb05-2' });
