"""Verify zero product changes; rehearse docs/instrument rollback in a temporary tree."""
from pathlib import Path
import hashlib,io,json,os,shutil,subprocess,tarfile,tempfile
s=json.loads(Path(os.environ['SILEX_STATE']).read_text());r=Path(s['root']);b=Path(s['backup']);e=r/'docs/evidence/sb06e';base=json.loads((b/'baseline.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
assert sha(b/'approved.tar')==base['archive_sha256']
changed=[p for p,h in base['tracked'].items() if not (r/p).is_file() or sha(r/p)!=h]
assert set(changed)<= {'docs/silex-business/PENDENCIAS.md'},changed
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=r).decode().split('\0')[:-1]
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=r).decode().split('\0')[:-1]
added=sorted(set(tracked+untracked)-set(base['tracked']))
assert all(p.startswith(('docs/silex-business/SB-06E/','docs/evidence/sb06e/scripts/')) for p in added),added
for p,h in base['protected'].items():assert sha(r/p)==h,p
for p in changed:assert sha(b/'original'/p)==base['tracked'][p]
with tempfile.TemporaryDirectory(prefix='silex-sb06e-restore-') as directory:
 t=Path(directory);tarfile.open(fileobj=io.BytesIO((b/'approved.tar').read_bytes())).extractall(t,filter='data')
 for p in changed+added:
  dest=t/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(r/p,dest)
 for p in changed:shutil.copy2(b/'original'/p,t/p)
 for p in added:(t/p).unlink()
 assert all(sha(t/p)==h for p,h in base['tracked'].items())
 assert all(not(t/p).exists() for p in added)
branches=[]
for name in subprocess.check_output(['git','branch','--format=%(refname:short)'],cwd=r,text=True).splitlines():
 tip=subprocess.check_output(['git','rev-parse',name],cwd=r,text=True).strip();ancestor=subprocess.run(['git','merge-base','--is-ancestor',tip,'HEAD'],cwd=r).returncode==0
 branches.append({'branch':name,'head':tip,'ancestor_of_candidate':ancestor})
 assert ancestor,name
product=[p for p in base['tracked'] if p.startswith(('frontend/src/','frontend/public/','backend/','scripts/')) or p in ['frontend/package.json','frontend/package-lock.json','frontend/index.html','Makefile']]
result={'approved_head':s['head'],'candidate_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=r,text=True).strip(),'approved_tracked_files':len(base['tracked']),'changed_existing':changed,'new_files_to_remove':added,'product_files_verified_unchanged':len(product),'backend_unchanged':True,'database_files_unchanged':[p for p in base['protected'] if p.startswith('data/')],'protected_sha256':base['protected'],'archive_sha256':base['archive_sha256'],'backup_path':str(b),'restore_rehearsal':'passed','all_original_files_restored':len(base['tracked']),'all_new_files_removed_on_rehearsal':True,'branches':branches,'all_checks_passed':True}
(b/'manifest.json').write_text(json.dumps(result,indent=2));(e/'preservation-test.json').write_text(json.dumps(result,indent=2));(e/'baseline-sha256.json').write_text(json.dumps(base,indent=2));(e/'candidate-sha256.json').write_text(json.dumps({p:sha(r/p) for p in sorted(set(tracked+untracked))},indent=2));print(json.dumps({k:result[k] for k in ['changed_existing','product_files_verified_unchanged','restore_rehearsal','all_checks_passed']},indent=2))
