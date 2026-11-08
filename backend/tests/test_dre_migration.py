"""Only disposable files: additive schema preserves the operational data verbatim."""
import sqlite3
import pytest
from alembic import command
from alembic.config import Config
from app.db import ROOT


@pytest.mark.parametrize('previous',['0012','0013'])
def test_upgrade_preserves_previous_schema_and_rows(tmp_path, monkeypatch, previous):
    path=tmp_path/'migration.sqlite3'
    monkeypatch.setenv('GESTAO_DATABASE_URL',f'sqlite:///{path}')
    cfg=Config(str(ROOT/'backend/alembic.ini'))
    command.upgrade(cfg,previous)
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO users(id,name,username,password_hash,role,active) VALUES(1,'Fictício','migration.fixture','not-a-login-hash','admin',1)")
        db.commit()
        names=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version'")]
        columns={name:','.join(r[1] for r in db.execute('PRAGMA table_info('+name+')')) for name in names}
        before={name:list(db.execute('SELECT '+columns[name]+' FROM '+name)) for name in names}
    command.upgrade(cfg,'0014')
    command.upgrade(cfg,'0014')
    with sqlite3.connect(path) as db:
        assert all(list(db.execute('SELECT '+columns[name]+' FROM '+name))==rows for name,rows in before.items())
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        for name in ('dre_category_mapping_history','dre_recognition_decisions','dre_component_assertions','dre_period_reviews'):
            assert db.execute('SELECT COUNT(*) FROM '+name).fetchone()==(0,)
    # Laboratory rollback before any policy data; never invoked on a persistent database.
    command.downgrade(cfg,'0013')
    command.upgrade(cfg,'0014')
    with sqlite3.connect(path) as db:
        assert all(list(db.execute('SELECT '+columns[name]+' FROM '+name))==rows for name,rows in before.items())
