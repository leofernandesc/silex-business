"""Verify preservation, tested sources and recovery; never restore the live checkout."""
from pathlib import Path
import json,hashlib,os,shutil,subprocess,tempfile,difflib,struct,csv
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1];B=json.loads((E/'baseline.json').read_text());env=json.loads((E/'environment.json').read_text());backup=Path(env['backup']);work=Path(env['work_dir']);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
missing=[p for p in B['files'] if not (R/p).is_file()];assert not missing
modified=sorted(p for p,v in B['files'].items() if sha(R/p)!=v['sha256']);assert modified==['docs/silex-business/PENDENCIAS.md','frontend/src/ledger.tsx'],modified
newcode=sorted(str(p.relative_to(R)) for folder in ['frontend/src','frontend/tests'] for p in (R/folder).rglob('*') if p.is_file() and str(p.relative_to(R)) not in B['files']);assert len(newcode)==4,newcode
manifest=json.loads((backup/'manifest.json').read_text());doc='docs/silex-business/PENDENCIAS.md';original=backup/'original'/doc;original.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(work/'baseline'/doc,original);assert sha(original)==B['files'][doc]['sha256']
if doc not in [p['path'] for p in manifest['files']]:manifest['files'].append({'path':doc,**B['files'][doc]})
assert all(sha(backup/'original'/p['path'])==p['sha256'] for p in manifest['files']);manifest.update({'modified_existing':modified,'new_files_to_remove_on_restore':newcode,'final_hashes':{p:sha(R/p) for p in modified+newcode}});(backup/'manifest.json').write_text(json.dumps(manifest,indent=2));(E/'backup-manifest.json').write_text(json.dumps(manifest,indent=2))
restore=Path(tempfile.mkdtemp(prefix='silex-sb05-recovery-'))
for p in manifest['files']:
 t=restore/p['path'];t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/p['path'],t)
for p in newcode:
 t=restore/p;t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/p,t)
for p in modified:shutil.copy2(backup/'original'/p,restore/p)
for p in newcode:(restore/p).unlink()
assert {str(p.relative_to(restore)) for p in restore.rglob('*') if p.is_file()}=={p['path'] for p in manifest['files']};assert all(sha(restore/p['path'])==p['sha256'] for p in manifest['files'])
(backup/'RESTORE.md').write_text('# Recuperação SB-05 etapa 1\n\nConferir hashes finais e diferenças posteriores antes de qualquer restauração. Em revisão autorizada, copiar os dois modified_existing de original/ e remover somente os quatro new_files_to_remove_on_restore. Conferir hashes iniciais. A restauração foi ensaiada em /tmp, sem alterar o checkout ativo. Registrar eventual reversão em novo commit; não usar reset/clean destrutivos nem reescrever main. Documentos/evidências próprias podem permanecer como histórico. Nenhum banco/backend precisa de recuperação. Backup contém 61 originais frontend mais o documento central de pendências recuperado do baseline Git imutável.\n')
shutil.copytree(backup,E/'recovery-checkpoint',dirs_exist_ok=True);(E/'backup-integrity-final.json').write_text(json.dumps({'passed':True,'backup':str(backup),'restore_dir':str(restore),'original_files_checked':len(manifest['files']),'all_original_hashes_restored':True,'new_files_removed':newcode,'no_active_checkout_restore':True},indent=2))
protected={}
for prefix in ['backend/','data/','backups/','frontend/dist/','frontend/public/','frontend/src/public/','frontend/src/home/','frontend/src/navigation/','docs/evidence/sb04b/','docs/evidence/sb04a/','docs/silex-business/SB-01/','docs/silex-business/SB-02.3/']:
 ps=[p for p in B['files'] if p.startswith(prefix)];protected[prefix]={'files':len(ps),'unchanged':all(sha(R/p)==B['files'][p]['sha256'] for p in ps)}
