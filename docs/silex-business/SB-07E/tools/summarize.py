"""Summarize every executed run, retaining original failures and overlapping coverage."""
from pathlib import Path
import json,subprocess
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e';runs=[]
for name in ['e2e','functional','app-fresh','date-firefox','date-chromium','header']:
 d=json.loads((E/(name+'-results.json')).read_text());tests=[]
 def walk(s):
  for spec in s.get('specs',[]):
   for t in spec['tests']:
    tests.append({'name':spec['title'],'file':spec['file'],'line':spec['line'],'browser':t['projectName'],'status':t['status'],'results':[{'status':r['status'],'retry':r['retry'],'duration_ms':r['duration'],'error':r.get('error',{}).get('message')} for r in t['results']]})
  for child in s.get('suites',[]):walk(child)
 for s in d['suites']:walk(s)
 assert not d['stats']['skipped'] and not d['stats']['flaky']
 assert all(r['retry']==0 for t in tests for r in t['results'])
 if name!='functional':assert not d['stats']['unexpected']
 else:assert d['stats']['unexpected']==2 and all(t['file']=='app.spec.ts' for t in tests if t['status']=='unexpected')
 runs.append({'run':name,'stats':d['stats'],'tests':tests})
expired=[t['name'] for r in runs if r['run']=='e2e' for t in r['tests'] if any(x in t['name'] for x in ['sessão expirada','expiração no servidor','logout com sessão'])]
# Keep complete original names so expiry preservation can be audited, no fabricated counts.
result={'runs':runs,'expiry_candidates':expired,'note':'Runs overlap. Original functional batch has 2 cash-precondition failures; unchanged full app suite passes 9/9 on fresh open-cash fixture. Do not sum as unique scenarios. No retries/skips.'}
(E/'tests-summary.json').write_text(json.dumps(result,indent=2))
for r in runs:print(r['run'],r['stats'])
print('expiry names',expired)
