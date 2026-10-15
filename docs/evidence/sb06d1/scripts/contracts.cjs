// Compare original handler source and non-date functions, not only final screenshots.
const fs=require('fs'),cp=require('child_process'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),ts=req('typescript');
const baseline=process.env.SILEX_BASELINE_HEAD||'aa4964d48c51fb8f56f29daf3b3a20401d2df2bb';
const handlers=text=>{const ast=ts.createSourceFile('financePlanning.tsx',text,ts.ScriptTarget.Latest,true),list=[];
 function visit(n){if(ts.isJsxAttribute(n)&&/^on[A-Z]/.test(n.name.getText(ast)))list.push(n.getText(ast));ts.forEachChild(n,visit);}visit(ast);return list;};
const prior=cp.execFileSync('git',['show',baseline+':frontend/src/financePlanning.tsx'],{cwd:root,encoding:'utf8'}),next=fs.readFileSync(root+'/frontend/src/financePlanning.tsx','utf8');
const a=handlers(prior),b=handlers(next);if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Handler changed');
const functions=text=>{const ast=ts.createSourceFile('financePlanning.tsx',text,ts.ScriptTarget.Latest,true);return Object.fromEntries(ast.statements.filter(ts.isFunctionDeclaration).filter(n=>n.name).map(n=>[n.name.text,n.getText(ast)]));};
const oldFunctions=functions(prior),newFunctions=functions(next),unchangedFunctions=Object.keys(oldFunctions).filter(k=>!['FinanceReports','formatReportValue'].includes(k));
for(const name of unchangedFunctions)if(oldFunctions[name]!==newFunctions[name])throw Error('Unrelated financial function changed: '+name);
const formatBefore=cp.execFileSync('git',['show',baseline+':frontend/src/format.ts'],{cwd:root,encoding:'utf8'}),formatAfter=fs.readFileSync(root+'/frontend/src/format.ts','utf8');
const declarations=text=>{const ast=ts.createSourceFile('format.ts',text,ts.ScriptTarget.Latest,true),rows={};for(const n of ast.statements){if(ts.isVariableStatement(n)){for(const d of n.declarationList.declarations)rows[d.name.getText(ast)]=d.getText(ast);}else if(ts.isFunctionDeclaration(n)&&n.name)rows[n.name.text]=n.getText(ast);}return rows;};
const old=declarations(formatBefore),now=declarations(formatAfter),preserved=Object.keys(old).filter(k=>!['dateOnly','dateTime'].includes(k));
for(const key of preserved)if(old[key]!==now[key])throw Error('Non-presentation function changed: '+key);
const result={baseline,jsx_event_handlers_identical:a.length,unrelated_financial_functions_identical:unchangedFunctions,non_date_exports_identical:preserved,presentation_only:true};fs.writeFileSync(process.env.SILEX_EVIDENCE+'/handler-preservation.json',JSON.stringify(result,null,2));console.log(result);
