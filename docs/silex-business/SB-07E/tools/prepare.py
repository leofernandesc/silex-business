"""Snapshot approved tracked files; read-only Git ancestry audit; no ref changes."""
from pathlib import Path
import subprocess as sp,json,hashlib,tarfile,tempfile,os
R=Path(__file__).resolve().parents[4]; E=R/'docs/evidence/sb07e'; E.mkdir(exist_ok=True)
def git(*a):return sp.check_output(['git',*a],cwd=R).decode().strip()
head=git('rev-parse','HEAD'); assert head=='62083832fff50c7641efbe61d54d0259dbea0476'
assert git('branch','--show-current')=='test/sb07e-integrated-validation'
assert not git('diff','--name-only') and not git('diff','--cached','--name-only')
files=git('ls-files','-z').split('\0');files=[p for p in files if p]
tracked={p:hashlib.sha256((R/p).read_bytes()).hexdigest() for p in files}
backup=Path.home()/'.local/share/codex-backups/controlmax-inspired/sb07e';backup.mkdir(parents=True,exist_ok=True)
archive=backup/'approved.tar';assert not archive.exists(),'Never overwrite backup'
with tarfile.open(archive,'w') as tar:
 for p in files:tar.add(R/p,arcname=p,recursive=False)
with tempfile.TemporaryDirectory(prefix='silex-sb07e-verify-') as d:
 with tarfile.open(archive) as tar:tar.extractall(d,filter='data')
 assert {p:hashlib.sha256((Path(d)/p).read_bytes()).hexdigest() for p in files}==tracked
state={'approved_head':head,'backup':str(backup),'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'tracked':tracked,'baseline_status':git('status','--short'),'branch':git('branch','--show-current'),'backup_verified':True}
(E/'baseline.json').write_text(json.dumps(state,indent=2))
fsck=sp.run(['git','fsck','--full'],cwd=R,capture_output=True,text=True);(E/'git-fsck.log').write_text(fsck.stdout+fsck.stderr);assert fsck.returncode==0
branches=[]
for row in git('for-each-ref','--format=%(refname:short) %(objectname)','refs/heads').splitlines():
 name,sha=row.split(); ancestor=sp.run(['git','merge-base','--is-ancestor',sha,head],cwd=R).returncode==0
 branches.append({'branch':name,'head':sha,'ancestor_of_approved':ancestor})
commits=git('log','--reverse','--format=%H %s','main..HEAD').splitlines()
result={'approved_head':head,'main':git('rev-parse','main'),'merge_base':git('merge-base','main','HEAD'),'counts_main_head':git('rev-list','--left-right','--count','main...HEAD'),'branches':branches,'commits_not_in_main':commits,'fast_forward_possible':git('merge-base','main','HEAD')==git('rev-parse','main'),'remotes':git('remote','-v'),'first_commit':git('rev-list','--max-parents=0','HEAD'),'tracked_count':len(files),'diff_stat':git('diff','--stat','main..HEAD'),'diff_paths':git('diff','--name-status','main..HEAD'),'fsck_passed':True}
(E/'git-audit.json').write_text(json.dumps(result,indent=2));print(len(files),'baseline files verified;',len(commits),'commits ahead of main; FF',result['fast_forward_possible'])
