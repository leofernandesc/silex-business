import { defineConfig } from "@playwright/test";
import base from "./playwright.integration.config";
export default defineConfig({
  ...base,
  testMatch: ["integration-reports.spec.ts"],
  projects: [
    { name: "reports", use: { viewport: { width: 1440, height: 1000 } } },
  ],
  reporter: [
    ["list"],
    ["json", { outputFile: "/tmp/silex-integration-extra-reports.json" }],
  ],
});
