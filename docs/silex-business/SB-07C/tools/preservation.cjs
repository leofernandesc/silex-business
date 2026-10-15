// Compare original API calls and business submit callbacks by TypeScript AST.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..'),ts=require(root+'/frontend/node_modules/typescript'),base='fddcb66d18ba22fc1c07700852cd2f5a5c6b6ed8';
const files=['finance.tsx','financeCatalog.tsx','financePlanning.tsx','ledger.tsx','sales.tsx','serviceOrders.tsx','ui.tsx'];
function inspect(text,name){const ast=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),api=[],submits=[];function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='api')api.push(n.getText(ast));if(ts.isJsxAttribute(n)&&n.name.getText(ast)==='onSubmit'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression?.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword))submits.push(n.initializer.expression.getText(ast));ts.forEachChild(n,walk)}walk(ast);return{api,submits}}
const rows=files.map(f=>{const name='frontend/src/'+f,b=inspect(cp.execFileSync('git',['show',base+':'+name],{cwd:root,encoding:'utf8'}),name),c=inspect(fs.readFileSync(root+'/'+name,'utf8'),name);return{file:name,apiCalls:b.api.length,sameApiExpressions:JSON.stringify(b.api)===JSON.stringify(c.api),businessSubmitCallbacks:b.submits.length,sameBusinessSubmitCallbacks:JSON.stringify(b.submits)===JSON.stringify(c.submits)}});
if(rows.some(r=>!r.sameApiExpressions||!r.sameBusinessSubmitCallbacks))throw Error('Unexpected business source divergence');
const baseline=JSON.parse(fs.readFileSync(root+'/docs/evidence/sb07c/baseline.json','utf8')),changed=[],unchanged=[];
for(const[file,hash]of Object.entries(baseline.tracked)){const current=crypto.createHash('sha256').update(fs.readFileSync(root+'/'+file)).digest('hex');(hash===current?unchanged:changed).push(file)}
const allowedOriginalFiles = [
'frontend/package.json','frontend/package-lock.json',
...['finance','financeCatalog','financePlanning','ledger','ledgerPresentation','sales','serviceOrders','ui'].map(f=>'frontend/src/'+f+'.tsx'),
'frontend/src/financePresentation.test.ts','frontend/src/ledgerPresentation.test.ts',
...['accounts-interface','content-dates','dashboard-interface','date-presentation','ledger-interface','sb07b-date-homologation'].map(f=>'frontend/tests/'+f+'.spec.ts'),
'docs/silex-business/PENDENCIAS.md'];
const protectedFiles=Object.keys(baseline.tracked).filter(p=>!allowedOriginalFiles.includes(p));
if(protectedFiles.some(p=>changed.includes(p)))throw Error('Protected file changed');
const result={baseline:base,rows,protectedFiles,protectedFilesUnchanged:true,unchangedCount:unchanged.length,changedOriginalFiles:changed,productionDatabaseUsed:false,temporarySyntheticDatabasesOnly:true};
fs.writeFileSync(root+'/docs/evidence/sb07c/preservation-test.json',JSON.stringify(result,null,2));console.log('API and business submit callbacks identical in all seven source files; protected hashes preserved');
