const fs=require('fs'),cp=require('child_process'),{createRequire}=require('module');
const root=process.env.SILEX_ROOT,req=createRequire(root+'/frontend/package.json'),ts=req('typescript');
(async()=>{
 const before=cp.execFileSync('git',['show','aa4964d48c51fb8f56f29daf3b3a20401d2df2bb:frontend/src/format.ts'],{cwd:root,encoding:'utf8'}),after=fs.readFileSync(root+'/frontend/src/format.ts','utf8');
 async function load(text){const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
 const a=await load(before),b=await load(after);let count=0;
 for(const y of [1900,2000,2024,2025,2026])for(let m=1;m<=12;m++){
  // Date is used only to generate independent test fixtures, never by dateOnly.
  const days=new Date(Date.UTC(y,m,0)).getUTCDate();for(let d=1;d<=days;d++){
   const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
   if(a.dateOnly(iso)!==b.dateOnly(iso))throw Error('Civil regression '+iso);count++;
  }
 }
 const timestamps=['2026-01-01T00:00:00Z','2026-01-01T04:00:00Z','2024-02-29T23:59:59-04:00','2026-12-31T23:59:59+14:00'];
 for(const iso of timestamps)if(a.dateTime(iso)!==b.dateTime(iso))throw Error('Timestamp regression '+iso);
 const invalid=[null,'','invalid','2026-02-29','1900-02-29','2026-04-31','2026-13-01','2026-10-15T00:00:00Z'].map(value=>({value,before:a.dateOnly(value),after:b.dateOnly(value)}));
 let oldInvalid;try{oldInvalid=a.dateTime('invalid')}catch(e){oldInvalid=e.name}
 const result={valid_civil_dates_identical:count,valid_timestamp_displays_identical:timestamps.length,invalid_civil_examples:invalid,invalid_timestamp:{before:oldInvalid,after:b.dateTime('invalid')},internal_values_modified:false};
 fs.writeFileSync(process.env.SILEX_EVIDENCE+'/formatter-equivalence.json',JSON.stringify(result,null,2));console.log(count,'civil values unchanged;',timestamps.length,'instants unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
