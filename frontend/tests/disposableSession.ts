import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, type Page } from "@playwright/test";

/** Expire one cookie in the disposable database, never in a developer/server database. */
export async function expireDisposableSession(page: Page) {
  const manifest = JSON.parse(
    readFileSync(process.env.SILEX_E2E_MANIFEST!, "utf8"),
  );
  const database = realpathSync(manifest.database);
  if (
    manifest.persistent_database_used !== false ||
    dirname(dirname(database)) !== realpathSync(tmpdir()) ||
    !dirname(database).startsWith(
      join(realpathSync(tmpdir()), "gestao-e2e-"),
    ) ||
    !database.endsWith("/e2e.sqlite3")
  )
    throw new Error("Disposable E2E database required");
  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "gestao_session",
  );
  expect(cookie).toBeTruthy();
  execFileSync("python3", [
    "-c",
    "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); r=c.execute('UPDATE sessions SET expires_at=? WHERE token_hash=?',('2000-01-01 00:00:00.000000',sys.argv[2])); assert r.rowcount==1; c.commit(); c.close()",
    database,
    createHash("sha256").update(cookie!.value).digest("hex"),
  ]);
}
