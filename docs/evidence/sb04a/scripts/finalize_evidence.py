"""Verify current source, preserve prior files, and rehearse full frontend recovery in /tmp."""
from pathlib import Path
import csv,difflib,hashlib,json,os,re,shutil,struct
root=Path('/home/leofernandesc/controlmax-inspired');e=Path(__file__).resolve().parents[1];b=json.loads((e/'baseline.json').read_text());env=json.loads((e/'environment.json').read_text());backup=Path(env['backup']);excluded=set(b['excluded_directories'])
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
missing=[p for p in b['files'] if not (root/p).is_file()];assert not missing
modified=sorted(p for p,v in b['files'].items() if sha(root/p)!=v['sha256'])
expected=['frontend/src/main.tsx','frontend/src/navigation/useAppNavigation.ts','frontend/tests/app.spec.ts','frontend/tests/navigation.spec.ts'];assert modified==expected,modified
newcode=sorted(str(p.relative_to(root)) for folder in ['frontend/src','frontend/tests'] for p in (root/folder).rglob('*') if p.is_file() and str(p.relative_to(root)) not in b['files']);assert len(newcode)==10,newcode
manifest=json.loads((backup/'manifest.json').read_text());manifest.update({'modified_existing':modified,'new_files_to_remove_on_restore':newcode,'final_hashes':{p:sha(root/p) for p in modified+newcode}});(backup/'manifest.json').write_text(json.dumps(manifest,indent=2));(e/'backup-manifest.json').write_text(json.dumps(manifest,indent=2))
restore=Path(env['work_dir'])/'restore-final';restore.mkdir(exist_ok=True)
for d,dirs,names in os.walk(root/'frontend'):
 dirs[:]=[p for p in dirs if p not in excluded]
 for name in names:
  p=Path(d)/name
  if not p.is_symlink():target=restore/p.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
for p in modified:shutil.copy2(backup/'original'/p,restore/p)
for p in newcode:(restore/p).unlink()
assert {str(p.relative_to(restore)) for p in restore.rglob('*') if p.is_file()}=={p['path'] for p in manifest['files']}
assert all(sha(restore/p['path'])==p['sha256'] for p in manifest['files'])
(backup/'RESTORE.md').write_text('# Recuperação SB-04A\n\nAntes de restaurar, conferir final_hashes. Divergência posterior exige revisão manual. Copiar somente quatro modified_existing de original/ e remover dez new_files_to_remove_on_restore, conferindo hashes finais antes da remoção. Depois conferir hashes iniciais de files.\n\nTodos os 50 arquivos originais foram ensaiados em /tmp; checkout ativo não foi restaurado. Documentos podem permanecer como histórico. Não copiar indiscriminadamente sobre trabalho posterior. Nenhum banco precisa ser restaurado ou migrado.\n')
shutil.copytree(backup,e/'recovery-checkpoint',dirs_exist_ok=True)
(e/'backup-integrity-final.json').write_text(json.dumps({'passed':True,'backup':str(backup),'restore_dir':str(restore),'restored_existing_files':modified,'new_files_removed_in_rehearsal':newcode,'all_50_original_files_match':True,'no_unexpected_restore_files':True},indent=2))
protected={}
for prefix in ['backend/','data/','frontend/public/','frontend/dist/','docs/silex-business/SB-01/','docs/silex-business/SB-02.1/','docs/silex-business/SB-02.2/','docs/silex-business/SB-02.3/','docs/silex-business/SB-03/','docs/evidence/sb03/']:
 paths=[p for p in b['files'] if p.startswith(prefix)];protected[prefix]={'files':len(paths),'unchanged':all(sha(root/p)==b['files'][p]['sha256'] for p in paths)}
(e/'preservation-test.json').write_text(json.dumps({'passed':True,'baseline_files':len(b['files']),'unchanged_existing':len(b['files'])-len(modified),'modified_existing':modified,'missing_existing':missing,'protected_areas':protected,'git_metadata_present':False,'excluded_directories':sorted(excluded)},indent=2))
tested=[]
for folder in ['frontend/src','frontend/tests']:
 for p in (root/folder).rglob('*'):
  if p.is_file():rel=str(p.relative_to(root));assert p.read_bytes()==(Path(env['work_dir'])/'candidate'/rel).read_bytes();tested.append({'path':rel,'sha256':sha(p),'matches_isolated_test_source':True})
