"""Compare source and full baseline; rehearse controlled frontend recovery in /tmp."""
from pathlib import Path
import csv,difflib,hashlib,json,os,shutil,struct
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1];B=json.loads((E/'baseline.json').read_text());env=json.loads((E/'environment.json').read_text());backup=Path(env['backup']);excluded=set(B['excluded_directories'])
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
missing=[p for p in B['files'] if not (R/p).is_file()];assert not missing
modified=sorted(p for p,v in B['files'].items() if sha(R/p)!=v['sha256'])
expected=sorted(['frontend/src/App.tsx','frontend/src/navigation/routes.ts','frontend/src/navigation/useAppNavigation.ts','frontend/src/navigation/routes.test.ts','frontend/src/navigation/surfaces.test.ts','frontend/tests/app.spec.ts','frontend/tests/navigation.spec.ts','frontend/tests/public.spec.ts']);assert modified==expected,modified
newcode=sorted(str(p.relative_to(R)) for folder in ['frontend/src','frontend/tests'] for p in (R/folder).rglob('*') if p.is_file() and str(p.relative_to(R)) not in B['files']);assert len(newcode)==5,newcode
manifest=json.loads((backup/'manifest.json').read_text());assert all(sha(backup/'original'/p['path'])==p['sha256'] for p in manifest['files'])
manifest.update({'modified_existing':modified,'new_files_to_remove_on_restore':newcode,'final_hashes':{p:sha(R/p) for p in modified+newcode}});(backup/'manifest.json').write_text(json.dumps(manifest,indent=2));(E/'backup-manifest.json').write_text(json.dumps(manifest,indent=2))
restore=Path(env['work_dir'])/'restore-final'
for d,ds,ns in os.walk(R/'frontend'):
 ds[:]=[x for x in ds if x not in excluded]
 for n in ns:
  p=Path(d)/n
  if not p.is_symlink():t=restore/p.relative_to(R);t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,t)
for p in modified:shutil.copy2(backup/'original'/p,restore/p)
for p in newcode:(restore/p).unlink()
assert {str(p.relative_to(restore)) for p in restore.rglob('*') if p.is_file()}=={p['path'] for p in manifest['files']}
assert all(sha(restore/p['path'])==p['sha256'] for p in manifest['files'])
(backup/'RESTORE.md').write_text('# Recuperação SB-04B\n\n1. Interromper edições e conferir os 13 final_hashes. Diferenças posteriores exigem revisão manual.\n2. Copiar somente os oito modified_existing de original/ para o checkout.\n3. Remover somente os cinco new_files_to_remove_on_restore, após conferir seus hashes finais.\n4. Conferir os hashes iniciais dos 60 files; os conjuntos de caminhos devem coincidir.\n\nRestauração completa ensaiada em diretório temporário; checkout ativo não restaurado. Os originais cobrem todos os arquivos alterados pelo incremento. Nenhum banco, backend ou migração precisa de reversão. Documentos/evidências podem permanecer como histórico. Não copiar o backup indiscriminadamente sobre trabalho posterior.\n')
shutil.copytree(backup,E/'recovery-checkpoint',dirs_exist_ok=True)
(E/'backup-integrity-final.json').write_text(json.dumps({'passed':True,'backup':str(backup),'restore_dir':str(restore),'restored_existing_files':modified,'new_files_removed_in_rehearsal':newcode,'all_original_files_match':len(manifest['files']),'no_unexpected_restore_files':True},indent=2))
protected={}
for prefix in ['backend/','data/','frontend/public/','frontend/dist/','frontend/src/public/','docs/silex-business/SB-01/','docs/silex-business/SB-02.1/','docs/silex-business/SB-02.2/','docs/silex-business/SB-02.3/','docs/silex-business/SB-03/','docs/silex-business/SB-04A/','docs/evidence/sb04a/']:
 paths=[p for p in B['files'] if p.startswith(prefix)];protected[prefix]={'files':len(paths),'unchanged':all(sha(R/p)==B['files'][p]['sha256'] for p in paths)}
