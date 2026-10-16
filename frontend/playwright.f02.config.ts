import { defineConfig } from "@playwright/test";
import original from "./playwright.config";

const baseURL = process.env.SILEX_F02_BASE_URL || "http://127.0.0.1:18127";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseURL))
  throw new Error("F02 E2E requires an isolated loopback server");
const firefox = process.env.SILEX_F02_FIREFOX === "1";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["dashboard-error-state.spec.ts", "dashboard-interface.spec.ts"],
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    browserName: firefox ? "firefox" : "chromium",
    launchOptions: firefox
      ? original.use?.launchOptions
      : {
          executablePath:
            process.env.SILEX_CHROMIUM_PATH ||
            "/snap/brave/current/opt/brave.com/brave/brave",
          args: ["--disable-brave-update", "--disable-background-networking"],
        },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: firefox ? "f02-firefox" : "f02-chromium" }],
  reporter: "list",
  outputDir: "/tmp/silex-f02-playwright",
});