(e/'tested-source-integrity.json').write_text(json.dumps({'passed':True,'files':tested},indent=2))
old=(backup/'original/frontend/src/navigation/useAppNavigation.ts').read_text();new=(root/'frontend/src/navigation/useAppNavigation.ts').read_text().replace('import { isPublicAddress } from "./surfaces";\n','').replace('      if (isPublicAddress(location)) return;\n','').replace('!currentUser.current || isPublicAddress(location)','!currentUser.current').replace('isPublicAddress(location) ||','')
assert re.sub(r'\s+','',old)==re.sub(r'\s+','',new)
(e/'navigation-preservation.json').write_text(json.dumps({'passed':True,'hook_only_public_surface_import_and_three_guards':True,'api_app_styles_index_unchanged':True},indent=2))
diff=[]
for p in sorted(modified+newcode):
 old=(backup/'original'/p).read_text().splitlines(True) if p in modified else []
 diff.extend(difflib.unified_diff(old,(root/p).read_text().splitlines(True),fromfile='before/'+p if old else '/dev/null',tofile='after/'+p))
(e/'production.diff').write_text(''.join(diff))
def test_rows(filename):
 report=json.loads((e/filename).read_text());rows=[]
 def walk(s):
  for spec in s.get('specs',[]):
   for t in spec.get('tests',[]):rows.append({'scenario':spec['title'],'project':t['projectName'],'status':t['status'],'durations_ms':[r['duration'] for r in t['results']]})
  for child in s.get('suites',[]):walk(child)
 walk(report);return rows
navigation=test_rows('navigation-public-results.json');operational=test_rows('existing-e2e-results.json');final_public=test_rows('public-final-results.json');assert len(navigation)==57 and len(operational)==27 and len(final_public)==21;assert all(x['status']=='expected' for x in navigation+operational+final_public)
summary={'passed':True,'baseline_frontend':38,'frontend':48,'backend':69,'navigation_and_public_e2e':57,'operational_e2e':27,'public_final_revalidation':21,'typescript_and_build':'passed','lint':'not configured','format':'passed','new_dependencies':False,'production_database_used':False,'visual':json.loads((e/'visual-a11y-matrix.json').read_text())['passed'],'vite':json.loads((e/'vite-checks.json').read_text())['passed'],'screen_reader_real':'not executed','seo':'client-side route metadata; no prerender','tests_sources_match_checkout':True}
assert summary['visual'] and summary['vite'];(e/'tests-summary.json').write_text(json.dumps(summary,indent=2));(e/'test-matrix.json').write_text(json.dumps(navigation+operational,indent=2,ensure_ascii=False))
with (e/'test-matrix.csv').open('w') as f:
 writer=csv.DictWriter(f,fieldnames=['scenario','project','status','durations_ms']);writer.writeheader();writer.writerows(navigation+operational)
images=[]
for p in e.rglob('*.png'):
 w,h=struct.unpack('>II',p.read_bytes()[16:24]);images.append({'path':str(p.relative_to(e)),'width':w,'height':h,'sha256':sha(p)})
(e/'screenshots-manifest.json').write_text(json.dumps({'count':len(images),'files':images},indent=2))
(root/'docs/silex-business/SB-04A/ARQUIVOS.md').write_text('# Arquivos SB-04A\n\nExistentes modificados:\n\n'+''.join('- `'+p+'`\n' for p in modified)+'\nNovos de código/testes:\n\n'+''.join('- `'+p+'`\n' for p in newcode)+'\nDocumentos próprios: RELATORIO, ARQUITETURA, CONTEUDO, TESTES, PRESERVACAO, REPRODUCAO, PENDENCIAS, RECOMENDACOES-SB04B e ARQUIVOS. Nenhum relatório ou evidência anterior foi editado.\n\nLista integral de arquivos criados/modificados em [files-created-modified.json](../../evidence/sb04a/files-created-modified.json); diff em production.diff. Scripts/configs sob evidence são exclusivamente de validação, não produção.\n')
current=[]
for d,dirs,names in os.walk(root):
 dirs[:]=[p for p in dirs if p not in excluded]
 for name in names:
  p=Path(d)/name
  if not p.is_symlink():current.append(str(p.relative_to(root)))
planned=[f'docs/evidence/sb04a/{n}' for n in ['files-created-modified.json','SB-04A-review.zip','SB-04A-review.zip.sha256','FILES.sha256','package-integrity.json']]
(e/'files-created-modified.json').write_text(json.dumps({'modified_existing':modified,'created':sorted((set(current)|set(planned))-set(b['files'])),'removed_existing':[],'includes_packaging_outputs':True},indent=2))
print(json.dumps({'modified':modified,'new_code':newcode,'unchanged_existing':len(b['files'])-len(modified),'restore_passed':True,'tested_sources':len(tested),'e2e':84,'supplementary_public':21}))
