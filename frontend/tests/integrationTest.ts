import { test as original } from "@playwright/test";
import { execFileSync } from "node:child_process";
export * from "@playwright/test";
/** A fresh, private SQLite fixture per test, only when the integration launcher opts in. */
export const test = original.extend<{ isolatedDatabase: void }>({
  isolatedDatabase: [
    async ({}, use) => {
      const manifest = process.env.SILEX_INTEGRATION_MANIFEST;
      if (manifest)
        execFileSync(
          "../.venv/bin/python",
          ["../scripts/reset_integration_fixture.py", manifest],
          { stdio: "pipe" },
        );
      await use();
    },
    { auto: true },
  ],
});
