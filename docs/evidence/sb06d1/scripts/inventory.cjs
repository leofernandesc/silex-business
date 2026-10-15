// Source-only audit. Repeated CSS selectors are evidence of cascade, not proof of redundancy.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT, out=process.env.SILEX_EVIDENCE;
const req=createRequire(root+'/frontend/package.json'),ts=req('typescript'),postcss=req('postcss');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]);
const sources=walk(root+'/frontend/src').filter(f=>/\.tsx?$/.test(f)&&!f.includes('.test.'));
const dates=[],imports=[];
for(const file of sources){
 const text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const short=file.slice(root.length+1);
 const apis=[...text.matchAll(/(?:useLoad[^\n]*?|api(?:<[^>]*>)?\()\s*['"`]([^'"`\n]+)/g)].map(m=>m[1]);
 function visit(n){
  const raw=n.getText(ast),line=ast.getLineAndCharacterOfPosition(n.getStart()).line+1;
  let kind;
  if(ts.isJsxSelfClosingElement(n)||ts.isJsxOpeningElement(n)){
   if(/^(input|Dates|LedgerDateField)$/.test(n.tagName.getText(ast))&&(/type=["'](?:date|month|datetime-local)["']/.test(raw)||n.tagName.getText(ast)!=='input'))kind='native-control-or-wrapper';
  }else if(ts.isCallExpression(n)&&/^(dateOnly|dateTime|localDate|periodRange|financialMonthLabel|reportGroupDate)$/.test(n.expression.getText(ast)))kind=n.expression.getText(ast);
  else if(ts.isNewExpression(n)&&n.expression.getText(ast)==='Date')kind='date-computation-or-timestamp';
  else if(ts.isCallExpression(n)&&/toISOString|toLocaleDateString|toLocaleString|DateTimeFormat|setUTC|setDate|setMonth|setFullYear/.test(n.expression.getText(ast)))kind='conversion-or-computation';
  if(kind){let p=n.parent;while(p&&!ts.isFunctionDeclaration(p)&&!ts.isArrowFunction(p))p=p.parent;
   dates.push({file:short,line,kind,component:p&&ts.isFunctionDeclaration(p)?p.name?.getText(ast):'inline/module',expression:raw,api_context:apis,
    internal:kind==='dateTime'?'timestamp':kind==='dateOnly'||/date/.test(raw)?'civil ISO / inspect expression':'see expression',
    proposed:kind==='dateOnly'?'dd/mm/aaaa; invalid —':kind==='dateTime'?'pt-BR short + existing America/Manaus':'preserve native value / existing logic',
    risk:/computation|conversion/.test(kind)?'high: audit only':kind==='native-control-or-wrapper'?'medium: no control replacement':'low: display only'});
  }
  if(ts.isImportDeclaration(n))imports.push({file:short,module:n.moduleSpecifier.text});
  ts.forEachChild(n,visit);
 }visit(ast);
}
fs.writeFileSync(out+'/date-inventory.json',JSON.stringify({occurrences:dates.length,files:[...new Set(dates.map(d=>d.file))],dates,imports},null,2));
const cssFiles=walk(root+'/frontend/src').filter(f=>f.endsWith('.css')),rules=[],media=[],declarations=[],tokens=new Map();
for(const file of cssFiles){const short=file.slice(root.length+1),ast=postcss.parse(fs.readFileSync(file,'utf8'),{from:file});
 ast.walkRules(rule=>{const contexts=[];for(let p=rule.parent;p;p=p.parent)if(p.type==='atrule')contexts.unshift('@'+p.name+' '+p.params);
  const decls=(rule.nodes||[]).filter(n=>n.type==='decl').map(d=>({property:d.prop,value:d.value,important:!!d.important,line:d.source.start.line}));
  rules.push({file:short,line:rule.source.start.line,selector:rule.selector,contexts,declarations:decls});
  for(const d of decls){declarations.push({...d,file:short,selector:rule.selector,contexts});if(d.property.startsWith('--'))tokens.set(d.property,d.value);}
 });ast.walkAtRules('media',r=>media.push({file:short,line:r.source.start.line,query:r.params}));}
const grouped=new Map();for(const r of rules){const key=JSON.stringify([r.file,r.contexts,r.selector]);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
const repeated=[...grouped.values()].filter(a=>a.length>1).map(a=>({file:a[0].file,selector:a[0].selector,contexts:a[0].contexts,lines:a.map(r=>r.line),equivalent_declarations:a.every(r=>JSON.stringify(r.declarations.map(({line,...d})=>d))===JSON.stringify(a[0].declarations.map(({line,...d})=>d))),classification:/styles\.css$/.test(a[0].file)?'C':'B'}));
const all=cssFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const tokenUse=[...tokens].map(([name,value])=>({name,value,references:(all.match(new RegExp('var\\(\\s*'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=[,)\\s])','g'))||[]).length}));
fs.writeFileSync(out+'/css-audit.json',JSON.stringify({files:cssFiles.map(f=>({file:f.slice(root.length+1),lines:fs.readFileSync(f,'utf8').split('\n').length})),rules:rules.length,repeated,media_queries:media,tokens:tokenUse,hardcoded:declarations.filter(d=>/(?:#[0-9a-f]{3,8}\b|\brgba?\(|\d+px\b)/i.test(d.value)&&!d.property.startsWith('--')),print_rules:rules.filter(r=>r.contexts.some(c=>/print/.test(c))),import_edges:imports.filter(i=>i.module.endsWith('.css')),note:'Static findings require cascade and runtime review; zero var() references is not proof a token is obsolete.'},null,2));
console.log('Dates:',dates.length,'CSS rules:',rules.length,'repeated context/selectors:',repeated.length);
