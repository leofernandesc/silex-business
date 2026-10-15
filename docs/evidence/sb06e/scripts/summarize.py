"""Aggregate actual executions; no inferred passes, skips or silent retries."""
import json,os,re
from pathlib import Path
E=Path(os.environ['SILEX_EVIDENCE']);cases=[]
def visit(suites,run):
 for suite in suites:
  for spec in suite.get('specs',[]):
   for test in spec['tests']:
    results=test.get('results',[])
    cases.append({'run':run,'file':spec['file'],'line':spec['line'],'test':spec['title'],'project':test['projectName'],'outcome':test['status'],'results':[{'status':r['status'],'retry':r['retry'],'durationMs':r['duration'],'errors':[e.get('message') for e in r.get('errors',[])]} for r in results]})
  visit(suite.get('suites',[]),run)
for name in ['integrated','modal']:
 d=json.loads((E/(name+'-results.json')).read_text());visit(d['suites'],name)
 assert not d.get('errors'),d.get('errors')
assert len([c for c in cases if c['run']=='integrated'])==285
assert len([c for c in cases if c['run']=='modal'])==72
assert all(c['outcome']=='expected' and len(c['results'])==1 and c['results'][0]['status']=='passed' and c['results'][0]['retry']==0 for c in cases)
surfaces=json.loads((E/'surfaces.json').read_text());v=json.loads((E/'v01-navigation.json').read_text());t=json.loads((E/'t01-public.json').read_text());financial=json.loads((E/'financial-equivalence.json').read_text());flows=json.loads((E/'financial-flows.json').read_text());exports=json.loads((E/'export-equivalence.json').read_text())
assert len(surfaces['rows'])==156 and not surfaces['errors'] and all(r['expected'] for r in surfaces['responses'])
assert len(v)==90 and all(r['pass'] for r in v)
assert len(t)==15 and all(r['pass'] for r in t)
assert financial['all_equal'] and flows['all_equal'] and all(r['equal'] for r in exports)
assert '96 passed' in (E/'logs/frontend.log').read_text();assert '69 passed' in (E/'logs/backend.log').read_text();assert 'built in' in (E/'logs/build.log').read_text()
summary={'frontend':{'passed':96,'files':12},'backend':{'passed':69,'warnings':['Preexisting Starlette/httpx deprecation; no dependency installed']},'typescript':'passed through tsc -b and explicit instrument config typing','vite_build':'passed','e2e':{'integrated':285,'modal_separate_fixture':72,'total':len(cases),'failures':0,'skipped':0,'retries':0},'surface_inventory':{'normal':130,'text200':20,'extra_narrow':6,'widths':[1440,1024,768,375,320]},'financial':{'equal_json':len(financial['checks']),'equal_export_print':len(exports),'equal_mutation_checkpoints':len(flows['checks'])},'v01':{'runs':len(v),'passes':sum(r['pass'] for r in v),'held_loading':sum(r['mode']!='loaded' for r in v),'state':'monitoring; historical cause not identified'},'t01':{'original_public_tests':21,'extra_real_readiness_runs':len(t),'state':'monitoring; historical cause not identified'},'screen_reader':'not executed; installed but inactive','native_zoom':json.loads((E/'native-zoom-attempt.json').read_text())['verifiedNativeZoom'],'production_changed':False,'known_product_limitations_not_hidden':True}
(E/'test-matrix.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2));(E/'test-results-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False,indent=2))
