// Copy next to the existing Playwright configuration in the isolated checkout.
import { defineConfig } from '@playwright/test';
import original from './playwright.config';
export default defineConfig({
  ...original,
  webServer: undefined,
  projects: [original.projects![0]],
  use: { ...original.use, baseURL: process.env.SILEX_CANDIDATE },
  reporter: [['list'], ['json', { outputFile: process.env.SILEX_RESULTS }]],
  outputDir: process.env.SILEX_OUTPUT_DIR || './test-results-sb07a',
});
