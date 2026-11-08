import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "financial-stage1.spec.ts",
  timeout: 45000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results-financial-stage1",
  use: {
    baseURL: "http://127.0.0.1:8025",
    browserName: process.env.SILEX_INTEGRATION_BROWSER === "firefox" ? "firefox" : "chromium",
    locale: "en-US",
    timezoneId: "America/Manaus",
    launchOptions: process.env.SILEX_INTEGRATION_BROWSER === "firefox" ? {} : process.env.SILEX_CHROMIUM_PATH
      ? { executablePath: process.env.SILEX_CHROMIUM_PATH }
      : {},
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
  ],
});
