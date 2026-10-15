import { defineConfig } from "@playwright/test";
import original from "./playwright.config";
export default defineConfig({
  ...original,
  webServer: undefined,
  testMatch: process.env.SILEX_SB07C_REGRESSION_MATCH?.split(",") || [
    "app.spec.ts", "navigation.spec.ts", "home.spec.ts", "public.spec.ts",
    "ledger-interface.spec.ts", "accounts-interface.spec.ts", "dashboard-interface.spec.ts",
    "reconciliation-interface.spec.ts", "modal-workflows.spec.ts", "visual-accessibility.spec.ts",
    "date-presentation.spec.ts", "ledger-summary-responsive.spec.ts", "sb07b-date-homologation.spec.ts",
  ],
  projects: [original.projects![process.env.SILEX_SB07C_MOBILE === "1" ? 2 : 0]],
  use: { ...original.use, baseURL: "http://127.0.0.1:8011" },
  reporter: [["list"], ["json", { outputFile: process.env.SILEX_SB07C_RESULTS || "../docs/evidence/sb07c/regression-results.json" }]],
  outputDir: "test-results-sb07c-regression",
});
