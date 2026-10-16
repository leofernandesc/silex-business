"""Independent baseline/candidate databases, all synthetic and loopback only."""
from pathlib import Path
import json
import os
import sqlite3
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
evidence = Path(os.environ['SILEX_OFX_EVIDENCE'])
work = Path(json.loads((evidence / 'baseline.json').read_text())['work'])
variant = sys.argv[1]
assert variant in ('baseline', 'candidate') and str(work).startswith('/tmp/silex-ofx-errors-')
project = work / 'baseline' if variant == 'baseline' else root
source = work / 'synthetic.sqlite3'
if not source.exists():
    env = {**os.environ, 'PYTHONPATH': str(project / 'backend'), 'GESTAO_DATABASE_URL': f'sqlite:///{source}'}
    for command in ('init', 'seed-demo'):
        subprocess.run([root / '.venv/bin/python', '-m', 'app.cli', command], env=env,
                       cwd=project, check=True, stdout=subprocess.DEVNULL)
    # Existing navigation tests explicitly expect this synthetic company fixture.
    with sqlite3.connect(source) as db:
        db.execute('INSERT INTO company_settings (id,brand_name,company_name,company_document,phone,email,address) VALUES (?,?,?,?,?,?,?)',
                   (1, 'Apresentação fictícia', 'Empresa Privada de Teste', '', '', '', ''))
database = work / f'{variant}.sqlite3'
assert not database.exists()
with sqlite3.connect(source) as src, sqlite3.connect(database) as target:
    src.backup(target)
env = {**os.environ, 'PYTHONPATH': str(project / 'backend'), 'GESTAO_DATABASE_URL': f'sqlite:///{database}'}
os.chdir(project)
os.execve(str(root / '.venv/bin/python'), [str(root / '.venv/bin/python'), '-m', 'uvicorn',
          'app.main:app', '--host', '127.0.0.1', '--port', '18126' if variant == 'baseline' else '18127'], env)
