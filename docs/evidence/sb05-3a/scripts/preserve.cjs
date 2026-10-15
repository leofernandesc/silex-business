const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  cp = require("node:child_process");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3a"),
  env = JSON.parse(fs.readFileSync(path.join(E, "environment.json")));
const ts = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("typescript");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const old = cp
    .execFileSync(
      "git",
      ["show", env.baseline_commit + ":frontend/src/financePlanning.tsx"],
      { cwd: R },
    )
    .toString(),
  current = fs.readFileSync(
    path.join(R, "frontend/src/financePlanning.tsx"),
    "utf8",
  );
const source = (text) =>
  ts.createSourceFile(
    "financePlanning.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
function inspect(text) {
  const s = source(text),
    functions = {},
    handlers = [],
    calls = [],
    declarations = [];
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && n.name)
      functions[n.name.text] = n.getText(s);
    if (
      ts.isJsxAttribute(n) &&
      (/^on[A-Z]/.test(n.name.getText(s)) ||
        [
          "disabled",
          "value",
          "accept",
          "required",
          "minLength",
          "maxLength",
        ].includes(n.name.getText(s)))
    )
      handlers.push(n.getText(s));
    if (
      ts.isCallExpression(n) &&
      /^(api|query|fetch|useLoad|money|dateOnly|localDate)$/.test(
        n.expression.getText(s),
      )
    )
      calls.push(n.getText(s));
    if (
      ts.isVariableDeclaration(n) &&
      n.initializer &&
      ts.isCallExpression(n.initializer) &&
      /^(useState|useLoad)$/.test(n.initializer.expression.getText(s))
    )
      declarations.push(n.getText(s));
    ts.forEachChild(n, visit);
  }
  visit(s);
  return { functions, handlers, calls, declarations };
}
const a = inspect(old),
  b = inspect(current),
  equal = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const unmodified = [
  "OfxNewFields",
  "FinanceOverview",
  "FinanceReports",
  "BudgetForm",
  "OfxResolveForm",
  "importFile",
  "reloadStatement",
  "showCandidates",
];
const semantic = {
  functions: unmodified.map((name) => ({
    name,
    byteIdentical: a.functions[name] === b.functions[name],
  })),
  handlers: equal(a.handlers, b.handlers),
  calls: equal(a.calls, b.calls),
  stateAndLoads: equal(a.declarations, b.declarations),
};
if (
  semantic.functions.some((f) => !f.byteIdentical) ||
  !semantic.handlers ||
  !semantic.calls ||
  !semantic.stateAndLoads
)
  throw Error("Financial behavior changed");
const snapshot = JSON.parse(
    fs.readFileSync(path.join(E, "baseline-sha256.json")),
  ),
  changes = [],
  missing = [],
  after = {};
for (const [rel, hash] of Object.entries(snapshot)) {
  const p = path.join(R, rel);
  if (!fs.existsSync(p)) {
    missing.push(rel);
    continue;
  }
  after[rel] = sha(fs.readFileSync(p));
  if (after[rel] !== hash) changes.push(rel);
}
const allowed = env.originals;
if (missing.length || changes.some((p) => !allowed.includes(p)))
  throw Error("Unexpected changes: " + JSON.stringify({ missing, changes }));
const backup = JSON.parse(
    fs.readFileSync(path.join(env.backup, "manifest.json")),
  ),
  restore = fs.mkdtempSync("/tmp/silex-sb053a-restore-");
const restoration = [];
for (const rel of allowed) {
  const dest = path.join(restore, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(R, rel), dest);
  const original = fs.readFileSync(path.join(env.backup, "original", rel));
  if (sha(original) !== snapshot[rel] || sha(original) !== backup[rel])
    throw Error("Backup corrupt");
  fs.writeFileSync(dest, original);
  restoration.push({
    path: rel,
    restored: sha(fs.readFileSync(dest)) === snapshot[rel],
    sha256: snapshot[rel],
  });
}
const newFiles = [
  "frontend/src/reconciliation.css",
  "frontend/tests/reconciliation-interface.spec.ts",
];
for (const rel of newFiles) {
  const dest = path.join(restore, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(R, rel), dest);
  fs.unlinkSync(dest);
  restoration.push({ path: rel, newFileRemoved: !fs.existsSync(dest) });
}
const css = fs.readFileSync(path.join(R, newFiles[0]), "utf8"),
  tokens = fs.readFileSync(
    path.join(R, "frontend/src/styles/tokens.css"),
    "utf8",
  ),
  used = [...new Set(css.match(/--silex-[\w-]+/g))];
const undefinedTokens = used.filter((t) => !tokens.includes(t + ":"));
if (undefinedTokens.length) throw Error("Undefined tokens: " + undefinedTokens);
const tracked = cp
  .execFileSync("git", ["diff", env.baseline_commit, "--name-only"], { cwd: R })
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);
fs.writeFileSync(
  path.join(E, "after-sha256.json"),
  JSON.stringify(after, null, 2),
);
const result = {
  passed: true,
  baseline: env.baseline_commit,
  filesChecked: Object.keys(snapshot).length,
  unchanged: Object.keys(snapshot).length - changes.length,
  changes,
  missing,
  semantic,
  backup: env.backup,
  restoreDirectory: restore,
  restoration,
  usedTokens: used.length,
  undefinedTokens,
  tracked,
};
fs.writeFileSync(
  path.join(E, "preservation-test.json"),
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    passed: true,
    filesChecked: result.filesChecked,
    changes,
    semantic,
    restoration,
  }),
);
