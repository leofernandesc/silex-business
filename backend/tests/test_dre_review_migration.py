"""0016 -> 0017: no legacy economic policy is guessed and no row is rewritten."""
import sqlite3
import pytest
from alembic import command
from alembic.config import Config
from alembic.operations import Operations
from app.db import ROOT


def test_policy_upgrade_preserves_existing_rows_and_frozen_review(tmp_path,monkeypatch):
    path=tmp_path/'legacy-review.sqlite3';monkeypatch.setenv('GESTAO_DATABASE_URL',f'sqlite:///{path}');cfg=Config(str(ROOT/'backend/alembic.ini'))
    command.upgrade(cfg,'0016')
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO users(id,name,username,password_hash,role,active,transport_operations) VALUES(1,'Fictício','migration.review.fixture','not-a-login-hash','admin',1,0)")
        db.execute("INSERT INTO categories(id,name,direction,active,classification,result_group) VALUES(1,'Fictícia','income',1,'operating','')")
        db.execute("INSERT INTO dre_category_mapping_history(id,target,category_id,line_code,valid_from,valid_to,revision,reason,actor_user_id,recorded_at) VALUES(1,'category:1:subcategory:0',1,'RB','2026-01-01','2026-12-31',1,'Evidência antiga',1,'2026-11-01')")
        db.execute("INSERT INTO dre_period_reviews(id,start,end,mapping_version,decision_version,source_fingerprint,report_json,reason,actor_user_id,recorded_at) VALUES(1,'2026-10-01','2026-10-31',1,0,?,?,'Competência revisada anteriormente',1,'2026-11-01')",('a'*64,'{"facts":[{"key":"finance_entry:1:principal","amount_cents":10001}],"lines":[{"code":"RB","final_amount_cents":10001}]}'))
        names=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'") if r[0]!='alembic_version']
        columns={name:[r[1] for r in db.execute('PRAGMA table_info('+name+')')] for name in names}
        before={name:list(db.execute('SELECT '+','.join(columns[name])+' FROM '+name)) for name in names};db.commit()
    command.upgrade(cfg,'head');command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        for name in names:assert list(db.execute('SELECT '+','.join(columns[name])+' FROM '+name))==before[name]
        assert db.execute('SELECT economic_classification,economic_affects_result,replaces_id FROM dre_category_mapping_history').fetchone()==(None,None,None)
        assert db.execute('SELECT COUNT(*) FROM dre_cancellation_reviews').fetchone()==(0,)
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_interrupted_policy_upgrade_is_atomic_and_retryable(tmp_path,monkeypatch):
    path=tmp_path/'interrupted.sqlite3';monkeypatch.setenv('GESTAO_DATABASE_URL',f'sqlite:///{path}');cfg=Config(str(ROOT/'backend/alembic.ini'));command.upgrade(cfg,'0016')
    add_column=Operations.add_column
    def interrupt(self,table,column,*args,**kwargs):
        value=add_column(self,table,column,*args,**kwargs)
        if table=='dre_category_mapping_history' and column.name=='economic_classification':raise RuntimeError('Synthetic 0017 interruption')
        return value
    with monkeypatch.context() as patch:
        patch.setattr(Operations,'add_column',interrupt)
        with pytest.raises(RuntimeError,match='Synthetic 0017 interruption'):command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT version_num FROM alembic_version').fetchone()==('0016',)
        assert 'replaces_id' not in [r[1] for r in db.execute('PRAGMA table_info(dre_category_mapping_history)')]
    command.upgrade(cfg,'head')
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
