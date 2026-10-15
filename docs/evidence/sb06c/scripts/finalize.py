"""Assemble final matrices and preserve diagnostic failures explicitly."""
from pathlib import Path
from collections import Counter
import hashlib, json, os, subprocess
from PIL import Image

R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb06c'
subprocess.run(['python3',str(E/'scripts/matrices.py')],check=True)
audit=json.loads((E/'audit-summary.json').read_text())['candidate']
assert audit['failing_text_samples']==audit['field_boundaries_below_3']==audit['placeholders_below_4_5']==0,audit
S=json.loads(Path(os.environ['SILEX_STATE']).read_text());W=Path(S['work'])
for rel in ['frontend/src/styles.css','frontend/src/styles/tokens.css','frontend/tests/visual-accessibility.spec.ts']:
 assert (R/rel).read_bytes()==(W/'candidate'/rel).read_bytes(),rel
def walk(suites,group,output):
 for suite in suites:
  for spec in suite.get('specs',[]):
   for case in spec['tests']:
    output.append({'group':group,'file':spec['file'],'title':spec['title'],'project':case.get('projectName'),'status':case['results'][-1]['status'] if case['results'] else 'not_run','attempts':len(case['results'])})
  walk(suite.get('suites',[]),group,output)
matrix=[];summary={}
for name,count in [('new-tests-final',18),('regression-final',249),('modal-final',72)]:
 data=json.loads((E/(name+'.json')).read_text());assert data['stats']['expected']==count and data['stats']['unexpected']==data['stats']['skipped']==data['stats']['flaky']==0,(name,data['stats']);summary[name]=data['stats'];walk(data['suites'],name,matrix)
for name in ['intermediate-regression-tests','closed-baseline-tests']:
 data=json.loads((E/(name+'.json')).read_text());summary[name]=data['stats'];walk(data['suites'],name,matrix)
summary['intermediate_note']='Combined suites shared a cash fixture; 206 passed, 2 genuine closed-cash precondition failures, then deliberate interruption/remaining not run to apply latest CSS and separate fixtures. Both failed assertions reproduced in approved baseline with same closed-cash state. Final runs have isolated fixtures, original assertions, no retries.'
summary['frontend']={'baseline':71,'candidate':71};summary['backend']={'baseline':69,'candidate':69,'preexisting_warning':'Starlette/httpx deprecation'}
summary['build_and_test_types']='passed';summary['candidate_final_unique_browser_cases']=339
summary['native_zoom_homologated']=False
nav=json.loads((E/'v01-navigation.json').read_text());assert len(nav)==60;summary['V01']={'executions':60,'failed':sum(bool(r['failure']) for r in nav),'status':'in acompanhamento; no causal diagnosis'}
extra=json.loads((E/'extra-audit.json').read_text());sizes=[]
for r in extra:
 if r['variant']!='candidate' or r.get('state')!='text200-simulation':continue
 b=next(x for x in extra if x['variant']=='baseline' and x['state']==r['state'] and x['width']==r['width'] and x['route']==r['route'])
 sizes.append({'route':r['route'],'width':r['width'],'baseline_document':b['document'],'candidate_document':r['document'],'new_overflow':r['document']>max(r['width'],b['document'])+1})
assert not any(r['new_overflow'] for r in sizes)
summary['text200_comparisons']=len(sizes)
(E/'text200-matrix.json').write_text(json.dumps(sizes,indent=2))
recheck=json.loads((E/'dashboard-settled-recheck.json').read_text());versions={v:json.loads((E/(v+'-audit.json')).read_text()) for v in ['baseline','candidate']}
for v in versions:
 versions[v]['results']=[r for r in versions[v]['results'] if not (r['route']=='dashboard' and r['state']=='default')]+[r for r in recheck if r['variant']==v]
screens=[]
for r in versions['candidate']['results']:
 if r['state']!='default':continue
 b=next(x for x in versions['baseline']['results'] if x['state']=='default' and x['route']==r['route'] and x['width']==r['width'])
 screens.append({'route':r['route'],'width':r['width'],'baseline_document':b['document'],'candidate_document':r['document'],'columns_equal':r['tableColumns']==b['tableColumns'],'new_overflow':r['document']>max(r['width'],b['document'])+1})
assert len(screens)==104 and all(r['columns_equal'] and not r['new_overflow'] for r in screens)
(E/'screen-matrix.json').write_text(json.dumps(screens,indent=2))
public=[]
for width in [1440,768,375]:
 a=(E/f'screenshots/baseline-public-{width}.png').read_bytes();b=(E/f'screenshots/candidate-public-{width}.png').read_bytes();assert a==b;public.append({'width':width,'pixel_identical':True,'sha256':hashlib.sha256(a).hexdigest()})
(E/'public-preservation.json').write_text(json.dumps(public,indent=2))
summary['T01']={'public_original_cases_passed':sum(r['status']=='passed' and r['file']=='public.spec.ts' for r in matrix if r['group']=='regression-final'),'status':'in acompanhamento; no assertion/route/public CSS changes'}
(E/'test-results-summary.json').write_text(json.dumps(summary,indent=2));(E/'test-matrix.json').write_text(json.dumps(matrix,indent=2,ensure_ascii=False))
print(json.dumps({k:summary[k] for k in ['candidate_final_unique_browser_cases','V01','T01','text200_comparisons']},indent=2))
