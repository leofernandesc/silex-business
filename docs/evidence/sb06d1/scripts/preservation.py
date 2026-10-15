"""Verify scope and rehearse restoration exclusively in a temporary directory."""
from pathlib import Path
import hashlib
import io
import json
import os
import shutil
import subprocess
import tarfile
import tempfile

S = json.loads(Path(os.environ['SILEX_STATE']).read_text())
R, B = Path(S['root']), Path(S['backup'])
E = R / 'docs/evidence/sb06d1'
base = json.loads((B/'baseline.json').read_text())
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
changed = [p for p,h in base['tracked'].items() if not (R/p).is_file() or digest(R/p)!=h]
assert set(changed) <= {'frontend/src/format.ts','frontend/src/financePlanning.tsx','docs/silex-business/PENDENCIAS.md'}, changed
tracked = subprocess.check_output(['git','ls-files','-z'],cwd=R).decode().split('\0')[:-1]
untracked = subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=R).decode().split('\0')[:-1]
added = sorted(set(tracked+untracked)-set(base['tracked']))
allowed = ('docs/silex-business/SB-06D.1/','docs/evidence/sb06d1/scripts/','frontend/tests/date-presentation.spec.ts','frontend/src/datePresentation.test.ts','frontend/src/reportDates.ts')
assert all(p.startswith(allowed) for p in added), added
for rel,h in base['protected'].items():assert digest(R/rel)==h, rel
for rel in changed:assert digest(B/'original'/rel)==base['tracked'][rel]
# Simulate the entire approved tracked tree, apply this increment, then restore.
with tempfile.TemporaryDirectory(prefix='silex-sb06d1-restore-') as directory:
    target=Path(directory)
    raw=subprocess.check_output(['git','archive',S['head']],cwd=R)
    tarfile.open(fileobj=io.BytesIO(raw)).extractall(target,filter='data')
    for rel in changed+added:
        p=target/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/rel,p)
    for rel in changed:shutil.copy2(B/'original'/rel,target/rel)
    for rel in added:(target/rel).unlink()
    assert all(digest(target/rel)==h for rel,h in base['tracked'].items())
    assert all(not (target/rel).exists() for rel in added)
manifest={'baseline_head':S['head'],'branch':subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip(),'original_files':{p:base['tracked'][p] for p in changed},'new_files_to_remove_on_rollback':added,'restore_rehearsal':'passed','all_approved_tracked_files_restored':len(base['tracked'])}
(B/'manifest.json').write_text(json.dumps(manifest,indent=2))
(E/'baseline-sha256.json').write_text(json.dumps(base,indent=2))
(E/'candidate-sha256.json').write_text(json.dumps({p:digest(R/p) for p in sorted(set(tracked+untracked))},indent=2))
# Previous evidence archives that ship a checksum retain that checksum.
history=[]
for checksum in sorted((R/'docs/evidence').glob('*/*.zip.sha256')):
    if checksum.parent==E:continue
    archive=checksum.with_suffix('')
    if not archive.is_file():continue
    expected=checksum.read_text().split()[0]
    valid=digest(archive)==expected
    history.append({'archive':str(archive.relative_to(R)),'sha256_valid':valid})
    assert valid, archive
result={'baseline_head':S['head'],'candidate_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'backup_path':str(B),'changed_existing_files':changed,'added_files':added,'unchanged_approved_tracked_files':len(base['tracked'])-len(changed),'backend_unchanged':all(digest(R/p)==h for p,h in base['tracked'].items() if p.startswith('backend/')),'persistent_database_files_unchanged':list(base['protected']),'restoration':manifest,'historical_archives':history,'all_checks_passed':True}
(E/'preservation-test.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:result[k] for k in ['changed_existing_files','unchanged_approved_tracked_files','backend_unchanged','all_checks_passed']},indent=2))
