import { defineConfig } from "@playwright/test";
import base from "./playwright.integration.config";
export default defineConfig({
  ...base,
  testMatch: ["integration-dates.spec.ts"],
  projects: ["America/Manaus", "UTC", "Asia/Tokyo", "America/Los_Angeles"].map(
    (zone) => ({
      name: zone,
      use: {
        timezoneId: zone,
        locale: "en-US",
        viewport: { width: 1440, height: 1000 },
      },
    }),
  ),
  reporter: [
    ["list"],
    ["json", { outputFile: "/tmp/silex-integration-dates.json" }],
  ],
});
