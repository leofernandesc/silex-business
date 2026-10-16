"""Serve an independent copy of the synthetic fixture on loopback only."""
import json
import os
from pathlib import Path
import sqlite3
import sys

root = Path(__file__).resolve().parents[3]
evidence = Path(os.environ['SILEX_REPORT_EVIDENCE'])
work = Path(json.loads((evidence / 'baseline.json').read_text())['work'])
variant = sys.argv[1]
assert variant in ('baseline', 'candidate') and str(work).startswith('/tmp/silex-report-print-')
project = work / 'baseline' if variant == 'baseline' else root
database = work / f'{variant}.sqlite3'
assert (work / 'synthetic.sqlite3').is_file() and not database.exists()
with sqlite3.connect(work / 'synthetic.sqlite3') as source, sqlite3.connect(database) as target:
    source.backup(target)
env = {**os.environ, 'PYTHONPATH': str(project / 'backend'),
       'GESTAO_DATABASE_URL': f'sqlite:///{database}'}
os.chdir(project)
os.execve(str(root / '.venv/bin/python'), [str(root / '.venv/bin/python'), '-m',
    'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port',
    '18106' if variant == 'baseline' else '18107'], env)
