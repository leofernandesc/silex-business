"""Consolidate completed runs; never infer approval from a general screenshot."""
from pathlib import Path
import json
import os
import shutil

s=json.loads(Path(os.environ['SILEX_STATE']).read_text());w=Path(s['work']);e=Path(s['root'])/'docs/evidence/sb06d2'
def cases(path):
    data=json.loads(path.read_text());rows=[]
    def visit(suite):
        for spec in suite.get('specs',[]):
            for test in spec['tests']:rows.append({'file':spec['file'],'title':spec['title'],'project':test['projectName'],'status':test['status'],'results':test['results']})
        for child in suite.get('suites',[]):visit(child)
    for suite in data['suites']:visit(suite)
    return rows
groups={'candidate_main':cases(w/'regression-results.json'),'candidate_modals':cases(w/'modal-results.json'),'baseline_pilot_tests':cases(w/'baseline-pilot-results.json')}
for name,count in [('candidate_main',285),('candidate_modals',72),('baseline_pilot_tests',9)]:
    assert len(groups[name])==count,(name,len(groups[name]))
    assert all(r['status']=='expected' and len(r['results'])==1 and r['results'][0]['status']=='passed' and r['results'][0]['retry']==0 for r in groups[name]),name
computed=json.loads((e/'computed-comparison.json').read_text());assert computed['all_equal']
home=json.loads((e/'home-state-comparison.json').read_text());assert home['all_equal'] and home['paired_probes']==12
css=json.loads((e/'css-preservation.json').read_text());assert css['print_rules_equal'] and css['print_rule_count']==24
printing=json.loads((e/'print-comparison.json').read_text());a=[r for r in printing if r['variant']=='baseline'];b=[r for r in printing if r['variant']=='candidate'];assert len(a)==len(b)==2
assert all(x['nodes']==next(y for y in b if y['route']==x['route'])['nodes'] and x['document']==next(y for y in b if y['route']==x['route'])['document'] for x in a)
supplement=json.loads((e/'report-supplement.json').read_text());assert len(supplement['rows'])==18
for width in [1440,768,375]:
    for slug in ['cash-monthly','result-monthly']:
        rows=[r for r in supplement['rows'] if r['width']==width and r['slug']==slug];assert len(rows)==3 and len({r['response_sha256'] for r in rows})==1 and len({r['request'] for r in rows})==1
nav=json.loads((e/'v01-navigation.json').read_text());assert len(nav)==60 and all(r['auth']==200 and r['observed'].endswith(r['expected']) and not r['consoleErrors'] for r in nav)
api=json.loads((e/'financial-equivalence.json').read_text());exports=json.loads((e/'export-equivalence.json').read_text());assert api['all_equal'] and len(api['checks'])==35 and all(r['equal'] for r in exports) and len(exports)==30
for version in ['baseline','candidate']:
    assert '96 passed' in (w/f'{version}-unit.log').read_text();assert '69 passed' in (w/f'{version}-backend.log').read_text();assert 'built in' in (w/f'{version}-build.log').read_text()
summary={'baseline':s['head'],'groups':{name:len(rows) for name,rows in groups.items()},'candidate_E2E_passed':357,'baseline_E2E_passed':9,'frontend_each':96,'backend_each':69,'types_build':'passed','retries':0,'computed_states':computed['states'],'computed_style_properties':computed['properties_compared'],'computed_differences':0,'screenshots_equal':len(computed['screenshots']),'home_extra_pairs':12,'load_order_states_equal':10,'print_views_equal':2,'print_rules_preserved':24,'financial_responses_equal':35,'export_print_responses_equal':30,'report_supplement':{'captures':18,'old_readiness_loading_observations':sum(r['loading'] for r in supplement['early']),'observations':len(supplement['early'])},'V01':{'passed':60,'monitoring':True,'action_network_failures':sum(len(r['networkErrors']) for r in nav)},'T01':{'public_cases_passed':len([r for r in groups['candidate_main'] if r['file'].endswith('public.spec.ts')]),'monitoring':True},'P05':'partial; unchanged','P07':'partial pilot; remaining cascade pending','native_zoom_screen_reader':'not homologated','all_checks_passed':True}
(e/'test-results-summary.json').write_text(json.dumps(summary,indent=2));(e/'test-matrix.json').write_text(json.dumps(groups,indent=2))
logs=e/'logs';logs.mkdir(exist_ok=True)
for name in ['baseline-unit.log','candidate-unit.log','baseline-backend.log','candidate-backend.log','baseline-build.log','candidate-build.log','regression.log','modal.log','baseline-pilot.log','baseline-matrix.log','candidate-matrix.log','baseline-order.log','candidate-order.log','supplement.log','home-probe.log','navigation-probe.log','test-types.log']:shutil.copy2(w/name,logs/name)
(e/'collector-development.json').write_text(json.dumps({'initial_collector_failure':'A negative toContainText assertion expected an .empty element even when a correctly loaded table had removed that placeholder.','corrected_check':'Zero .empty elements containing Carregando; independently require exact API response, title and every table cell.','product_changes':False,'exploratory_logs_retained_locally':'docs/evidence/sb06d2/exploratory','retries_added':False},indent=2))
print(json.dumps(summary,indent=2))
