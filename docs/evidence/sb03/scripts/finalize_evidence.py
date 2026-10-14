"""Verify final source, preservation, recovery rehearsal and evidence manifests."""
from pathlib import Path
import csv, difflib, hashlib, json, os, shutil, struct
root=Path('/home/leofernandesc/controlmax-inspired')
evidence=Path(__file__).resolve().parents[1]
env=json.loads((evidence/'environment.json').read_text());backup=Path(env['backup']);baseline=json.loads((evidence/'baseline.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((backup/'manifest.json').read_text());paths=manifest['modified_existing']+manifest['new_files_to_remove_on_restore']
for rel in paths:manifest['final_hashes'][rel]=sha(root/rel)
for target in [backup/'manifest.json',evidence/'backup-manifest.json',evidence/'recovery-checkpoint/manifest.json']:target.write_text(json.dumps(manifest,indent=2))
restore=Path(env['work_dir'])/'restore-final'
for rel in paths:
 target=restore/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/rel,target)
for rel in manifest['modified_existing']:shutil.copy2(backup/'original'/rel,restore/rel)
for rel in manifest['new_files_to_remove_on_restore']:(restore/rel).unlink()
assert all(sha(restore/f['path'])==f['sha256'] for f in manifest['files'])
assert {str(p.relative_to(restore)) for p in restore.rglob('*') if p.is_file()}=={f['path'] for f in manifest['files']}
modified=[p for p,v in baseline['files'].items() if sha(root/p)!=v['sha256']]
assert set(modified)==set(manifest['modified_existing'])
tested=[]
for scope in ['frontend/src','frontend/tests']:
 for p in (root/scope).rglob('*'):
  if p.is_file():
   rel=str(p.relative_to(root));assert p.read_bytes()==(Path(env['work_dir'])/'candidate'/rel).read_bytes();tested.append({'path':rel,'sha256':sha(p),'matches_isolated_test_source':True})
(evidence/'tested-source-integrity.json').write_text(json.dumps({'passed':True,'files':tested},indent=2))
diff=[]
for rel in sorted(paths):
 old=(backup/'original'/rel).read_text().splitlines(True) if rel in modified else []
 diff.extend(difflib.unified_diff(old,(root/rel).read_text().splitlines(True),fromfile='before/'+rel if old else '/dev/null',tofile='after/'+rel))
(evidence/'production.diff').write_text(''.join(diff))
def test_rows(name):
 rows=[]
 def visit(s):
  for spec in s.get('specs',[]):
   for t in spec.get('tests',[]):rows.append({'scenario':spec['title'],'project':t['projectName'],'status':t['status'],'durations_ms':[r['duration'] for r in t['results']]})
  for child in s.get('suites',[]):visit(child)
 visit(json.loads((evidence/name).read_text()));return rows
new=test_rows('navigation-results.json');old=test_rows('existing-e2e-results.json');keyboard=test_rows('keyboard-final-results.json')
assert len(new)==36 and len(old)==27 and len(keyboard)==6 and all(r['status']=='expected' for r in new+old+keyboard)
(evidence/'test-matrix.json').write_text(json.dumps(new+old,indent=2,ensure_ascii=False))
with (evidence/'test-matrix.csv').open('w') as f:
 writer=csv.DictWriter(f,fieldnames=['scenario','project','status','durations_ms']);writer.writeheader();writer.writerows(new+old)
summary=json.loads((evidence/'tests-summary.json').read_text());summary['keyboard_supplementary']={'passed':6,'failed':0};summary['tested_sources_match_checkout']=True
(evidence/'tests-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False))
images=[]
for p in evidence.rglob('*.png'):
 w,h=struct.unpack('>II',p.read_bytes()[16:24]);images.append({'path':str(p.relative_to(evidence)),'width':w,'height':h,'sha256':sha(p),'kind':'contact-sheet' if 'contact-sheet' in p.name else 'screenshot'})
(evidence/'screenshots-manifest.json').write_text(json.dumps({'count':len(images),'files':images},indent=2))
# List all additions, including the files produced by packaging afterward; list itself has no self-hash.
excluded=set(baseline['excluded_directories']);current=[]
for d,dirs,names in os.walk(root):
 dirs[:]=[x for x in dirs if x not in excluded]
 for name in names:
  p=Path(d)/name
  if not p.is_symlink():current.append(str(p.relative_to(root)))
planned=['docs/evidence/sb03/files-created-modified.json','docs/evidence/sb03/SB-03-review.zip','docs/evidence/sb03/SB-03-review.zip.sha256','docs/evidence/sb03/package-integrity.json','docs/evidence/sb03/FILES.sha256']
created=sorted((set(current)|set(planned))-set(baseline['files']))
(evidence/'files-created-modified.json').write_text(json.dumps({'modified_existing':sorted(modified),'created':created,'removed_existing':[],'filelist_includes_packaging_outputs':True},indent=2))
print(json.dumps({'preservation_passed':True,'tested_sources':len(tested),'new_e2e':len(new),'existing_e2e':len(old),'supplementary_keyboard':len(keyboard),'screenshots':len(images),'created_files':len(created)}))
