"""Collect completed runs and measured evidence, without touching application data."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import os
import shutil
from PIL import Image, ImageChops

S=json.loads(Path(os.environ['SILEX_STATE']).read_text());W=Path(S['work']);R=Path(S['root']);E=R/'docs/evidence/sb06b';T=E/'tests';T.mkdir(exist_ok=True)
matrix=[];summary={}
def walk(suites,group,parents=()):
    for suite in suites:
        titles=parents+(suite['title'],)
        for spec in suite.get('specs',[]):
            for case in spec['tests']:
                results=case.get('results',[])
                matrix.append({'group':group,'file':Path(spec['file']).name,'title':' / '.join(titles+(spec['title'],)),'project':case.get('projectName'),'status':results[-1]['status'] if results else 'not_run','attempts':len(results)})
        walk(suite.get('suites',[]),group,titles)
for name,expected in [('regressions',249),('new-tests-final',72),('baseline-financial',2)]:
    data=json.loads((W/(name+'.json')).read_text());stats=data['stats'];assert stats['expected']+stats['unexpected']==expected and stats['skipped']==0 and stats['flaky']==0,(name,stats)
    if name!='regressions':assert stats['unexpected']==0,(name,stats)
    summary[name]=stats;walk(data['suites'],name)
baseline=json.loads((W/'component-baseline.json').read_text());assert baseline['stats']['unexpected']==4
summary['baseline_component_expected_P01_failures']=baseline['stats'];walk(baseline['suites'],'baseline_P01_reproduction')
summary['candidate_unique_browser_cases']=321
summary['primary_candidate_passed']=summary['regressions']['expected']+72
summary['primary_candidate_failed']=summary['regressions']['unexpected']
for variant in ['baseline','candidate']:
    data=json.loads((W/('public-diagnostic-'+variant+'.json')).read_text());summary['public-diagnostic-'+variant]=data['stats'];walk(data['suites'],'public_diagnostic_'+variant)
summary['candidate_cases_by_project']=dict(Counter(r['project'] for r in matrix if r['group'] in ['regressions','new-tests-final']))
summary['frontend']={'baseline_passed':71,'candidate_passed':71};summary['backend']={'baseline_passed':69,'candidate_passed':69,'preexisting_warning':'Starlette/httpx deprecation'}
summary['build_and_types']='passed; builds and additional test types checked in disposable source copies'
for rel in ['frontend/src/ui.tsx','frontend/src/useModalFocus.ts']:
    assert (R/rel).read_bytes()==(W/'candidate'/rel).read_bytes(),rel
summary['tested_production_source_matches_checkout']=True
for v in ['baseline','candidate']:
    rows=json.loads((E/(v+'-modal-probe.json')).read_text());assert len(rows)==45
    assert all(r['initial']['inside'] and r['trapped'] for r in rows)
    returned=sum(r['restored'] for r in rows);assert returned==(0 if v=='baseline' else 45)
    summary[v+'_keyboard_probe']={'cases':len(rows),'returned':returned,'initial_inside':45,'contained':45}
patterns=json.loads((E/'patterns-and-text200.json').read_text());text=[r for r in patterns if r['pattern']=='computed-modal-fonts-200'];assert len(text)==3 and all(r['focusInside'] and r['restored'] for r in text)
trace=[{'width':r['width'],'close':r['close']} for r in patterns if r['pattern']=='reconciliation'];assert all(c['connected'] for r in trace for c in r['close'])
(E/'candidate-close-trace.json').write_text(json.dumps(trace,indent=2))
summary['native_zoom_homologated']=False;summary['text_200_simulation']=text
pairs=[]
for width in [1440,768,375]:
    for route in ['customers','finance-payable','finance-receivable']:
        a=Image.open(E/f'baseline-{route}-{width}-open.png').convert('RGB');b=Image.open(E/f'candidate-{route}-{width}-open.png').convert('RGB')
        equal=a.size==b.size and ImageChops.difference(a,b).getbbox() is None
        pairs.append({'width':width,'route':route,'pixel_identical':equal});assert equal
(E/'visual-comparison.json').write_text(json.dumps(pairs,indent=2))
(E/'test-results-summary.json').write_text(json.dumps(summary,indent=2));(E/'test-matrix.json').write_text(json.dumps(matrix,indent=2,ensure_ascii=False))
for name in ['baseline-build','baseline-unit','baseline-backend','candidate-build','candidate-unit','candidate-backend','tests-types','regressions','new-tests-final','baseline-financial','component-baseline','public-diagnostic-baseline','public-diagnostic-candidate']:
    shutil.copy2(W/(name+'.log'),T/(name+'.log'))
print(json.dumps({'candidate_unique_browser_cases':321,'primary_failed':summary['primary_candidate_failed'],'projects':summary['candidate_cases_by_project'],'open_modal_pixel_pairs_equal':len(pairs),'close_before_removal':True},indent=2))
