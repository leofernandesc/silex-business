"""Verify preservation/recovery and generate review manifests from actual test results."""
from pathlib import Path
import json,hashlib,subprocess,shutil,tempfile,struct,csv
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1];B=json.loads((E/'baseline.json').read_text());env=json.loads((E/'environment.json').read_text());W=Path(env['work_dir']);backup=Path(env['backup']);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all((R/p).is_file() for p in B['files'])
modified=sorted(p for p,v in B['files'].items() if sha(R/p)!=v['sha256']);assert modified==['docs/silex-business/PENDENCIAS.md','frontend/src/finance.tsx'],modified
new=sorted(str(p.relative_to(R)) for folder in ['frontend/src','frontend/tests'] for p in (R/folder).rglob('*') if p.is_file() and str(p.relative_to(R)) not in B['files']);assert new==['frontend/src/accounts.css','frontend/src/financePresentation.test.ts','frontend/tests/accounts-interface.spec.ts']
protected={prefix:{'files':sum(p.startswith(prefix) for p in B['files']),'unchanged':all(sha(R/p)==v['sha256'] for p,v in B['files'].items() if p.startswith(prefix))} for prefix in ['backend/','data/','backups/','frontend/dist/','frontend/public/','frontend/src/home/','frontend/src/public/','frontend/src/navigation/','docs/evidence/sb05-1/','docs/silex-business/SB-01/','docs/silex-business/SB-02.3/']};assert all(x['unchanged'] for x in protected.values())
for p in ['frontend/src/ledger.tsx','frontend/src/ledger.css','frontend/src/ledgerPresentation.tsx','frontend/src/ui.tsx','frontend/src/styles.css','frontend/src/api.ts','frontend/src/App.tsx','frontend/src/financePlanning.tsx','frontend/src/financeCatalog.tsx','frontend/src/format.ts','frontend/src/financeDates.ts']:assert sha(R/p)==B['files'][p]['sha256']
(E/'preservation-test.json').write_text(json.dumps({'passed':True,'baseline_files':len(B['files']),'unchanged_existing':len(B['files'])-2,'modified_existing':modified,'protected_areas':protected,'financial_ast':json.loads((E/'financial-preservation.json').read_text())},indent=2))
m=json.loads((backup/'manifest.json').read_text());assert all(sha(backup/'original'/x['path'])==x['sha256'] for x in m['files']);m.update({'modified_existing':modified,'new_frontend_to_remove':new,'final_hashes':{p:sha(R/p) for p in modified+new}});(backup/'manifest.json').write_text(json.dumps(m,indent=2));(E/'backup-manifest.json').write_text(json.dumps(m,indent=2))
restore=Path(tempfile.mkdtemp(prefix='silex-sb05-2-restore-'))
for item in m['files']:
 p=restore/item['path'];p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/item['path'],p)
for rel in new:
 p=restore/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/rel,p)
for rel in modified:shutil.copy2(backup/'original'/rel,restore/rel)
for rel in new:(restore/rel).unlink()
assert {str(p.relative_to(restore)) for p in restore.rglob('*') if p.is_file()}=={x['path'] for x in m['files']};assert all(sha(restore/x['path'])==x['sha256'] for x in m['files'])
(E/'backup-integrity-final.json').write_text(json.dumps({'passed':True,'backup':str(backup),'restore_dir':str(restore),'original_files_checked':len(m['files']),'original_files_changed_restored':modified,'new_frontend_removed':new,'active_checkout_restored':False},indent=2))
checkpoint=E/'recovery-checkpoint';checkpoint.mkdir(exist_ok=True)
for rel in modified:
 p=checkpoint/'original'/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(backup/'original'/rel,p)
