import { defineConfig } from "@playwright/test";
import review from "./playwright.review.config";

process.env.SILEX_MODAL_ORIGIN = "http://127.0.0.1:18086";
export default defineConfig({
  ...review,
  outputDir: `test-results-components-review-${process.env.SILEX_REVIEW_BROWSER || "firefox"}`,
  testMatch: ["sb07c-dates.spec.ts", "modal-focus.spec.ts"],
  projects: [review.projects![0]],
  webServer: {
    command: "npm run dev -- --port 18086",
    url: "http://127.0.0.1:18086/tests/fixtures/date-controls.html",
    timeout: 30000,
    reuseExistingServer: false,
  },
});
