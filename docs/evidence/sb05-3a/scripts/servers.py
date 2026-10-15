from pathlib import Path
import json,os,signal,subprocess,sys
E=Path(__file__).resolve().parents[1]
env=json.loads((E/'environment.json').read_text());work=Path(env['work_dir'])
assert str(work).startswith('/tmp/silex-sb053a-') and env['persistent_database_used'] is False
if sys.argv[1]=='start':
    servers=[]
    for name,source,port in [('baseline','baseline',18040),('candidate','candidate',18041),('functional','candidate',18042),('baseline-functional','baseline',18043)]:
        settings={**os.environ,'PYTHONPATH':str(work/source/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{work}/{name}.sqlite3','PYTHONDONTWRITEBYTECODE':'1'}
        with (E/f'{name}-server.log').open('w') as log:
            p=subprocess.Popen([str(work/source/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=work/source,env=settings,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        servers.append({'name':name,'pid':p.pid,'source':str(work/source),'port':port})
    (E/'servers.json').write_text(json.dumps(servers,indent=2));print(json.dumps(servers))
elif sys.argv[1]=='stop':
    rows=[]
    for row in json.loads((E/'servers.json').read_text()):
        p=Path(f'/proc/{row["pid"]}')
        if p.exists():
            assert (p/'cwd').resolve()==Path(row['source'])
            assert b'uvicorn' in (p/'cmdline').read_bytes()
            os.kill(row['pid'],signal.SIGTERM)
        rows.append({**row,'stop_requested':True})
    (E/'cleanup.json').write_text(json.dumps(rows,indent=2));print('Only SB-05.3A test servers stopped.')
