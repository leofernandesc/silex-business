/** Independent TypeScript AST inventory, without evaluating ERP code or contacting services. */
import ts from '../frontend/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const actions=[],calls=[],routes=[];
function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(folder,e.name)):[path.join(folder,e.name)]);}
for(const file of files(path.join(root,'frontend/src')).filter(p=>/\.tsx?$/.test(p)&&!p.includes('.test.'))){
 const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const location=node=>({file:path.relative(root,file),line:source.getLineAndCharacterOfPosition(node.getStart()).line+1});
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='routes'){
   let initializer=node.initializer;while(initializer&&ts.isAsExpression(initializer))initializer=initializer.expression;
   if(initializer&&ts.isArrayLiteralExpression(initializer))for(const item of initializer.elements){const entry={};for(const p of item.properties||[])if(ts.isPropertyAssignment(p))entry[p.name.getText(source)]=p.initializer.getText(source).replace(/^"|"$/g,'');routes.push(entry);}
  }
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(source),attrs=node.attributes.properties.filter(ts.isJsxAttribute);
   const handlers=attrs.filter(a=>/^on(Click|Submit|Change)$/.test(a.name.getText(source)));
   if(['button','a','form','Form','AddButton','ExportButton'].includes(tag)){
    const parent=ts.isJsxElement(node.parent)?node.parent:node;
    actions.push({...location(node),tag,label:parent.getText(source).replace(/\s+/g,' ').slice(0,180),handlers:handlers.map(a=>a.getText(source)),href:attrs.find(a=>a.name.getText(source)==='href')?.getText(source)||null});
   }
  }
  if(ts.isCallExpression(node)&&['api','apiRequest','useLoad','fetch','exportCsv'].includes(node.expression.getText(source)))calls.push({...location(node),kind:node.expression.getText(source),arguments:node.arguments.map(a=>a.getText(source).slice(0,300))});
  ts.forEachChild(node,visit);
 }
 visit(source);
}
const record={method:'Independent TypeScript compiler AST; static affordances are not runtime validation.',routes,actions,calls};
fs.writeFileSync(path.join(root,'specs/commercial-readiness/UI-INVENTORY.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({routes:routes.length,affordances:actions.length,api_calls:calls.length}));
