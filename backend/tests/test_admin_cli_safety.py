"""Administrative credential input never falls back to echo or prints validation values."""
import getpass
from unittest.mock import patch
import pytest
from app.cli import create_admin


def test_admin_creation_refuses_a_noninteractive_password_channel(monkeypatch):
    monkeypatch.setattr('sys.stdin.isatty',lambda:False)
    with patch('builtins.input',side_effect=AssertionError('Do not read before protected terminal check')):
        with pytest.raises(SystemExit,match='terminal'):create_admin()


def test_admin_creation_refuses_getpass_echo_fallback(monkeypatch):
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    with patch('builtins.input',side_effect=['fixture.admin','Fixture']),patch('getpass.getpass',side_effect=getpass.GetPassWarning('No secure input')):
        with pytest.raises(SystemExit,match='protegida'):create_admin()


def test_admin_creation_validation_never_exposes_password(monkeypatch,capsys):
    monkeypatch.setattr('app.cli.build_engine',lambda:pytest.fail('Invalid input must not open any database'))
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    with patch('builtins.input',side_effect=['fixture.admin','Fixture']),patch('getpass.getpass',return_value='short-x'):
        with pytest.raises(SystemExit) as error:create_admin()
    assert 'short-x' not in str(error.value)+capsys.readouterr().out


def test_protected_cli_creates_one_individual_admin_and_refuses_duplicate(env,monkeypatch,capsys):
    app,admin,_,_=env
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    password='SyntheticCliOnly#2026'
    for attempt in range(2):
        with patch('builtins.input',side_effect=['fixture.cli','CLI fictícia']),patch('getpass.getpass',return_value=password):
            if not attempt:create_admin()
            else:
                with pytest.raises(SystemExit,match='já cadastrado'):create_admin()
    assert password not in capsys.readouterr().out
    assert admin.post('/api/auth/login',json={'username':'fixture.cli','password':password}).status_code==200
    user=admin.get('/api/auth/me').json()
    assert user['role']=='admin' and user['capabilities']==[]


def test_cli_unique_race_failure_never_prints_driver_parameters(env,monkeypatch,capsys):
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import Session
    monkeypatch.setattr('sys.stdin.isatty',lambda:True)
    with patch('builtins.input',side_effect=['fixture.race','Fixture race']),patch('getpass.getpass',return_value='SyntheticCliOnly#2026'),patch.object(Session,'commit',side_effect=IntegrityError('Synthetic insert',{'password_hash':'SYNTHETIC-DRIVER-PARAMETER'},Exception('Synthetic conflict'))):
        with pytest.raises(SystemExit) as error:create_admin()
    assert 'SYNTHETIC-DRIVER-PARAMETER' not in str(error.value)+capsys.readouterr().out
