import { defineConfig } from "@playwright/test";
import original from "./playwright.config";
export default defineConfig({
  ...original,
  webServer: undefined,
  testMatch: ["sb07c-dates.spec.ts", "sb07c-flows.spec.ts", "sb07c-visual.spec.ts"],
  projects: process.env.SILEX_SB07C_CHROMIUM === "1" ? [{ name: "chromium", use: { browserName: "chromium", launchOptions: { executablePath: "/snap/brave/current/opt/brave.com/brave/brave", args: ["--no-sandbox"] }, viewport: { width: 1440, height: 900 } } }] : [original.projects![0]],
  use: { ...original.use, baseURL: "http://127.0.0.1:18085", viewport: { width: 1440, height: 900 } },
  reporter: [["list"], ["json", { outputFile: process.env.SILEX_SB07C_RESULTS || "../docs/evidence/sb07c/e2e-results.json" }]],
  outputDir: process.env.SILEX_SB07C_ARTIFACTS || "test-results-sb07c",
});
