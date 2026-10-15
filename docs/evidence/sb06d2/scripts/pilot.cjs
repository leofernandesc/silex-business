// Prove per-selector declaration traces; only execute --apply after Phase A is complete.
const fs=require('fs'),cp=require('child_process'),{createRequire}=require('module'),root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),postcss=req('postcss');
const before=cp.execFileSync('git',['show','48d6e36c0c865fec198f1dd03dab573505418063:frontend/src/ledger.css'],{cwd:root,encoding:'utf8'}),file=root+'/frontend/src/ledger.css';
const common='.silex-ledger .summary-card span,\n  .silex-ledger .summary-card small',span='.silex-ledger .summary-card span',small='.silex-ledger .summary-card small';
function traces(text){const result={};postcss.parse(text).walkRules(rule=>{const contexts=[];for(let p=rule.parent;p;p=p.parent)if(p.type==='atrule')contexts.unshift('@'+p.name+' '+p.params);for(const selector of rule.selectors){const key=JSON.stringify([contexts,selector]);result[key]||=[];rule.walkDecls(d=>result[key].push([d.prop,d.value,!!d.important]));}});return Object.fromEntries(Object.entries(result).sort());}
if(process.argv.includes('--apply')){
 const phase=JSON.parse(fs.readFileSync(process.env.SILEX_EVIDENCE+'/baseline-matrix.json'));if(phase.rows.length!==201||phase.errors.length)throw Error('Phase A incomplete');
 if(fs.readFileSync(file,'utf8')!==before)throw Error('Unexpected preexisting ledger change');
 const ast=postcss.parse(before),rules=[];ast.walkRules(r=>rules.push(r));const group=rules.find(r=>r.selector===common),one=rules.find(r=>r.selector===span),two=rules.find(r=>r.selector===small);
 if(!group||group.next()!==one||one.next()!==two)throw Error('Original rules are not adjacent');
 if(group.nodes.length!==1||one.nodes.length!==1||two.nodes.length!==2||one.nodes[0].prop!=='font-size'||two.nodes[0].value!==one.nodes[0].value)throw Error('Unexpected declarations');
 const original=[group,one,two].map(r=>({selector:r.selector,line:r.source.start.line,css:r.toString()}));
 group.append(one.nodes[0].clone());one.remove();two.nodes[0].remove();const after=ast.toString();
 if(JSON.stringify(traces(before))!==JSON.stringify(traces(after)))throw Error('Declaration trace differs');
 fs.writeFileSync(file,after);fs.writeFileSync(process.env.SILEX_EVIDENCE+'/pilot-original-rules.json',JSON.stringify({original,proof:'Same selectors/media/specificity and ordered per-selector declarations; three adjacent rules become two, with one shared font-size instead of two.',specificity:[0,2,1],consumers:'LedgerPage summary metadata span/small only; no React/handlers/money/grid changes'},null,2));
}
const after=fs.readFileSync(file,'utf8');if(JSON.stringify(traces(before))!==JSON.stringify(traces(after)))throw Error('Canonical trace changed');
let oldRules=0,newRules=0;postcss.parse(before).walkRules(()=>oldRules++);postcss.parse(after).walkRules(()=>newRules++);
fs.writeFileSync(process.env.SILEX_EVIDENCE+'/pilot-static-proof.json',JSON.stringify({per_selector_declarations_equal:true,old_ledger_rules:oldRules,new_ledger_rules:newRules,only_font_size_duplication_removed:oldRules-newRules===1},null,2));console.log(oldRules,'→',newRules,'ledger rules; declaration traces identical');
