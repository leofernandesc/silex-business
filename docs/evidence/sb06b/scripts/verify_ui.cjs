const fs=require('fs'),path=require('path'),{createRequire}=require('module'),{execFileSync}=require('child_process');
const root=process.env.SILEX_ROOT||process.cwd(),ts=createRequire(path.join(root,'frontend/package.json'))('typescript');
const base=execFileSync('git',['show','fc3498e938cd2eef127dd65161ee909d9f67dd73:frontend/src/ui.tsx'],{cwd:root,encoding:'utf8'}),candidate=fs.readFileSync(path.join(root,'frontend/src/ui.tsx'),'utf8');
function functions(source){const f=ts.createSourceFile('ui.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);return new Map(f.statements.filter(ts.isFunctionDeclaration).map(n=>[n.name.getText(f),{text:n.getText(f),parameters:n.parameters.map(p=>p.getText(f))}]));}
const a=functions(base),b=functions(candidate),unchanged=[];
for(const[name,v]of a){if(name==='Modal')continue;if(v.text!==b.get(name)?.text)throw Error('Unexpected shared behavior change: '+name);unchanged.push(name)}
if(JSON.stringify(a.get('Modal').parameters)!==JSON.stringify(b.get('Modal').parameters))throw Error('Modal contract changed');
const result={all_non_modal_functions_byte_identical:true,functions:unchanged,modal_props_contract_unchanged:true};fs.writeFileSync(path.join(process.env.SILEX_EVIDENCE,'ui-preservation.json'),JSON.stringify(result,null,2));console.log(result);
