// Copy beside playwright.config.ts in the isolated frontend workspace.
import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config,
  webServer: undefined,
  use: { ...config.use, baseURL: process.env.SILEX_TEST_ORIGIN },
  reporter: [['list'], ['json', { outputFile: process.env.SILEX_RESULTS }]],
  outputDir: process.env.SILEX_OUTPUT_DIR || './test-results-sb06c',
});
