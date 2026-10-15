"""Compact review package; no databases, dependencies, build output or trace archives."""
from pathlib import Path
import hashlib
import html
import json
import os
import shutil
import subprocess
import zipfile

s=json.loads(Path(os.environ['SILEX_STATE']).read_text());r=Path(s['root']);e=r/'docs/evidence/sb06d1';b=Path(s['backup'])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((e/'preservation-test.json').read_text())['all_checks_passed']
assert json.loads((e/'test-results-summary.json').read_text())['all_final_groups_passed']
assert subprocess.check_output(['git','status','--porcelain'],cwd=r)==b''
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip()
(e/'git-summary.txt').write_text(subprocess.check_output(['git','status','--short','--branch'],cwd=r,text=True)+subprocess.check_output(['git','log','--format=%H %s',s['head']+'..HEAD'],cwd=r,text=True)+subprocess.check_output(['git','diff','--stat',s['head'],'HEAD'],cwd=r,text=True))
(e/'review.diff').write_bytes(subprocess.check_output(['git','diff',s['head'],'HEAD'],cwd=r))
files=subprocess.check_output(['git','diff','--name-status',s['head'],'HEAD'],cwd=r,text=True).splitlines()
(e/'file-inventory.json').write_text(json.dumps({'baseline':s['head'],'head':head,'branch':'feat/sb06d1-dates','files':files},indent=2))
reports=e/'reports';reports.mkdir(exist_ok=True)
for p in (r/'docs/silex-business/SB-06D.1').glob('*.md'):shutil.copy2(p,reports/p.name)
shutil.copy2(r/'docs/silex-business/PENDENCIAS.md',reports/'PENDENCIAS.md')
selected=set();sections=[]
def pair(title,before,after,note=''):
    for name in [before,after]:assert (e/'screenshots'/name).is_file();selected.add(name)
    sections.append(f'<section><h2>{html.escape(title)}</h2><p>{html.escape(note)}</p><div class="pair">'+''.join(f'<figure><figcaption>{label}</figcaption><a href="screenshots/{name}"><img loading="lazy" src="screenshots/{name}" alt="{html.escape(title)} — {label}; dados fictícios"></a></figure>' for label,name in [('Antes',before),('Depois',after)])+'</div></section>')
for width in [1440,768,375]:
    for route,title in [('finance-reports','Relatório mensal'),('result-monthly','Resultado por competência'),('home','Home autenticada')]:pair(f'{title} — {width} px',f'baseline-{route}-{width}.png',f'candidate-{route}-{width}.png')
pair('Suplemento histórico SB-06C — Home 375 px','historical-c269-home-375.png','baseline-home-375.png','Antes c2696e3; depois aa4964d. Ambas autenticadas e estabilizadas. Arquivos históricos não sobrescritos.')
for route in ['home','finance-reports']:pair(f'Texto computado 200% — {route} — 375 px',f'baseline-{route}-text200-375.png',f'candidate-{route}-text200-375.png','Simulação de ampliação de fontes, não zoom nativo.')
for route in ['finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard','sales','stock','public','login']:
    pair(f'Preservação — {route} — 375 px',f'baseline-{route}-375.png',f'candidate-{route}-375.png')
for locale,zone in [('pt-BR','America_Manaus'),('en-US','UTC'),('pt-BR','Pacific_Kiritimati')]:pair(f'Campo nativo — {locale} / {zone}',f'baseline-native-{locale}-{zone}.png',f'candidate-native-{locale}-{zone}.png','Mesmo ISO no controle, com apresentação dependente do navegador. Formulário cancelado sem persistir dados.')
page='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex Business — revisão SB-06D.1</title><style>body{font:16px system-ui,sans-serif;margin:0;background:#f3f6fb;color:#102d5c}header,main{max-width:1280px;margin:auto;padding:24px}header{background:#102d5c;color:white}header a{color:white}section{margin:24px 0;padding:18px;border:1px solid #8695aa;border-radius:10px;background:white}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}figure{margin:0;min-width:0}figcaption{font-weight:700;padding:8px}img{width:100%;height:auto;border:1px solid #8695aa;box-sizing:border-box}a{color:#102d5c}a:focus-visible{outline:3px solid #1769e8;outline-offset:3px}p{line-height:1.5}h1{font-size:1.6rem}h2{font-size:1.15rem}@media(max-width:650px){.pair{grid-template-columns:1fr}main,header{padding:12px}}</style><header><h1>Silex Business — SB-06D.1</h1><p>Revisão de datas e auditoria de CSS. Dados exclusivamente fictícios. Sem deploy. P05 parcial; P07 pendente.</p><a href="reports/RELATORIO.md">Relatório</a> · <a href="reports/DATAS.md">Inventário de datas</a> · <a href="reports/CSS-AUDITORIA.md">Plano CSS</a> · <a href="reports/HOME-SUPLEMENTO.md">Suplemento da Home</a></header><main>'''+''.join(sections)+'</main></html>'
(e/'index.html').write_text(page)
entries={}
def add(p,name):assert p.is_file(),p;entries[name]=p
add(e/'index.html','index.html')
for name in sorted(selected):add(e/'screenshots'/name,'screenshots/'+name)
for p in reports.glob('*.md'):add(p,'reports/'+p.name)
for p in (e/'scripts').iterdir():
    if p.suffix in ['.py','.cjs','.ts']:add(p,'scripts/'+p.name)
for p in e.glob('*.json'):add(p,p.name)
for name in ['git-summary.txt','review.diff']:add(e/name,name)
for p in (e/'logs').glob('*.log'):add(p,'logs/'+p.name)
changed=json.loads((e/'preservation-test.json').read_text())['changed_existing_files']
for rel in changed:add(b/'original'/rel,'backup/original/'+rel)
add(b/'manifest.json','backup/manifest.json')
for line in files:
    status,rel=line.split('\t',1)
    if rel.startswith('frontend/'):add(r/rel,'source/'+rel)
manifest=''.join(f'{sha(p)}  {name}\n' for name,p in sorted(entries.items()))
password=os.environ.get('SILEX_TEST_PASSWORD','').encode()
for name,p in entries.items():
    assert not any(x in name.split('/') for x in ['.git','node_modules','dist','__pycache__']),name
    assert not p.name.endswith(('.sqlite3','.db','.env')),name
    raw=p.read_bytes()
    if p.suffix not in ['.png']:
        assert not password or password not in raw,('test password',name)
        assert b'-----BEGIN PRIVATE KEY' not in raw,name
archive=e/'SB-06D.1-review.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name,p in sorted(entries.items()):z.write(p,name)
    z.writestr('MANIFEST.sha256',manifest)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for line in z.read('MANIFEST.sha256').decode().splitlines():
        h,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==h
(e/'MANIFEST.sha256').write_text(manifest)
(e/'SB-06D.1-review.zip.sha256').write_text(sha(archive)+'  '+archive.name+'\n')
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive),'screenshots':len(selected),'entries':len(entries)+1,'zip_integrity':'passed'},indent=2))
