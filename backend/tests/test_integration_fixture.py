import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile

import pytest
from app.db import ROOT

spec=importlib.util.spec_from_file_location('fixture_reset',ROOT/'scripts/reset_integration_fixture.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


def test_fixture_reset_restores_data_without_replacing_database_file():
    with tempfile.TemporaryDirectory(prefix='gestao-e2e-') as folder:
        path=Path(folder);source=path/'baseline.sqlite3';target=path/'e2e.sqlite3'
        with sqlite3.connect(source) as db:db.execute('create table example(id integer primary key,value integer)');db.execute('insert into example values(1,101)')
        with sqlite3.connect(source) as src,sqlite3.connect(target) as dst:src.backup(dst)
        manifest=path/'manifest.json';manifest.write_text(json.dumps({'database':str(target),'baseline':str(source),'persistent_database_used':False}))
        inode=target.stat().st_ino
        with sqlite3.connect(target) as db:db.execute('update example set value=999')
        module.reset_fixture(manifest)
        assert target.stat().st_ino==inode
        with sqlite3.connect(target) as db:assert db.execute('select * from example').fetchall()==[(1,101)]


@pytest.mark.parametrize('persistent',[True,False])
def test_fixture_reset_never_accepts_arbitrary_database(tmp_path,persistent):
    db=tmp_path/'e2e.sqlite3';db.write_bytes(b'do not touch')
    source=tmp_path/'baseline.sqlite3';source.write_bytes(b'do not touch source')
    manifest=tmp_path/'manifest.json';manifest.write_text(json.dumps({'database':str(db),'baseline':str(source),'persistent_database_used':persistent}))
    with pytest.raises(ValueError):module.reset_fixture(manifest)
    assert db.read_bytes()==b'do not touch' and source.read_bytes()==b'do not touch source'
