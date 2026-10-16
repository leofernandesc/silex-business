from pathlib import Path
import json,os,sys,sqlite3
R=Path(__file__).resolve().parents[3];E=Path(os.environ.get('SILEX_PRINT_EVIDENCE', R/'docs/evidence/financial-print-ptbr'));cfg=json.loads((E/'baseline.json').read_text());W=Path(cfg['work']);variant=sys.argv[1];assert variant in ['baseline','candidate']
P=W/'baseline' if variant=='baseline' else R
dbfile=W/f'{variant}.sqlite3';source=W/'synthetic.sqlite3'
assert str(W).startswith('/tmp/silex-print-ptbr-') and source.is_file() and not dbfile.exists()
with sqlite3.connect(source) as src,sqlite3.connect(dbfile) as dst:src.backup(dst)
env={**os.environ,'PYTHONPATH':str(P/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{dbfile}'}
os.chdir(P);os.execve(str(R/'.venv/bin/python'),[str(R/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','18096' if variant=='baseline' else '18097'],env)
