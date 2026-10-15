"""Rehearse rollback only in a temporary tree; preserve all approved files/evidence."""
from pathlib import Path
import hashlib,json,shutil,subprocess,tarfile,tempfile
S=json.loads(Path('/tmp/silex-sb07a-state.json').read_text());R=Path(S['root']);B=Path(S['backup']);E=R/'docs/evidence/sb07a';base=json.loads((B/'baseline.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(B/'approved.tar')==base['archive_sha256']
changed=[p for p,h in base['tracked'].items() if sha(R/p)!=h]
assert set(changed)<=set(S['allowed'])
current=subprocess.check_output(['git','ls-files','-z'],cwd=R).decode().split('\0')[:-1]+subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=R).decode().split('\0')[:-1]
new=sorted(set(current)-set(base['tracked']))
assert all(p.startswith(('docs/evidence/sb07a/scripts/','docs/silex-business/SB-07A/')) or p in ['frontend/src/overview.css','frontend/tests/content-dates.spec.ts'] for p in new),new
for p,h in base['protected'].items():assert sha(R/p)==h,p
with tempfile.TemporaryDirectory(prefix='silex-sb07a-restore-') as directory:
 t=Path(directory);tarfile.open(B/'approved.tar').extractall(t,filter='data')
 for p in changed:
  original=B/'original'/p;original.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(t/p,original)
 for p in changed+new:
  (t/p).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/p,t/p)
 for p in changed:shutil.copy2(B/'original'/p,t/p)
 for p in new:(t/p).unlink()
 assert all(sha(t/p)==h for p,h in base['tracked'].items())
result={'approved_head':S['head'],'candidate_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip(),'changed':changed,'new_to_remove_on_rollback':new,'baseline_hashes':base['tracked'],'protected_hashes':base['protected'],'restore_rehearsal':'passed','original_files_restored':len(base['tracked']),'backup':str(B),'archive_sha256':base['archive_sha256']}
(B/'manifest.json').write_text(json.dumps(result,indent=2));(E/'recovery-test.json').write_text(json.dumps(result,indent=2));(E/'candidate-sha256.json').write_text(json.dumps({p:sha(R/p) for p in sorted(set(current))},indent=2));print('Restored original hashes',len(base['tracked']),'changed',len(changed),'new',len(new))
