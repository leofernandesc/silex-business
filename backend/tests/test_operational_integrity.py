from contextlib import closing
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

import pytest

from app.db import ROOT
from app.operational_integrity import inspect_database
from test_transport_capabilities import accounts
from test_supplier_kind_links import contracted_cost, generation_body


def prepared(accounts, financial=False):
    client=accounts['sammya'];provider,order=contracted_cost(client)
    if financial:
        r=client.post(f"/api/service-orders/{order['id']}/generate-titles",json=generation_body(client));assert r.status_code==200
        order=r.json()['service_order']
    path=Path(accounts['app'].state.engine.url.database);accounts['app'].state.engine.dispose()
    copy=path.with_name('integrity-copy.sqlite3')
    # Disposing one engine does not prove that all test clients/Alembic pools have closed.
    # Inspect a proper offline SQLite backup, exactly as required by the operational contract.
    with closing(sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True)) as source, closing(sqlite3.connect(copy)) as target:
        source.backup(target)
    return copy,provider,order


def checked_unchanged(path):
    before=hashlib.sha256(path.read_bytes()).hexdigest()
    result=inspect_database(path)
    assert hashlib.sha256(path.read_bytes()).hexdigest()==before
    return result


def test_consistent_generated_links_are_read_only(accounts):
    path,_,_=prepared(accounts,True)
    result=checked_unchanged(path)
    assert result['ok'] and result['issues']==[] and result['integrity_check']==['ok'] and result['foreign_key_check']==[]


def test_old_reclassification_is_reported_without_repair(accounts):
    path,provider,order=prepared(accounts)
    with closing(sqlite3.connect(path)) as db:
        db.execute("update suppliers set kind='supplier' where id=?",(provider['id'],));db.commit()
    result=checked_unchanged(path)
    assert not result['ok']
    assert result['issues']==[{'type':'supplier_cost_kind_mismatch','cost_id':order['costs'][0]['id'],'supplier_id':provider['id'],'service_order_id':order['id'],'supplier_kind':'supplier','cost_kind':'subcontracted_freight'}]
    with closing(sqlite3.connect(path)) as db:assert db.execute('select kind from suppliers where id=?',(provider['id'],)).fetchone()==('supplier',)
    r=subprocess.run([sys.executable,'-m','app.operational_integrity','--database',str(path)],cwd=ROOT,capture_output=True,text=True)
    assert r.returncode==2 and json.loads(r.stdout)['issues']==result['issues']
    assert provider['name'] not in r.stdout


@pytest.mark.parametrize('table,issue',[('suppliers','missing_supplier'),('service_orders','missing_service_order'),('service_order_costs','missing_financial_cost_reference')])
def test_dangling_references_are_reported(accounts,table,issue):
    path,_,_=prepared(accounts,True)
    with closing(sqlite3.connect(path)) as db:
        db.execute(f'delete from {table}');db.commit()  # Disposable corruption fixture; FK enforcement deliberately off.
    result=checked_unchanged(path)
    assert not result['ok'] and issue in {i['type'] for i in result['issues']}


@pytest.mark.parametrize('column,value,issue',[
 ('supplier_id',None,'financial_supplier_mismatch'),('service_order_id',None,'financial_order_mismatch'),
 ('direction','income','financial_cost_direction_mismatch'),('amount_cents',12346,'financial_contracted_amount_mismatch'),
])
def test_financial_operational_mismatches(accounts,column,value,issue):
    path,_,_=prepared(accounts,True)
    with closing(sqlite3.connect(path)) as db:
        db.execute(f'update finance_entries set {column}=? where service_order_cost_id is not null',(value,));db.commit()
    result=checked_unchanged(path)
    assert not result['ok'] and issue in {i['type'] for i in result['issues']}


def test_missing_file_is_not_created(tmp_path):
    path=tmp_path/'absent.sqlite3'
    with pytest.raises(FileNotFoundError):inspect_database(path)
    assert not path.exists()


def test_pending_wal_is_not_ignored_or_recovered(accounts):
    path,_,_=prepared(accounts)
    sidecar=Path(str(path)+'-wal');sidecar.write_bytes(b'synthetic pending WAL')
    before=path.read_bytes()
    with pytest.raises(ValueError,match='sem WAL/journal'):inspect_database(path)
    assert path.read_bytes()==before and sidecar.read_bytes()==b'synthetic pending WAL'
    sidecar.unlink()
