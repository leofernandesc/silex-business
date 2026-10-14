import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const cache = join(homedir(), ".cache", "ms-playwright");
const installed = existsSync(cache)
  ? readdirSync(cache)
      .filter((n) => n.startsWith("firefox-"))
      .sort()
      .reverse()
      .map((n) => join(cache, n, "firefox", "firefox"))
      .find(existsSync)
  : undefined;
const executablePath = process.env.GESTAO_FIREFOX_PATH || installed;
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8011",
    browserName: "firefox",
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: "../.venv/bin/python ../scripts/e2e_server.py",
    url: "http://127.0.0.1:8011/api/health",
    timeout: 45000,
    reuseExistingServer: false,
  },
});
