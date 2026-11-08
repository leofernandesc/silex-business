import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
const manifest =
  process.env.SILEX_INTEGRATION_MANIFEST ||
  join(tmpdir(), `silex-integration-${process.pid}.json`);
process.env.SILEX_E2E_MANIFEST = manifest;
process.env.SILEX_INTEGRATION_MANIFEST = manifest;
process.env.SILEX_TEST_PASSWORD = "DemoLocal#2026";
const firefox = process.env.SILEX_INTEGRATION_BROWSER === "firefox";
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "app.spec.ts",
    "navigation.spec.ts",
    "home.spec.ts",
    "public.spec.ts",
    "modal-workflows.spec.ts",
    "forms-review.spec.ts",
    "actions-review.spec.ts",
    "financial-states-review.spec.ts",
    "system-review.spec.ts",
    "ofx-errors.spec.ts",
    "customer-details.spec.ts",
    "integration.spec.ts",
    "commercial-readiness.spec.ts",
    "commercial-report-values.spec.ts",
    "commercial-a11y.spec.ts",
    "integration-reports.spec.ts",
  ],
  timeout: 60000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.SILEX_INTEGRATION_REPORT ||
          "test-results-integration/results.json",
      },
    ],
  ],
  outputDir: "test-results-integration",
  use: {
    baseURL: "http://127.0.0.1:8011",
    browserName: firefox ? "firefox" : "chromium",
    locale: "pt-BR",
    timezoneId: "America/Manaus",
    launchOptions: firefox
      ? process.env.GESTAO_FIREFOX_PATH
        ? { executablePath: process.env.GESTAO_FIREFOX_PATH }
        : {}
      : process.env.SILEX_CHROMIUM_PATH
        ? { executablePath: process.env.SILEX_CHROMIUM_PATH }
        : {},
    screenshot: "only-on-failure",
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: "../.venv/bin/python ../scripts/e2e_server.py",
    url: "http://127.0.0.1:8011/api/health",
    timeout: 45000,
    reuseExistingServer: false,
  },
});
