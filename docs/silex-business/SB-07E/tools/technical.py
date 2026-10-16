"""Technical checks with explicit commands, exit codes, logs, and durations."""
from pathlib import Path
import subprocess,time,json,sys,os
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e'
commands={'typescript':['npx','tsc','-b'],'build':['npm','run','build'],'frontend':['npm','test'],'backend':[str(R/'.venv/bin/python'),'-m','pytest','backend/tests','-q','-p','no:cacheprovider']}
rows=[]
for name in sys.argv[1:]:
 start=time.monotonic();cmd=commands[name]
 with (E/(name+'.log')).open('w') as f:p=subprocess.run(cmd,cwd=R if name=='backend' else R/'frontend',env={**os.environ,'PYTHONPATH':'backend','PYTHONDONTWRITEBYTECODE':'1'},stdout=f,stderr=subprocess.STDOUT)
 rows.append({'check':name,'command':cmd,'exit_code':p.returncode,'duration_seconds':round(time.monotonic()-start,2),'log':name+'.log'})
 (E/('technical-'+sys.argv[1]+'.json')).write_text(json.dumps(rows,indent=2));print(name,p.returncode,flush=True)
 if p.returncode:sys.exit(p.returncode)
