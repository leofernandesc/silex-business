"""Consolidate final results; retain the initial test-authoring failure separately."""
from pathlib import Path
import base64
import hashlib
import json
import os
import shutil

s=json.loads(Path(os.environ['SILEX_STATE']).read_text());w=Path(s['work']);e=Path(s['root'])/'docs/evidence/sb06d1'
def cases(path):
    d=json.loads(path.read_text());rows=[]
    def visit(suite):
        for spec in suite.get('specs',[]):
            for test in spec['tests']:
                rows.append({'file':spec['file'],'title':spec['title'],'project':test['projectName'],'status':test['status'],'results':test['results']})
        for child in suite.get('suites',[]):visit(child)
    for suite in d['suites']:visit(suite)
    return rows
initial=cases(w/'regression-results.json');old=[r for r in initial if not r['file'].endswith('date-presentation.spec.ts')]
assert len(old)==267 and all(r['status']=='expected' for r in old)
initial_failed=[r for r in initial if r['status']!='expected']
assert len(initial_failed)==3 and all('range requests' in r['title'] for r in initial_failed)
groups={'existing_regressions':old,'dates_candidate':cases(w/'dates-candidate-results.json'),'dates_baseline_comparison':cases(w/'dates-baseline-results.json'),'modal_regressions':cases(w/'modal-results.json')}
expected={'existing_regressions':267,'dates_candidate':9,'dates_baseline_comparison':6,'modal_regressions':72}
for name,rows in groups.items():
    assert len(rows)==expected[name],(name,len(rows))
    assert all(r['status']=='expected' and len(r['results'])==1 and r['results'][0]['status']=='passed' and r['results'][0]['retry']==0 for r in rows),name
payloads={}
for group in ['dates_baseline_comparison','dates_candidate']:
    payloads[group]={}
    for row in groups[group]:
        attachments={a['name']:a for a in row['results'][0].get('attachments',[]) if a['name'] in ['ISO-payloads','ISO-filter-response']}
        for name,a in attachments.items():
            raw=base64.b64decode(a['body']) if 'body' in a else Path(a['path']).read_bytes()
            payloads[group][row['project']+':'+name]=json.loads(raw)
assert payloads['dates_baseline_comparison']==payloads['dates_candidate']
(e/'iso-payload-equivalence.json').write_text(json.dumps({'equal':True,'fixtures':'independent synthetic copies','payloads':payloads},indent=2))
visual=json.loads((e/'visual-checks.json').read_text());a=[r for r in visual['rows'] if r['variant']=='baseline'];b=[r for r in visual['rows'] if r['variant']=='candidate']
comparisons=[]
for x in a:
    y=next(y for y in b if (y['route'],y['width'],y.get('state'))==(x['route'],x['width'],x.get('state')))
    fields=['document','viewport','dateControls','tableColumns','text_preserved']
    assert all(x.get(k)==y.get(k) for k in fields),(x['route'],x['width'],x.get('state'))
    comparisons.append({'route':x['route'],'width':x['width'],'state':x.get('state','default'),'layout_controls_equal':True})
assert not visual['errors'] and all(not r.get('textFailures') for r in b)
native=json.loads((e/'native-and-v01.json').read_text());assert len(native['navigation'])==60
assert all(r['observed'].endswith(r['expected']) and r['auth']==200 and not r['consoleErrors'] for r in native['navigation'])
for version,count in [('baseline',71),('candidate',96)]:
    assert f'{count} passed' in (w/f'{version}-unit.log').read_text()
    assert '69 passed' in (w/f'{version}-backend.log').read_text()
    assert 'built in' in (w/f'{version}-build.log').read_text()
assert all('25 passed' in p.read_text() for p in w.glob('tz-*.log'))
summary={'baseline':s['head'],'candidate_e2e_final_distinct':348,'groups':{k:len(v) for k,v in groups.items()},'all_final_groups_passed':True,'retries':0,'frontend':{'baseline':71,'candidate':96},'backend':{'baseline':69,'candidate':69},'timezone_cases':{'UTC':25,'America/Manaus':25,'Pacific/Kiritimati':25},'types_build':'passed','native_zoom':'not homologated','V01':{'passed':60,'state':'monitoring; cause unresolved'},'T01':'monitoring; see public cases in existing regressions','initial_authoring_failure':{'failed':3,'reason':'New test reapplied the already active range; identical useLoad URL has no reason to refetch. Test now changes start to September. No old assertion, product code or retry policy changed.','cases':[{'project':r['project'],'title':r['title'],'status':r['status']} for r in initial_failed]},'visual_comparisons':comparisons,'financial_responses_equal':35,'export_print_responses_equal':30,'ISO_payloads_equal':True}
summary['V01']['network_observations']={version:sum(len([r for r in native['navigation'] if r['variant']==version and r['width']==width][-1]['networkErrors']) for width in [1440,768,375]) for version in ['baseline','candidate']}
(e/'test-results-summary.json').write_text(json.dumps(summary,indent=2))
(e/'test-matrix.json').write_text(json.dumps(groups,indent=2))
logs=e/'logs';logs.mkdir(exist_ok=True)
for name in ['baseline-unit.log','baseline-build.log','baseline-backend.log','candidate-unit.log','candidate-build.log','candidate-backend.log','regression.log','dates-candidate.log','dates-baseline.log','modal.log','browser-probe.log','capture.log','test-types.log']:
    shutil.copy2(w/name,logs/name)
for p in w.glob('tz-*.log'):shutil.copy2(p,logs/p.name)
print(json.dumps({k:v for k,v in summary.items() if k not in ['visual_comparisons','initial_authoring_failure']},indent=2))
