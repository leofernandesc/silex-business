"""Simulated interruption on disposable SQLite: schema must roll back and retry safely."""
import sqlite3
from pathlib import Path
from alembic import command
from alembic.config import Config
from alembic.operations import Operations
import pytest
from app.db import ROOT


def test_interrupted_additive_0013_can_retry_without_partial_schema(tmp_path,monkeypatch):
    path=tmp_path/'migration.sqlite3';monkeypatch.setenv('GESTAO_DATABASE_URL',f'sqlite:///{path}')
    cfg=Config(str(ROOT/'backend/alembic.ini'));command.upgrade(cfg,'0012')
    with sqlite3.connect(path) as db:
        db.execute("insert into users (id,name,username,password_hash,role,active) values (7,'Fixture','fixture.admin','not-a-real-hash','admin',1)")
        before=db.execute('select * from users').fetchall()
    original=Operations.add_column
    def fail_after_column(self, table, column, *args, **kwargs):
        result=original(self,table,column,*args,**kwargs)
        if table=='users' and column.name=='transport_operations':raise RuntimeError('Synthetic interruption after DDL')
        return result
    with monkeypatch.context() as patch:
        patch.setattr(Operations,'add_column',fail_after_column)
        with pytest.raises(RuntimeError,match='Synthetic interruption'):command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        assert db.execute('select version_num from alembic_version').fetchone()==('0012',)
        assert 'transport_operations' not in [r[1] for r in db.execute('pragma table_info(users)')]
        assert db.execute('select * from users').fetchall()==before
    command.upgrade(cfg,'head');command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        assert db.execute('select id,username,transport_operations from users').fetchall()==[(7,'fixture.admin',0)]
        assert db.execute('pragma integrity_check').fetchone()==('ok',)
        assert not db.execute('pragma foreign_key_check').fetchall()


def test_historical_deployment_schema_upgrade_backup_and_restart_preserve_all_columns(tmp_path,monkeypatch):
    """Reconstruct the historical checkout in /tmp; never connect to a deployed instance."""
    import os,subprocess,sys,tarfile,hashlib,zipfile
    from app.api import create_app
    from app.cli import backup_bundle
    from app.db import build_engine
    from fastapi.testclient import TestClient
    historical='191ed179e2c7f8b2a3e53ddd1aca422e4168cdf0'
    source=tmp_path/'historical';source.mkdir();archive=tmp_path/'source.tar'
    with archive.open('wb') as output:subprocess.run(['git','archive',historical,'backend'],cwd=ROOT,stdout=output,check=True)
    with tarfile.open(archive) as tar:tar.extractall(source,filter='data')
    path=tmp_path/'old.sqlite3'
    url=f'sqlite:///{path}'
    environment={**os.environ,'PYTHONPATH':str(source/'backend'),'GESTAO_DATABASE_URL':url,'GESTAO_ENV':'local'}
    for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):environment.pop(key,None)
    for command_name in ['init','seed-demo']:
        result=subprocess.run([sys.executable,'-m','app.cli',command_name],cwd=source,env=environment,capture_output=True,text=True)
        assert result.returncode==0,'Historical disposable initialization failed (no credential output logged)'
    before={}
    with sqlite3.connect(path) as db:
        assert db.execute('select version_num from alembic_version').fetchone()==('0012',)
        for (table,) in db.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name != 'alembic_version'"):
            columns=[r[1] for r in db.execute(f'pragma table_info("{table}")')]
            before[table]=(columns,db.execute(f'select * from "{table}" order by rowid').fetchall())
    monkeypatch.setenv('GESTAO_DATABASE_URL',url)
    cfg=Config(str(ROOT/'backend/alembic.ini'));command.upgrade(cfg,'head');command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        for table,(columns,rows) in before.items():
            selected=','.join('"'+col+'"' for col in columns)
            assert db.execute(f'select {selected} from "{table}" order by rowid').fetchall()==rows,table
        assert db.execute('pragma integrity_check').fetchone()==('ok',)
        assert db.execute('pragma foreign_key_check').fetchall()==[]
        assert not any(r[0] for r in db.execute('select transport_operations from users'))
    snapshot=tmp_path/'backup.zip';backup_bundle(snapshot)
    with zipfile.ZipFile(snapshot) as zipped:
        assert zipped.testzip() is None
        restored=tmp_path/'restored.sqlite3';restored.write_bytes(zipped.read('gestao.sqlite3'))
    engine=build_engine(f'sqlite:///{restored}')
    for _ in range(2):
        with TestClient(create_app(engine,serve_frontend=False)) as client:
            assert client.post('/api/auth/login',json={'username':'demo.admin','password':'DemoLocal#2026'}).status_code==200
            accounts=client.get('/api/accounts');assert accounts.status_code==200
            assert client.get('/api/sales').json()['total']==3
            assert client.get('/api/auth/me').json()['capabilities']==[]
    engine.dispose()
