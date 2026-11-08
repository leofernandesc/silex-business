"""Read-only inspection of an OFFLINE SQLite copy. No ORM, migration, repair or app startup."""
import argparse
import json
from pathlib import Path
import sqlite3
from urllib.parse import quote


def inspect_database(database):
    path = Path(database).resolve(strict=True)
    if not path.is_file():
        raise ValueError('Informe um arquivo SQLite existente')
    for suffix in ('-wal', '-journal'):
        sidecar = Path(str(path)+suffix)
        if sidecar.exists() and sidecar.stat().st_size:
            raise ValueError('Use uma cópia SQLite consistente e fechada, sem WAL/journal pendente; nenhuma recuperação automática será executada')
    # immutable prevents even SQLite auxiliary-file writes, but is safe only on the offline copy
    # required above. Never use this command to inspect a live application's database.
    with sqlite3.connect('file:'+quote(str(path),safe='/')+'?mode=ro&immutable=1',uri=True) as db:
        db.execute('PRAGMA query_only=ON')
        db.row_factory=sqlite3.Row
        required={'suppliers','service_orders','service_order_costs','finance_entries'}
        tables={r[0] for r in db.execute("select name from sqlite_master where type='table'")}
        if not required <= tables:
            raise ValueError('A cópia não contém o esquema operacional esperado')
        issues=[]
        for row in db.execute('''SELECT c.id cost_id,c.supplier_id,c.service_order_id,c.kind cost_kind,
                    s.id supplier_exists,s.kind supplier_kind,o.id order_exists
                    FROM service_order_costs c LEFT JOIN suppliers s ON s.id=c.supplier_id
                    LEFT JOIN service_orders o ON o.id=c.service_order_id ORDER BY c.id'''):
            ids={k:row[k] for k in ('cost_id','supplier_id','service_order_id')}
            if row['supplier_exists'] is None:issues.append({'type':'missing_supplier',**ids})
            elif row['supplier_kind'] != row['cost_kind']:
                issues.append({'type':'supplier_cost_kind_mismatch',**ids,'supplier_kind':row['supplier_kind'],'cost_kind':row['cost_kind']})
            if row['order_exists'] is None:issues.append({'type':'missing_service_order',**ids})
        for row in db.execute('''SELECT f.id entry_id,f.supplier_id,f.service_order_id,f.service_order_cost_id cost_id,
                f.direction,f.amount_cents,c.id cost_exists,c.supplier_id cost_supplier_id,
                c.service_order_id cost_order_id,c.agreed_amount_cents
                FROM finance_entries f LEFT JOIN service_order_costs c ON c.id=f.service_order_cost_id
                WHERE f.service_order_cost_id IS NOT NULL ORDER BY f.id'''):
            ids={k:row[k] for k in ('entry_id','cost_id','supplier_id','service_order_id')}
            if row['cost_exists'] is None:issues.append({'type':'missing_financial_cost_reference',**ids});continue
            for kind,bad in [
                ('financial_supplier_mismatch',row['supplier_id']!=row['cost_supplier_id']),
                ('financial_order_mismatch',row['service_order_id']!=row['cost_order_id']),
                ('financial_cost_direction_mismatch',row['direction']!='expense'),
                ('financial_contracted_amount_mismatch',row['amount_cents']!=row['agreed_amount_cents']),
            ]:
                if bad:issues.append({'type':kind,**ids})
        integrity=[row[0] for row in db.execute('PRAGMA integrity_check')]
        fks=[{'table':r[0],'rowid':r[1],'parent':r[2],'constraint':r[3]} for r in db.execute('PRAGMA foreign_key_check')]
        return {'ok':not issues and integrity==['ok'] and not fks,'issues':issues,'integrity_check':integrity,'foreign_key_check':fks,'read_only':True,'offline_copy_required':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',required=True,help='Cópia SQLite consistente e fechada; nunca o banco da aplicação em execução')
    args=parser.parse_args()
    try:result=inspect_database(args.database)
    except (ValueError,OSError,sqlite3.DatabaseError) as error:
        print(json.dumps({'ok':False,'error':str(error),'read_only':True},ensure_ascii=False));return 1
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0 if result['ok'] else 2

if __name__=='__main__':raise SystemExit(main())
