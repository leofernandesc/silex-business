const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const ts = require(root + '/frontend/node_modules/typescript');
const rows = [];
for (const name of fs.readdirSync(root + '/frontend/src').filter(n => n.endsWith('.tsx') && !n.endsWith('.test.tsx'))) {
  const file = root + '/frontend/src/' + name;
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && ['input','SilexDatePicker','SilexMonthField'].includes(node.tagName.getText(source))) {
      const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(p => [p.name.getText(source), p.initializer?.getText(source) ?? true]));
      const tag = node.tagName.getText(source);
      if (attrs.type === '"date"' || attrs.type === '"month"' || ['SilexDatePicker','SilexMonthField'].includes(tag)) {
        let wrapper = node.parent;
        const label = ts.isJsxElement(wrapper) ? wrapper.openingElement.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === 'label')?.initializer?.getText(source) || wrapper.children.filter(ts.isJsxText).map(p => p.text.trim()).filter(Boolean).join(' ') : '';
        rows.push({ file: 'frontend/src/' + name, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind: tag === 'SilexDatePicker' ? 'date' : tag === 'SilexMonthField' ? 'month' : attrs.type.slice(1,-1), component: tag, label: attrs.label || label, attributes: attrs, wrapper: ts.isJsxElement(wrapper) ? wrapper.openingElement.tagName.getText(source) : '', original: node.getText(source) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const output = process.argv[2];
if (output) fs.writeFileSync(output, JSON.stringify(rows, null, 2));
console.log(JSON.stringify({ dates: rows.filter(r => r.kind === 'date').length, months: rows.filter(r => r.kind === 'month').length }));
