import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({ ...config, webServer: undefined, reporter: [['list'], ['json', { outputFile: process.env.SILEX_RESULTS || '/home/leofernandesc/controlmax-inspired/docs/evidence/sb05-1/ledger-e2e-results.json' }]], outputDir: './test-results-sb05-1' });
