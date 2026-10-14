"""Loopback-only review preview with the tested build and its own fictitious database."""
from pathlib import Path
import json,os,sqlite3,subprocess
E=Path(__file__).resolve().parents[1];env=json.loads((E/'environment.json').read_text());work=Path(env['work_dir']);assert str(work).startswith('/tmp/silex-sb05-1-') and env['persistent_database_used'] is False
candidate=work/'candidate';db=work/'preview.sqlite3';assert not db.exists()
with sqlite3.connect(work/'fixture.sqlite3') as src,sqlite3.connect(db) as target:src.backup(target)
settings={**os.environ,'PYTHONPATH':str(candidate/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{db}','PYTHONDONTWRITEBYTECODE':'1'}
with (E/'preview-server.log').open('w') as log:
 p=subprocess.Popen([str(candidate/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','18034'],cwd=candidate,env=settings,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
(E/'preview.json').write_text(json.dumps({'pid':p.pid,'url':'http://127.0.0.1:18034/app#finance','source':str(candidate),'database':str(db),'production_data':False,'external_deploy':False,'prior_previews_preserved':True},indent=2));print('SB-05 review preview: http://127.0.0.1:18034/app#finance')
