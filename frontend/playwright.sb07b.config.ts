import { defineConfig } from "@playwright/test";
import original from "./playwright.config";

export default defineConfig({
  ...original,
  testDir: "./tests",
  testMatch: process.env.SILEX_SB07B_P05_REGRESSION
    ? ["sb07b-date-homologation.spec.ts", "content-dates.spec.ts"]
    : "sb07b-date-homologation.spec.ts",
  webServer: undefined,
  projects: [original.projects![0]],
  use: {
    ...original.use,
    baseURL: process.env.SILEX_SB07B_BASE_URL || "http://127.0.0.1:18083",
    locale: "pt-BR",
    timezoneId: "America/Manaus",
  },
  reporter: process.env.SILEX_SB07B_RESULTS
    ? [["list"], ["json", { outputFile: process.env.SILEX_SB07B_RESULTS }]]
    : "list",
  outputDir: process.env.SILEX_SB07B_OUTPUT_DIR || "./test-results-sb07b",
});
