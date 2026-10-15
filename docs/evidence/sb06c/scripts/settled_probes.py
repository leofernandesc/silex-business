"""Serial browser captures; the caller supplies demo credentials via environment."""
from pathlib import Path
import json, os, shutil, subprocess

R=Path(__file__).resolve().parents[4]
E=R/'docs/evidence/sb06c'
assert os.environ.get('SILEX_TEST_PASSWORD'), 'Disposable demo password required'
if not (E/'initial-screenshots').exists():
 shutil.move(E/'screenshots',E/'initial-screenshots')
 (E/'screenshots').mkdir()
 for v in ['baseline','candidate']:
  shutil.copy2(E/(v+'-audit.json'),E/(v+'-initial-audit.json'))
for variant,port in [('baseline',18571),('candidate',18572)]:
 env={**os.environ,'SILEX_FRONTEND':str(R/'frontend'),'SILEX_EVIDENCE':str(E),'SILEX_VARIANT':variant,'SILEX_ORIGIN':f'http://127.0.0.1:{port}','SILEX_SETTLED_ONLY':'1'}
 with (E/'logs'/f'{variant}-settled.log').open('w') as log:
  subprocess.run(['node',str(E/'scripts/audit.cjs')],cwd=R,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
env={**os.environ,'SILEX_FRONTEND':str(R/'frontend'),'SILEX_EVIDENCE':str(E),'SILEX_BASELINE':'http://127.0.0.1:18571','SILEX_CANDIDATE':'http://127.0.0.1:18572'}
with (E/'logs/extra-final.log').open('w') as log:
 subprocess.run(['node',str(E/'scripts/extra.cjs')],cwd=R,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
