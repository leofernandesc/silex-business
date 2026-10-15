"""Rehearse exact rollback in a temporary directory, never overwrite the checkout."""
from pathlib import Path
import hashlib,json,shutil,subprocess,tarfile,tempfile,sys
ROOT=Path(__file__).resolve().parents[4];E=ROOT/'docs/evidence/sb07c'
baseline=json.loads((E/'baseline.json').read_text());archive=Path(baseline['backup'])/'approved.tar'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(archive)==baseline['archive_sha256']
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0');files=sorted(set(f for f in files if f and (ROOT/f).is_file()))
new=sorted(set(files)-set(baseline['tracked']));changed=[p for p,h in baseline['tracked'].items() if sha(ROOT/p)!=h]
with tempfile.TemporaryDirectory(prefix='silex-sb07c-recovery-') as directory:
    dest=Path(directory)
    for file in files:
        target=dest/file;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/file,target)
    with tarfile.open(archive) as tar:tar.extractall(dest,filter='data')
    for file in new:(dest/file).unlink()
    restored={str(p.relative_to(dest)):sha(p) for p in dest.rglob('*') if p.is_file()}
    assert restored==baseline['tracked'], 'Rollback did not restore exact original file set'
    dependency_check={"executed":False}
    if '--validate-build' in sys.argv:
        with (E/'restoration-build.log').open('w') as log:
            commands=[['npm','ci','--offline','--ignore-scripts','--no-audit','--fund=false'],['npm','run','build'],['npm','test']]
            codes=[]
            for command in commands:
                code=subprocess.run(command,cwd=dest/'frontend',stdout=log,stderr=subprocess.STDOUT).returncode;codes.append(code)
                if code:break
        dependency_check={"executed":True,"commands":commands,"exit_codes":codes,"offline":True,"temporary_only":True,"passed":len(codes)==3 and not any(codes)}
    result={'approved_head':baseline['approved_head'],'archive_sha256':sha(archive),'archive_verified':True,'restored_files':len(restored),'all_original_hashes_match':True,'added_files_removed':new,'changed_original_files':changed,'temporary_directory_only':True,'production_checkout_restored':False,'database_backup_included':False,'dependency_rollback':dependency_check}
(E/'restoration-test.json').write_text(json.dumps(result,indent=2))
manifest={p:{'before':baseline['tracked'].get(p),'after':sha(ROOT/p),'status':'added' if p in new else 'modified' if p in changed else 'preserved'} for p in files}
(E/'sha256-files.json').write_text(json.dumps(manifest,indent=2))
(E/'file-inventory.json').write_text(json.dumps({'modified':changed,'added':new,'protected_count':len(files)-len(new)-len(changed)},indent=2))
print('Rollback rehearsed:',len(restored),'original files restored exactly; new files removed only in temporary copy')