(checkpoint/'manifest.json').write_text(json.dumps(m,indent=2));(checkpoint/'RESTORE.md').write_text('# Recuperação SB-05.2\n\nConferir final_hashes e alterações posteriores. Restaurar somente finance.tsx e PENDENCIAS.md de original/. Remover somente os três new_frontend_to_remove após conferir hashes. Não alterar banco/backend. Registrar eventual reversão em novo commit; nada de reset/clean/force push. Documentos próprios permanecem como histórico. Backup completo externo de 66 originais foi ensaiado em /tmp; pacote contém os dois necessários para reverter arquivos modificados.\n')
source=[];adapters=json.loads((E/'historical-test-adapters.json').read_text())['files'];adapted={x['path']:x for x in adapters}
for folder in ['frontend/src','frontend/tests']:
 for p in (R/folder).rglob('*'):
  if not p.is_file():continue
  rel=str(p.relative_to(R));s=sha(p);t=sha(W/'candidate'/rel)
  assert s==t or (rel in adapted and s==adapted[rel]['original_sha256'] and t==adapted[rel]['temporary_sha256']),rel
  source.append({'path':rel,'sha256':s,'isolated_test_guard_only':rel in adapted})
(E/'tested-source-integrity.json').write_text(json.dumps({'passed':True,'files':source,'only_historical_test_directory_guards_adapted_in_temporary_copy':True},indent=2))
rows=[];counts={}
for filename in ['accounts-e2e-results.json','regression-e2e-results.json']:
 d=json.loads((E/filename).read_text());start=len(rows)
 def visit(s):
  for spec in s.get('specs',[]):
   for t in spec.get('tests',[]):rows.append({'scenario':spec['title'],'file':spec['file'],'project':t['projectName'],'status':t['status']})
  for child in s.get('suites',[]):visit(child)
 visit(d);counts[filename]=len(rows)-start
assert counts['accounts-e2e-results.json']==45 and all(x['status']=='expected' for x in rows),[(x['scenario'],x['status']) for x in rows if x['status']!='expected']
assert '65 passed' in (E/'logs/frontend-final.log').read_text() and '69 passed' in (E/'logs/backend.log').read_text();assert 'built in' in (E/'logs/build-final.log').read_text()
(E/'test-matrix.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
with (E/'test-matrix.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=['scenario','file','project','status']);w.writeheader();w.writerows(rows)
v=json.loads((E/'visual-candidate.json').read_text());q=json.loads((E/'query-comparison.json').read_text());c=json.loads((E/'contrast-regression.json').read_text());assert v['passed'] and q['passed'] and c['passed']
summary={'passed':True,'baseline_frontend':59,'frontend':65,'backend':69,'new_e2e':counts['accounts-e2e-results.json'],'regression_e2e':counts['regression-e2e-results.json'],'total_e2e':len(rows),'extra_visual_checks':len(json.loads((E/'extra-visual-checks.json').read_text())['rows']),'focus_contrast_min':min(x['contrast'] for x in json.loads((E/'extra-visual-checks.json').read_text())['rows'] if x['mode']=='focus'),'navigation_earlier_intermittent_failure_documented':True,'typescript_build':'passed','lint':'not configured','visual_baseline_captures':42,'visual_candidate_captures':63,'page_overflow':0,'new_text_contrast_failures':0,'legacy_p04_pending':True,'query_equivalent_responses':len(q['results']),'p02':'corrected and validated in payable and receivable at all three widths','p05':'partial, native date/editor and print restrictions retained','p06':'neutral expense in payable; primary income; existing cancel/reversal unchanged','production_data_used':False,'screen_reader_and_physical_devices':'not executed'};(E/'tests-summary.json').write_text(json.dumps(summary,indent=2))
images=[]
for p in sorted((E/'screenshots').glob('*.png')):
 w,h=struct.unpack('>II',p.read_bytes()[16:24]);images.append({'path':str(p.relative_to(E)),'width':w,'height':h,'sha256':sha(p)})
assert len(images)==105;(E/'screenshots-manifest.json').write_text(json.dumps({'count':105,'files':images},indent=2))
base=B['commit'];(E/'changes.diff').write_bytes(subprocess.check_output(['git','diff',base,'HEAD'],cwd=R));(E/'git-diff-stat.txt').write_bytes(subprocess.check_output(['git','diff','--stat',base,'HEAD'],cwd=R));(E/'files-changed.json').write_text(json.dumps({'baseline':base,'files':subprocess.check_output(['git','diff','--name-status',base,'HEAD'],cwd=R).decode().splitlines()},indent=2));print(json.dumps(summary))
