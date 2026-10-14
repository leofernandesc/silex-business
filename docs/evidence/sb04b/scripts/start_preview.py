"""Start a loopback-only review preview using a copied demo database and tested build."""
from pathlib import Path
import json,os,sqlite3,subprocess
E=Path(__file__).resolve().parents[1];env=json.loads((E/'environment.json').read_text());work=Path(env['work_dir']);candidate=work/'candidate';db=work/'preview.sqlite3'
with sqlite3.connect(work/'fixture.sqlite3') as src,sqlite3.connect(db) as target:src.backup(target)
settings={**os.environ,'PYTHONPATH':str(candidate/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{db}','PYTHONDONTWRITEBYTECODE':'1'}
with (E/'preview-server.log').open('w') as log:
 p=subprocess.Popen([str(candidate/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','18029'],cwd=candidate,env=settings,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
(E/'preview.json').write_text(json.dumps({'pid':p.pid,'url':'http://127.0.0.1:18029/app#home','public_url':'http://127.0.0.1:18029/','source':str(candidate),'database':str(db),'uses_production_data':False,'external_deploy':False,'previous_sb04a_preview_18025_preserved':True},indent=2));print(f'Preview PID {p.pid}: http://127.0.0.1:18029/app#home')
