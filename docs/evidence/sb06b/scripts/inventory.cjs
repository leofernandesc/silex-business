const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT||process.cwd();const ts=createRequire(path.join(root,'frontend/package.json'))('typescript');const rows=[];
for(const name of fs.readdirSync(path.join(root,'frontend/src')).filter(n=>n.endsWith('.tsx'))){
 const source=fs.readFileSync(path.join(root,'frontend/src',name),'utf8');const file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){const opening=ts.isJsxElement(node)?node.openingElement:ts.isJsxSelfClosingElement(node)?node:null;
  if(opening?.tagName.getText(file)==='Modal'){let owner=node;while(owner&&!ts.isFunctionDeclaration(owner))owner=owner.parent;rows.push({file:'frontend/src/'+name,line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,component:owner?.name?.getText(file),opening:opening.getText(file)});}
  ts.forEachChild(node,visit);
 }visit(file);
}
fs.writeFileSync(path.join(process.env.SILEX_EVIDENCE,'modal-inventory.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify({jsx_instances:rows.length,files:new Set(rows.map(r=>r.file)).size}));
