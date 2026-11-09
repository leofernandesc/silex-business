"""Public usernames fail before writing; local demo fixtures stay legitimate."""
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
from sqlalchemy import select
from app.api import create_app
from app.cli import create_admin, migrate
from app.db import build_engine, session_factory
from app.models import User
from app.schemas import UserInput


@pytest.mark.parametrize('username',['demo.admin','demo.operador',' Demo.Admin ','DEMO.OPERADOR'])
def test_cli_public_reserved_names_stop_before_password_or_database(monkeypatch,username):
    monkeypatch.setenv('GESTAO_ENV','railway')
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    with patch('builtins.input',return_value=username),patch('getpass.getpass',side_effect=AssertionError('No password required for a refused username')),patch('app.cli.build_engine',side_effect=AssertionError('No database may be opened')):
        with pytest.raises(SystemExit,match='reservado'):create_admin()


@pytest.mark.parametrize('username',['demo.admin','demo.operador'])
def test_local_fixtures_can_use_reserved_demo_names(monkeypatch,username):
    monkeypatch.setenv('GESTAO_ENV','local')
    for key in ['RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID']:monkeypatch.delenv(key,raising=False)
    assert UserInput(username=username,name='Fictício',password='SyntheticOnly#2026',role='admin').username==username


@pytest.mark.parametrize('role',['admin','operator'])
def test_public_api_rejects_reserved_usernames_without_mutating_users(tmp_path,monkeypatch,password_hash,role):
    mount=tmp_path/'volume';mount.mkdir()
    for key,value in {'GESTAO_ENV':'railway','GESTAO_PUBLIC_HOST':'clientes.example.test','GESTAO_PUBLIC_ORIGIN':'https://clientes.example.test','RAILWAY_VOLUME_MOUNT_PATH':str(mount),'GESTAO_DATABASE_URL':f'sqlite:///{mount}/clientes.sqlite3'}.items():monkeypatch.setenv(key,value)
    monkeypatch.setattr(Path,'is_mount',lambda p:p==mount)
    migrate();engine=build_engine()
    with session_factory(engine)() as db:
        db.add(User(username='individual.admin',name='Administrador fictício',role='admin',password_hash=password_hash));db.commit()
    app=create_app(engine,serve_frontend=False)
    with TestClient(app,base_url='https://clientes.example.test') as client:
        assert client.post('/api/auth/login',json={'username':'individual.admin','password':'TestPassword#2026'}).status_code==200
        before=client.get('/api/users').json()
        for username in ['demo.admin','DEMO.OPERADOR']:
            response=client.post('/api/users',json={'username':username,'name':'Usuário fictício','role':role,'password':'SyntheticReservedOnly#2026'})
            assert response.status_code==422 and 'reservado' in response.json()['detail']
            assert 'SyntheticReservedOnly#2026' not in response.text
        assert client.get('/api/users').json()==before
        assert client.post('/api/users',json={'username':'avaliadora.individual','name':'Avaliadora fictícia','role':role,'password':'SyntheticReservedOnly#2026'}).status_code==201
    engine.dispose()


def test_railway_metadata_also_prevents_unsafe_usernames(monkeypatch):
    monkeypatch.delenv('GESTAO_ENV',raising=False);monkeypatch.setenv('RAILWAY_PROJECT_ID','synthetic-project')
    with pytest.raises(ValueError,match='reservado'):UserInput(username='demo.admin',name='Fictício',password='SyntheticOnly#2026')
