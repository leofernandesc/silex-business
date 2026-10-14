"""Serve the approved baseline with a snapshot of the candidate's disposable test data."""
from pathlib import Path
import json,sqlite3,os,subprocess
E=Path(__file__).resolve().parents[1];env=json.loads((E/'environment.json').read_text());W=Path(env['work_dir']);assert W.name.startswith('silex-sb05-2-') and not env['persistent_database_used'];db=W/'navigation-baseline.sqlite3';assert not db.exists()
with sqlite3.connect(W/'functional.sqlite3') as src,sqlite3.connect(db) as dst:src.backup(dst)
source=W/'baseline';settings={**os.environ,'PYTHONPATH':str(source/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{db}','PYTHONDONTWRITEBYTECODE':'1'}
with (E/'logs/navigation-baseline-server.log').open('w') as log:
 p=subprocess.Popen([str(source/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','18038'],cwd=source,env=settings,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
(E/'navigation-baseline-server.json').write_text(json.dumps({'pid':p.pid,'source':str(source),'database':str(db),'port':18038,'baseline_commit':env['baseline_commit'],'data_from_disposable_functional_snapshot':True},indent=2))
print('Equivalent-data navigation baseline started on 18038')
