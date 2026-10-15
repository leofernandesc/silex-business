"""Recover ephemeral runtime copies from the verified backup; never initialize Git or read real DBs."""
from pathlib import Path
import hashlib,io,json,os,shutil,sqlite3,subprocess,tarfile,tempfile
r=Path(__file__).resolve().parents[4];e=r/'docs/evidence/sb06e';b=Path.home()/'.local/share/codex-backups/controlmax-inspired/sb06e/silex-sb06e-l_2u6njd';base=json.loads((b/'baseline.json').read_text())
assert base['head']=='dfa489a49fd7c59e6ca89a1ce6824f2f0a42ee35'
assert hashlib.sha256((b/'approved.tar').read_bytes()).hexdigest()==base['archive_sha256']
w=Path(tempfile.mkdtemp(prefix='silex-sb06e-'));s={'root':str(r),'head':base['head'],'work':str(w),'backup':str(b),'ephemeral_reconstruction':True}
for v in ['baseline','candidate']:
 t=w/v;t.mkdir();tarfile.open(b/'approved.tar').extractall(t,filter='data');(t/'.venv').symlink_to(r/'.venv');(t/'frontend/node_modules').symlink_to(r/'frontend/node_modules')
for key in ['baseline_fixture','candidate_fixture','functional','modal_functional']:
 d=Path(tempfile.mkdtemp(prefix='silex-sb04b-sb06e-'+key+'-'));s[key]=str(d);(d/'env.json').write_text(json.dumps({'work_dir':str(d),'persistent_database_used':False}))
Path('/tmp/silex-sb06e-state.json').write_text(json.dumps(s,indent=2));(e/'environment.json').write_text(json.dumps(s,indent=2));print(json.dumps(s,indent=2))
