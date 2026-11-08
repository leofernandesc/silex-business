"""Real loopback server restarts and SQLite bundle recovery; synthetic data only."""
import base64
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import zipfile
import httpx

ROOT=Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory(prefix='silex-dre-restart-') as folder:
        directory=Path(folder);database=directory/'fixture.sqlite3'
        env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'GESTAO_ENV':'local','GESTAO_DATABASE_URL':f'sqlite:///{database}'}
        for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):env.pop(key,None)
        subprocess.run([sys.executable,'-m','app.cli','init'],cwd=ROOT,env=env,check=True,stdout=subprocess.DEVNULL)
        # Create only this private temporary fixture; no CLI/bootstrap endpoint or known password.
        bootstrap="""import os
from app.api import passwords
from app.db import build_engine,session_factory
from app.models import User
engine=build_engine()
with session_factory(engine)() as db:
 db.add(User(username='dre.restart.fixture',name='Synthetic restart fixture',role='admin',active=True,password_hash=passwords.hash(os.environ['SILEX_DISPOSABLE_PASSWORD'])));db.commit()
engine.dispose()
"""
        password=secrets.token_urlsafe(24)
        subprocess.run([sys.executable,'-c',bootstrap],cwd=ROOT,env={**env,'SILEX_DISPOSABLE_PASSWORD':password},check=True,stdout=subprocess.DEVNULL)
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        url=f'http://127.0.0.1:{port}'
        process=None;cookies={};parameters={};expected=None;attachment=None;attachment_bytes=b'%PDF-1.4\nSynthetic local fixture\n%%EOF'
        def start(db):
            current_env={**env,'GESTAO_DATABASE_URL':f'sqlite:///{db}'}
            proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port),'--log-level','error'],cwd=ROOT,env=current_env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            try:
                with httpx.Client(trust_env=False,timeout=1) as probe:
                    deadline=time.monotonic()+15
                    while time.monotonic()<deadline:
                        if proc.poll() is not None:raise RuntimeError('Disposable server exited')
                        try:
                            if probe.get(url+'/api/health').status_code==200:return proc
                        except httpx.TransportError:pass
                        time.sleep(.1)
                raise RuntimeError('Disposable health check timed out')
            except BaseException:proc.terminate();proc.wait(timeout=10);raise
        def stop(proc):
            if proc is not None:proc.terminate();proc.wait(timeout=10)
        def post(c,path,body,status=201):
            response=c.post('/api'+path,json=body);assert response.status_code==status,(path,response.status_code);return response.json()
        try:
            for round_number in range(3):
                active=database if round_number<2 else directory/'restored.sqlite3'
                process=start(active)
                with httpx.Client(base_url=url,cookies=cookies,trust_env=False,timeout=10,headers={'Origin':url,'Sec-Fetch-Site':'same-origin'}) as client:
                    if round_number==0:
                        post(client,'/auth/login',{'username':'dre.restart.fixture','password':password},200)
                        cookies=dict(client.cookies)
                        today=client.get('/api/dashboard').json()['date'];parameters={'start':today,'end':today}
                        customer=post(client,'/customers',{'name':'Synthetic restart customer'})
                        worker=post(client,'/suppliers',{'name':'Synthetic generic contractor','kind':'day_worker'})
                        order=post(client,'/service-orders',{'customer_id':customer['id'],'description':'Synthetic executed service','service_date':today,'negotiated_cents':500001,'costs':[{'supplier_id':worker['id'],'kind':'day_worker','quantity_milli':1000,'agreed_amount_cents':200001}]})
                        post(client,f"/service-orders/{order['id']}/complete",{'completed_on':today,'reason':'Synthetic execution and cost evidence','request_key':secrets.token_hex(16),'incurred_costs':[{'cost_id':order['costs'][0]['id'],'incurred_on':today}]},200)
                        account=next(a for a in client.get('/api/accounts').json() if a['kind']=='bank')
                        post(client,f"/service-orders/{order['id']}/generate-titles",{'account_id':account['id'],'due_date':today,'competence_date':today},200)
                        entries=client.get('/api/finance',params={'start':today,'end':today}).json()['items'];assert len(entries)==2
                        for entry in entries:
                            body={'category_id':entry['category_id'],'line_code':'RB' if entry['direction']=='income' else 'CD','valid_from':today,'valid_to':today,'expected_revision':0,'reason':'Synthetic documented classification'}
                            preview=post(client,'/finance/dre/mappings/preview',body,200)
                            post(client,'/finance/dre/mappings',{**body,'preview_token':preview['preview_token']})
                        attachment=post(client,f"/finance/{entries[0]['id']}/attachments",{'filename':'synthetic.pdf','content_type':'application/pdf','content_base64':base64.b64encode(attachment_bytes).decode()})
                        current=client.get('/api/finance/dre',params=parameters).json();expected={k:current[k] for k in ('facts','lines','mapping_version','decision_version')}
                        assert {(f['dre_line_code'],f['amount_cents']) for f in current['facts']}=={('RB',500001),('CD',200001)}
                        post(client,'/finance/dre/period-reviews',{**parameters,'source_fingerprint':current['source_fingerprint'],'report_fingerprint':current['report_fingerprint'],'reason':'Synthetic reviewed period'})
                        with sqlite3.connect(active) as db:
                            tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
                            original={t:db.execute('SELECT * FROM '+t+' ORDER BY rowid').fetchall() for t in tables}
                    else:
                        assert client.get('/api/auth/me').status_code==200
                        current=client.get('/api/finance/dre',params=parameters).json()
                        assert {k:current[k] for k in expected}==expected
                        assert client.get('/api/finance/attachments/'+str(attachment['id'])).content==attachment_bytes
                        with sqlite3.connect(active) as db:
                            assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
                            assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
                            assert all(db.execute('SELECT * FROM '+t+' ORDER BY rowid').fetchall()==rows for t,rows in original.items())
                stop(process);process=None
                if round_number==1:
                    backup=directory/'backup.zip'
                    subprocess.run([sys.executable,'-m','app.cli','backup-bundle','--output',str(backup)],cwd=ROOT,env=env,check=True,stdout=subprocess.DEVNULL)
                    with zipfile.ZipFile(backup) as archive:(directory/'restored.sqlite3').write_bytes(archive.read('gestao.sqlite3'))
            result={'server_instances':3,'restarts_with_same_database':1,'restored_database_server_starts':1,'all_original_table_rows_equal':True,'dre_fact_amounts_cents':[500001,200001],'attachment_bytes_equal':True,'integrity_check':'ok','foreign_key_violations':0,'backup_sha256':hashlib.sha256(backup.read_bytes()).hexdigest(),'persistent_database_used':False,'railway_accessed':False,'real_users_provisioned':False}
            target=os.environ.get('SILEX_DRE_RESTART_OUTPUT')
            if target:Path(target).write_text(json.dumps(result,indent=2)+'\n')
            print(json.dumps(result))
        finally:stop(process)


if __name__=='__main__':main()