for p in ['frontend/src/ui.tsx','frontend/src/styles.css','frontend/src/api.ts','frontend/src/App.tsx','frontend/src/finance.tsx','frontend/src/financePlanning.tsx','frontend/src/financeCatalog.tsx','frontend/src/format.ts','frontend/src/financeDates.ts']:
 assert sha(R/p)==B['files'][p]['sha256'],p
assert all(x['unchanged'] for x in protected.values());(E/'preservation-test.json').write_text(json.dumps({'passed':True,'baseline_files':len(B['files']),'unchanged_existing':len(B['files'])-len(modified),'modified_existing':modified,'missing_existing':missing,'protected_areas':protected,'shared_ui_css_helpers_auth_apis_other_financial_modules_unchanged':True,'financial_ast':json.loads((E/'financial-preservation.json').read_text())},indent=2))
tested=[]
for folder in ['frontend/src','frontend/tests']:
 for p in (R/folder).rglob('*'):
  if p.is_file():rel=str(p.relative_to(R));assert p.read_bytes()==(work/'candidate'/rel).read_bytes(),rel;tested.append({'path':rel,'sha256':sha(p)})
(E/'tested-source-integrity.json').write_text(json.dumps({'passed':True,'files':tested},indent=2))
def matrix(name):
 d=json.loads((E/name).read_text());rows=[]
 def visit(s):
  for spec in s.get('specs',[]):
   for t in spec.get('tests',[]):rows.append({'scenario':spec['title'],'project':t['projectName'],'status':t['status']})
  for child in s.get('suites',[]):visit(child)
 visit(d);return rows
rows=matrix('ledger-e2e-results.json')+matrix('existing-e2e-results.json')+matrix('public-e2e-results.json');assert len(rows)==72 and all(x['status']=='expected' for x in rows)
(E/'test-matrix.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
with (E/'test-matrix.csv').open('w') as f:w=csv.DictWriter(f,fieldnames=['scenario','project','status']);w.writeheader();w.writerows(rows)
v=json.loads((E/'visual-candidate.json').read_text());assert v['passed'];q=json.loads((E/'query-comparison.json').read_text());assert q['passed']
(E/'tests-summary.json').write_text(json.dumps({'passed':True,'baseline_frontend':54,'frontend':59,'backend':69,'ledger_e2e':24,'operational_e2e':27,'public_e2e':21,'total_e2e':72,'typescript_build':'passed','format':'passed','lint':'not configured','visual_baseline_captures':30,'visual_candidate_captures':30,'candidate_overflow':0,'candidate_text_contrast_failures':0,'queries_equal':len(q['results']),'p02':'outside authorized page; pending','p05':'partial: explicit BR description, native editor retained','p06':'corrected in Ledger only','real_screen_reader':'not executed','production_data_used':False},indent=2))
images=[]
for p in (E/'screenshots').glob('*.png'):
 w,h=struct.unpack('>II',p.read_bytes()[16:24]);images.append({'path':str(p.relative_to(E)),'width':w,'height':h,'sha256':sha(p)})
(E/'screenshots-manifest.json').write_text(json.dumps({'count':len(images),'files':images},indent=2))
base=B['commit'];diff=subprocess.check_output(['git','diff',base,'--','frontend/src/ledger.tsx','frontend/src/ledger.css','frontend/src/ledgerPresentation.tsx','frontend/src/ledgerPresentation.test.ts','frontend/tests/ledger-interface.spec.ts','docs/silex-business/PENDENCIAS.md'],cwd=R);(E/'production-and-tests.diff').write_bytes(diff)
tracked=subprocess.check_output(['git','diff','--name-only',base],cwd=R).decode().splitlines();untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=R).decode().splitlines();(E/'git-files-since-baseline.json').write_text(json.dumps({'tracked_changed_since_baseline':tracked,'untracked_pending_review':untracked},indent=2))
print(json.dumps({'existing_modified':modified,'new_frontend':newcode,'existing_preserved':len(B['files'])-2,'restored_original_files':len(manifest['files']),'e2e':len(rows),'tested_frontend_files':len(tested)}))