assert all(x['unchanged'] for x in protected.values())
old=(backup/'original/frontend/src/App.tsx').read_text();new=(R/'frontend/src/App.tsx').read_text();assert old[old.index('function Login('):]==new[new.index('function Login('):]
api=sha(R/'frontend/src/api.ts')==B['files']['frontend/src/api.ts']['sha256'];mobile=sha(R/'frontend/src/navigation/useMobileNavigation.ts')==B['files']['frontend/src/navigation/useMobileNavigation.ts']['sha256'];assert api and mobile
(E/'preservation-test.json').write_text(json.dumps({'passed':True,'baseline_files':len(B['files']),'unchanged_existing':len(B['files'])-len(modified),'modified_existing':modified,'missing_existing':missing,'protected_areas':protected,'login_and_dashboard_functions_byte_identical':True,'api_and_mobile_hook_byte_identical':True,'git_metadata_present':False},indent=2))
tested=[]
for folder in ['frontend/src','frontend/tests']:
 for p in (R/folder).rglob('*'):
  if p.is_file():rel=str(p.relative_to(R));assert p.read_bytes()==(Path(env['work_dir'])/'candidate'/rel).read_bytes();tested.append({'path':rel,'sha256':sha(p),'matches_isolated_test_source':True})
(E/'tested-source-integrity.json').write_text(json.dumps({'passed':True,'files':tested},indent=2))
diffs=[]
for p in modified+newcode:
 old=(backup/'original'/p).read_text().splitlines(True) if p in modified else []
 diffs.extend(difflib.unified_diff(old,(R/p).read_text().splitlines(True),fromfile='before/'+p if old else '/dev/null',tofile='after/'+p))
(E/'production.diff').write_text(''.join(diffs))
def matrix(filename):
 data=json.loads((E/filename).read_text());rows=[]
 def visit(s):
  for spec in s.get('specs',[]):
   for t in spec.get('tests',[]):rows.append({'scenario':spec['title'],'project':t['projectName'],'status':t['status'],'durations_ms':[r['duration'] for r in t['results']]})
  for child in s.get('suites',[]):visit(child)
 visit(data);return rows
rows=matrix('e2e-results.json')+matrix('operational-results.json');assert len(rows)==108 and all(x['status']=='expected' for x in rows)
(E/'test-matrix.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
with (E/'test-matrix.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=['scenario','project','status','durations_ms']);w.writeheader();w.writerows(rows)
visual=json.loads((E/'visual-matrix.json').read_text());assert visual['passed']
(E/'tests-summary.json').write_text(json.dumps({'passed':True,'baseline_frontend':48,'frontend':54,'backend':69,'new_home_e2e':24,'navigation_e2e':36,'public_e2e':21,'operational_e2e':27,'total_e2e':108,'build_typescript':'passed','format':'passed for new/scoped files; existing legacy formatting preserved','lint':'not configured','visual_captures':len(visual['rows']),'api_comparison':json.loads((E/'query-comparison.json').read_text())['passed'],'real_screen_reader':'not executed','production_data_used':False},indent=2))
images=[]
for p in (E/'screenshots').glob('*.png'):
 width,height=struct.unpack('>II',p.read_bytes()[16:24]);images.append({'path':str(p.relative_to(E)),'width':width,'height':height,'sha256':sha(p)})
(E/'screenshots-manifest.json').write_text(json.dumps({'count':len(images),'files':images},indent=2))
(R/'docs/silex-business/SB-04B/ARQUIVOS.md').write_text('# Arquivos SB-04B\n\nExistentes modificados:\n\n'+''.join('- `'+p+'`\n' for p in modified)+'\nNovos de código/testes:\n\n'+''.join('- `'+p+'`\n' for p in newcode)+'\nOito existentes (três fontes e cinco testes), cinco novos (três fontes e dois testes). CSS global, página pública, componentes operacionais, backend, banco e evidências anteriores não alterados. Todos os documentos/scripts/evidências novos ficam somente sob SB-04B/sb04b. Relação integral: files-created-modified.json.\n')
current=[]
for d,ds,ns in os.walk(R):
 ds[:]=[x for x in ds if x not in excluded]
 for n in ns:
  p=Path(d)/n
  if not p.is_symlink():current.append(str(p.relative_to(R)))
planned=[f'docs/evidence/sb04b/{p}' for p in ['files-created-modified.json','SB-04B-review.zip','SB-04B-review.zip.sha256','FILES.sha256','package-integrity.json']]
(E/'files-created-modified.json').write_text(json.dumps({'modified_existing':modified,'created':sorted((set(current)|set(planned))-set(B['files'])),'removed_existing':[]},indent=2))
print(json.dumps({'modified':len(modified),'newcode':len(newcode),'preserved':len(B['files'])-len(modified),'restored':len(manifest['files']),'e2e':len(rows),'tested_source_files':len(tested)}))
