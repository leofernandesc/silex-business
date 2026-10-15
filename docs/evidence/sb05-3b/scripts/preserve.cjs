const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  crypto = require("node:crypto");
const R = path.resolve(__dirname, "../../../.."),
  E = path.join(R, "docs/evidence/sb05-3b"),
  env = JSON.parse(fs.readFileSync(path.join(E, "environment.json")));
const ts = require("node:module").createRequire(
  path.join(R, "frontend/package.json"),
)("typescript");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex"),
  equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
function inspect(text) {
  const s = ts.createSourceFile(
      "financePlanning.tsx",
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    functions = {},
    handlers = [],
    network = [],
    inputs = [],
    summaries = [],
    chartStyles = [],
    tooltips = [],
    maps = [],
    variables = [];
  function walk(n) {
    if (ts.isFunctionDeclaration(n) && n.name)
      functions[n.name.text] = n.getText(s);
    if (ts.isJsxAttribute(n) && /^on[A-Z]/.test(n.name.getText(s)))
      handlers.push(n.getText(s));
    if (
      ts.isCallExpression(n) &&
      /^(api|fetch|query|useLoad)$/.test(n.expression.getText(s))
    )
      network.push(n.getText(s));
    if (
      ts.isCallExpression(n) &&
      /result\.data\?\.(accounts|result_groups)\.map/.test(
        n.expression.getText(s),
      )
    )
      maps.push(n.getText(s));
    if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
      const tag = n.tagName.getText(s);
      if (["input", "select", "textarea"].includes(tag))
        inputs.push(n.getText(s));
      if (tag === "SummaryCard") summaries.push(n.getText(s));
      if (tag === "span") {
        const style = n.attributes.properties.find(
          (p) => ts.isJsxAttribute(p) && p.name.getText(s) === "style",
        );
        if (style && style.getText(s).includes("peak*140"))
          chartStyles.push(style.getText(s));
      }
      const title = n.attributes.properties.find(
        (p) => ts.isJsxAttribute(p) && p.name.getText(s) === "title",
      );
      if (title && title.getText(s).includes("row.month"))
        tooltips.push(title.getText(s));
    }
    if (ts.isVariableDeclaration(n)) variables.push(n.getText(s));
    ts.forEachChild(n, walk);
  }
  walk(s);
  const finance = s.statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === "FinanceOverview",
  );
  return {
    functions,
    handlers,
    network,
    inputs,
    summaries,
    chartStyles,
    tooltips,
    maps,
    financeSetup: finance.body.statements
      .filter(ts.isVariableStatement)
      .map((n) => n.getText(s)),
    otherDeclarations: s.statements
      .filter(
        (n) =>
          !ts.isImportDeclaration(n) &&
          !(ts.isFunctionDeclaration(n) && n.name?.text === "FinanceOverview"),
      )
      .map((n) => n.getText(s)),
  };
}
const a = inspect(old),
  b = inspect(current),
  semantic = {};
for (const key of [
  "handlers",
  "network",
  "inputs",
  "summaries",
  "chartStyles",
  "tooltips",
  "maps",
  "financeSetup",
  "otherDeclarations",
])
  semantic[key] = { identical: equal(a[key], b[key]), count: a[key].length };
semantic.otherFunctions = Object.keys(a.functions)
  .filter((n) => n !== "FinanceOverview")
  .map((name) => ({
    name,
    identical: a.functions[name] === b.functions[name],
  }));
if (
  Object.values(semantic).some((r) =>
    Array.isArray(r) ? r.some((f) => !f.identical) : !r.identical,
  )
)
  throw Error("Unexpected functional change: " + JSON.stringify(semantic));
const before = JSON.parse(
    fs.readFileSync(path.join(E, "baseline-sha256.json")),
  ),
  after = {},
  changed = [],
  missing = [];
for (const [rel, hash] of Object.entries(before)) {
  const p = path.join(R, rel);
  if (!fs.existsSync(p)) {
    missing.push(rel);
    continue;
  }
  after[rel] = sha(fs.readFileSync(p));
  if (after[rel] !== hash) changed.push(rel);
}
if (missing.length || changed.some((rel) => !env.originals.includes(rel)))
  throw Error("Out-of-scope changes: " + JSON.stringify({ missing, changed }));
const restore = fs.mkdtempSync("/tmp/silex-sb053b-restore-"),
  backup = JSON.parse(fs.readFileSync(path.join(env.backup, "manifest.json"))),
  restoration = [];
for (const rel of env.originals) {
  const dst = path.join(restore, rel),
    original = fs.readFileSync(path.join(env.backup, "original", rel));
  if (sha(original) !== before[rel] || sha(original) !== backup[rel])
    throw Error("Invalid backup");
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(R, rel), dst);
  fs.writeFileSync(dst, original);
  restoration.push({
    path: rel,
    restored: sha(fs.readFileSync(dst)) === before[rel],
    sha256: before[rel],
  });
}
const newFrontend = [
  "frontend/src/financialDashboard.css",
  "frontend/src/dashboardPresentation.tsx",
  "frontend/src/dashboardPresentation.test.ts",
  "frontend/tests/dashboard-interface.spec.ts",
];
for (const rel of newFrontend) {
  const dst = path.join(restore, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(R, rel), dst);
  fs.unlinkSync(dst);
  restoration.push({ path: rel, newFileRemoved: !fs.existsSync(dst) });
}
const css = fs.readFileSync(path.join(R, newFrontend[0]), "utf8"),
  tokens = fs.readFileSync(
    path.join(R, "frontend/src/styles/tokens.css"),
    "utf8",
  ),
  used = [...new Set(css.match(/--silex-[\w-]+/g))],
  undefinedTokens = used.filter((t) => !tokens.includes(t + ":"));
if (undefinedTokens.length) throw Error("Undefined tokens");
fs.writeFileSync(
  path.join(E, "after-sha256.json"),
  JSON.stringify(after, null, 2),
);
const result = {
  passed: true,
  baseline: env.baseline_commit,
  filesChecked: Object.keys(before).length,
  unchanged: Object.keys(before).length - changed.length,
  changed,
  missing,
  semantic,
  usedTokens: used.length,
  undefinedTokens,
  backup: env.backup,
  restoreDirectory: restore,
  restoration,
  newFrontendToRemove: newFrontend,
};
fs.writeFileSync(
  path.join(E, "preservation-test.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
