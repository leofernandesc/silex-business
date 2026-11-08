import { defineConfig } from "@playwright/test";
import original from "./playwright.config";
import { tmpdir } from "node:os";
import { join } from "node:path";

// All tests use the disposable loopback server. No production URL is accepted.
const chromium = process.env.SILEX_REVIEW_BROWSER === "chromium";
process.env.SILEX_E2E_MANIFEST ||= join(
  tmpdir(),
  `silex-review-${process.pid}.json`,
);
process.env.SILEX_TEST_PASSWORD = "DemoLocal#2026"; // Disposable demo fixture.
export default defineConfig({
  ...original,
  outputDir: `test-results-review-${chromium ? "chromium" : "firefox"}`,
  retries: 0,
  use: {
    ...original.use,
    browserName: chromium ? "chromium" : "firefox",
    launchOptions: chromium
      ? {
          ...(process.env.SILEX_CHROMIUM_PATH ? {executablePath:process.env.SILEX_CHROMIUM_PATH} : {}),
          args: ["--disable-brave-update", "--disable-background-networking"],
        }
      : process.env.GESTAO_FIREFOX_PATH ? {executablePath:process.env.GESTAO_FIREFOX_PATH} : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
  ],
});
