"""Reset only the private, disposable e2e fixture between tests; never replace a live file."""
import json
from pathlib import Path
import sqlite3
import sys
import tempfile


def reset_fixture(manifest):
    record=json.loads(Path(manifest).read_text())
    target=Path(record['database']).resolve(strict=True)
    source=Path(record['baseline']).resolve(strict=True)
    folder=target.parent
    if (record.get('persistent_database_used') is not False or folder.parent!=Path(tempfile.gettempdir()).resolve()
        or not folder.name.startswith('gestao-e2e-') or target.name!='e2e.sqlite3'
        or source.parent!=folder or source.name!='baseline.sqlite3' or source==target):
        raise ValueError('Disposable integration fixture required')
    # SQLite's backup API restores atomically into the same file, allowing the application's
    # idle pool to retain its handles. Tests run serially; no previous page/context is reused.
    with sqlite3.connect('file:'+str(source)+'?mode=ro',uri=True) as src, sqlite3.connect(target,timeout=15) as dst:
        src.backup(dst)
        assert dst.execute('pragma integrity_check').fetchone()==('ok',)
        assert not dst.execute('pragma foreign_key_check').fetchall()

if __name__=='__main__':reset_fixture(sys.argv[1])
