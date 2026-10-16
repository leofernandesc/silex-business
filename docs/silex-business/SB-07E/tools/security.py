"""Read-only heuristic inventory: report locations and classes, NEVER secret values."""
from pathlib import Path
import re,json,subprocess as sp,hashlib,importlib.metadata as meta,shutil
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e'
files=sp.check_output(['git','ls-files','-z'],cwd=R).decode().split('\0');findings=[];private=[];large=[]
patterns={'private_key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----','aws_key':rb'AKIA[0-9A-Z]{16}','github_token':rb'gh[pousr]_[A-Za-z0-9]{30,}','jwt_literal':rb'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}','demo_credential':rb'DemoLocal#[0-9]+'}
def scan(raw,path):
 if b'\0' in raw:return
 for kind,pat in patterns.items():
  for m in re.finditer(pat,raw):findings.append({'path':path,'line':raw[:m.start()].count(b'\n')+1,'kind':kind,'value':'[omitted]'})
for p in filter(None,files):
 path=R/p
 if path.stat().st_size>1000000:large.append({'path':p,'size':path.stat().st_size})
 if re.search(r'(^|/)(\.env(\.[^/]+)?|credentials[^/]*|secrets[^/]*)$|\.(sqlite3?|db3?|pem|key|p12)$',p) and not p.endswith(('.example','.sample')):private.append(p)
 scan(path.read_bytes(),p)
# Inspect every distinct historical blob, not repeated commit snapshots.
historical=[];objects=sp.check_output(['git','rev-list','--objects','--all'],cwd=R).decode().splitlines();count=0
for line in objects:
 sha,_,path=line.partition(' ')
 if not path:continue
 typ=sp.check_output(['git','cat-file','-t',sha],cwd=R).decode().strip()
 if typ!='blob':continue
 raw=sp.check_output(['git','cat-file','blob',sha],cwd=R);count+=1
 for kind,pat in patterns.items():
  if re.search(pat,raw):historical.append({'blob':sha,'path':path,'kind':kind,'value':'[omitted]'})
# No remediation or installation. npm audit queries configured registry.
audit=sp.run(['npm','audit','--json','--ignore-scripts'],cwd=R/'frontend',capture_output=True,text=True)
try:npm=json.loads(audit.stdout)
except ValueError:npm={'error':{'summary':'Registry response unavailable'}}
summary={'exit_code':audit.returncode,'metadata':npm.get('metadata'),'error':npm.get('error'),'packages':[{k:v.get(k) for k in ['name','severity','isDirect','range','fixAvailable']} for v in npm.get('vulnerabilities',{}).values()]}
(E/'npm-audit.json').write_text(json.dumps(summary,indent=2))
backend=[]
for name in ['fastapi','starlette','sqlalchemy','pydantic','uvicorn','python-multipart','httpx','pytest']:
 try:backend.append({'package':name,'version':meta.version(name)})
 except meta.PackageNotFoundError:pass
result={'method':'heuristics, not exhaustive secret detection or pentest','tracked_sensitive_paths':private,'large_tracked_files':large,'findings_locations_only':findings,'historical_distinct_blobs_scanned':count,'historical_findings':historical,'demo_credentials_are_public_synthetic_only':True,'credential_values_omitted':True,'screen_reader':{'orca_path':shutil.which('orca'),'orca_running':sp.run(['pgrep','-x','orca'],capture_output=True).returncode==0},'backend_inventory':backend,'backend_advisory_scan':'not performed; no audit package installed','npm':summary}
(E/'security-inventory.json').write_text(json.dumps(result,indent=2));print('Scanned',len(files)-1,'tracked paths and',count,'historical blobs; values omitted')
