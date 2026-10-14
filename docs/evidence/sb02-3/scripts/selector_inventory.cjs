const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const repo='/home/leofernandesc/controlmax-inspired';
const req=createRequire(repo+'/frontend/package.json');
const postcss=req('postcss');
const evidence=path.resolve(__dirname,'..');
const full=fs.readFileSync(repo+'/frontend/src/styles.css','utf8');
const added=full.split('/* SB-02.2:')[1];
const css='/* SB-02.2:'+added;
const files=fs.readdirSync(repo+'/frontend/src').filter(n=>/\.(tsx|ts)$/.test(n)).map(n=>({path:'frontend/src/'+n,source:fs.readFileSync(repo+'/frontend/src/'+n,'utf8')}));
const selectors=[];const tokens=new Set();
postcss.parse(css).walkRules(rule=>{
  for(const selector of rule.selectors||[]){
    const classes=[...selector.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);
    const category=selector.includes('silex-customers')?'Customers pilot':/login|loading/.test(selector)?'Login/loading':/sidebar|workspace|nav-|finance-submenu|breadcrumb|topbar|footer|shell|local-dot/.test(selector)?'Shared shell':'Global controls and typography';
    const references=[...rule.toString().matchAll(/var\((--silex-[\w-]+)/g)].map(m=>m[1]);references.forEach(t=>tokens.add(t));
    selectors.push({selector,category,media:rule.parent.type==='atrule'?rule.parent.params:null,sourceComponents:files.filter(f=>classes.some(c=>f.source.includes(c))).map(f=>f.path),properties:rule.nodes.filter(n=>n.type==='decl').map(n=>({property:n.prop,value:n.value})),tokenReferences:[...new Set(references)]});
  }
});
const tokenCss=fs.readFileSync(repo+'/frontend/src/styles/tokens.css','utf8');
const declared=[...tokenCss.matchAll(/(--silex-[\w-]+)\s*:/g)].map(m=>m[1]);
const previous=full.split('/* SB-02.2:')[0]; const duplicate=[];
const priorSelectors=new Set();postcss.parse(previous).walkRules(rule=>(rule.selectors||[]).forEach(s=>priorSelectors.add(s)));
for(const item of selectors)if(priorSelectors.has(item.selector))duplicate.push(item.selector);
const audit={selectors,selectorCount:selectors.length,tokenReferences:[...tokens].sort(),undefinedTokenReferences:[...tokens].filter(t=>!declared.includes(t)),tokensNotConsumedInSB022:declared.filter(t=>!tokens.has(t)),repeatedPriorSelectors:[...new Set(duplicate)],globalImpact:'All 23 operational routes and Login share root typography and global controls; shell styles affect all authenticated screens. The pilot rules are scoped to Customers, including its native dialog.'};
fs.writeFileSync(evidence+'/'+(process.argv[2]||'selector-inventory.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({selectors:audit.selectorCount,undefinedTokens:audit.undefinedTokenReferences,repeatedSelectors:audit.repeatedPriorSelectors.length}));
