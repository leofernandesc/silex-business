// Source/handler preservation plus real read-back of synthetic service dates.
const fs=require('fs'),crypto=require('crypto'),{execFileSync}=require('child_process'),{createRequire}=require('module');
const state=JSON.parse(fs.readFileSync('/tmp/silex-sb07a-state.json')),R=state.root,E=R+'/docs/evidence/sb07a',B=state.backup,base=JSON.parse(fs.readFileSync(B+'/baseline.json')),req=createRequire(R+'/frontend/package.json'),ts=req('typescript');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const allowed=['frontend/src/App.tsx','frontend/src/accounts.css','frontend/src/ledger.css','frontend/src/serviceOrders.tsx','docs/silex-business/PENDENCIAS.md'];
const changed=Object.entries(base.tracked).filter(([p,h])=>sha(fs.readFileSync(R+'/'+p))!==h).map(([p])=>p);if(changed.some(p=>!allowed.includes(p)))throw Error('Out-of-scope '+changed);
for(const [p,h] of Object.entries(base.protected))if(sha(fs.readFileSync(R+'/'+p))!==h)throw Error('Protected evidence/database changed '+p);
const handlers=[];
for(const file of ['frontend/src/App.tsx','frontend/src/serviceOrders.tsx']){
 const before=execFileSync('git',['show',state.head+':'+file],{cwd:R,encoding:'utf8'}),after=fs.readFileSync(R+'/'+file,'utf8');
 const collect=text=>{const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),out=[];function visit(n){if(ts.isJsxAttribute(n)&&/^on[A-Z]/.test(n.name.getText(sf)))out.push(n.getText(sf));ts.forEachChild(n,visit);}visit(sf);return out;};
 const a=collect(before),b=collect(after);if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Handler changed '+file);handlers.push({file,count:a.length,all_equal:true});
}
(async()=>{
 const origin=process.env.SILEX_CANDIDATE;if(origin!=='http://127.0.0.1:18072')throw Error('Disposable instance required');
 const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'demo.admin',password:process.env.SILEX_TEST_PASSWORD})});if(login.status!==200)throw Error('Login');const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 async function get(path){const r=await fetch(origin+'/api'+path,{headers:{Cookie:cookie}});if(!r.ok)throw Error(path+' '+r.status);return r.json();}
 const list=await get('/service-orders?q='+encodeURIComponent('Serviço sintético SB07A')+'&page_size=100');if(list.items.length!==2)throw Error('Expected two unique P05 examples');const dates=[];
 for(const item of list.items){const order=await get('/service-orders/'+item.id),titles=await get('/finance?document='+encodeURIComponent(order.code)+'&page_size=100');if(order.service_date!=='2024-02-29'||order.title_due_date!=='2026-12-31'||order.title_competence_date!=='2027-01-01'||titles.items.length!==1)throw Error('Date persistence mismatch');for(const t of titles.items)if(t.due_date!=='2026-12-31'||t.competence_date!=='2027-01-01'||t.amount_cents!==123456)throw Error('Financial ISO mismatch');dates.push({id:order.id,service_date:order.service_date,title_due_date:order.title_due_date,title_competence_date:order.title_competence_date,title_amount_cents:titles.items[0].amount_cents,persisted:true});}
 fs.writeFileSync(E+'/preservation-test.json',JSON.stringify({baseline:state.head,changed_existing:changed,handlers,backend_unchanged:true,api_contracts_unchanged:true,protected_files:Object.keys(base.protected),persisted_dates:dates,all_checks_passed:true},null,2));console.log('Preserved handlers',handlers,'date readbacks',dates.length);
})().catch(e=>{console.error(e);process.exitCode=1});
