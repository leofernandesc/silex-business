"""Build the SB-06A review gallery and a whitelist-only, checked archive."""
from pathlib import Path
import csv
import hashlib
import html
import json
import os
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[4]
E = ROOT / 'docs/evidence/sb06a'
BASE = '67cdee96fd17c3e653e478d10fccdcd5296d2740'
HEAD = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
versions = {v: json.loads((E / f'measurements-{v}.json').read_text()) for v in ['baseline', 'candidate']}
with (E / 'matrix.csv').open('w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['version', 'route', 'viewport_css', 'document', 'document_excess', 'header_client', 'header_scroll', 'header_height', 'header_offenders', 'main_client', 'main_scroll'])
    for v, data in versions.items():
        for r in data['rows']:
            writer.writerow([v, r['id'], r['width'], r['documentWidth'], r['documentExcess'], r['header']['client'], r['header']['scroll'], r['header']['height'], len(r['headerOffenders']), r['main']['client'], r['main']['scroll']])
titles = dict(re.findall(r'id:\s*"([^"]+)"\s*,\s*title:\s*"([^"]+)"', (ROOT / 'frontend/src/navigation/routes.ts').read_text(), re.S))
ids = list(dict.fromkeys(r['id'] for r in versions['candidate']['rows']))
options = ''.join(f'<option value="{html.escape(i)}">{html.escape(titles.get(i, i))}</option>' for i in ids)
selectors = '''<label>Largura <select id="width">''' + ''.join(f'<option>{w}</option>' for w in [1440,1024,768,375,320,256,187]) + '</select></label>'
page = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex Business · revisão SB-06A</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#102d5c;background:#f3f6fa}*{box-sizing:border-box}body{margin:0;padding:24px}main{max-width:1440px;margin:auto}header,section{padding:22px;background:#fff;border:1px solid #dce3ee;border-radius:12px;margin-bottom:24px}h1{font-size:clamp(1.4rem,3vw,2rem)}h2{font-size:1.2rem}p{line-height:1.6}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:16px}figure{min-width:0;margin:0}img{display:block;max-width:100%;height:auto;border:1px solid #dce3ee}figcaption{font-weight:600;padding:10px 0}select{padding:10px;font:inherit;max-width:100%}label{display:inline-block;margin:0 14px 12px 0}nav{display:flex;gap:18px;flex-wrap:wrap}a{color:#1769e8}a:focus-visible,select:focus-visible{outline:3px solid #1769e8;outline-offset:3px}table{border-collapse:collapse}td,th{text-align:left;padding:8px;border-bottom:1px solid #dce3ee}.scroll{overflow:auto}.note{padding:12px;background:#eff5ff;border-left:4px solid #1769e8}@media(max-width:720px){body{padding:10px}header,section{padding:14px}.pair{grid-template-columns:1fr}}</style><main><header><h1>Silex Business · SB-06A</h1><p>Correção direcionada R02. Capturas de ambiente isolado e dados fictícios. O cabeçalho acomoda o conteúdo com quebra de linhas e mantém todos os controles.</p><p class="note">Lançamentos: documento 325 → 320 px na viewport de 320 px; 252 → 187 px em 187 px. As larguras de 256/187 px são robustez adicional. Zoom nativo 200/400% não homologado; viewport e simulação de texto não o substituem.</p><nav><a href="../../silex-business/SB-06A/RELATORIO.md">Relatório</a><a href="../../silex-business/SB-06A/DIAGNOSTICO.md">Diagnóstico</a><a href="../../silex-business/SB-06A/TESTES.md">Testes</a><a href="../../silex-business/SB-06A/PRESERVACAO.md">Recuperação</a><a href="matrix.csv">Matriz CSV</a><a href="test-results-summary.json">Resultados</a><a href="review.diff">Diff</a><a href="git-summary.txt">Commits</a></nav></header>
<section><h2>Cabeçalho nas sete larguras</h2>''' + selectors + '''<div class="pair"><figure><img id="ledger-before" alt="Cabeçalho de Lançamentos antes"><figcaption>Antes</figcaption></figure><figure><img id="ledger-after" alt="Cabeçalho de Lançamentos depois"><figcaption>Depois</figcaption></figure></div><p id="dimensions"></p></section>
<section><h2>23 módulos e Home · 375 px</h2><label>Tela <select id="route">''' + options + '''</select></label><div class="pair"><figure><img id="route-before" alt="Tela selecionada antes"><figcaption>Antes</figcaption></figure><figure><img id="route-after" alt="Tela selecionada depois"><figcaption>Depois</figcaption></figure></div><p>As demais larguras de cada tela estão na matriz CSV. O recorte inclui o cabeçalho e o começo do conteúdo.</p></section>
<section><h2>Nomes sintéticos longos</h2><label>Perfil <select id="role"><option value="admin">Administrador</option><option value="operator">Operador</option></select></label><label>Largura <select id="long-width">''' + ''.join(f'<option>{w}</option>' for w in [1440,1024,768,375,320,256,187]) + '''</select></label><div class="pair"><figure><img id="long-before" alt="Identificação longa antes"><figcaption>Antes</figcaption></figure><figure><img id="long-after" alt="Identificação longa depois"><figcaption>Depois</figcaption></figure></div></section>
<section><h2>Menu aberto com identificação longa</h2><label>Largura <select id="menu-width"><option>375</option><option>320</option><option>256</option><option>187</option></select></label><div class="pair"><figure><img id="menu-before" alt="Menu antes com nome empresarial longo"><figcaption>Antes · perfil selecionado acima</figcaption></figure><figure><img id="menu-after" alt="Menu depois, com Fechar dentro da tela"><figcaption>Depois · mesmo perfil</figcaption></figure></div></section>
<section><h2>Texto computado a 200% · 375 px</h2><p>Simulação de tamanhos tipográficos efetivamente duplicados no cabeçalho e menu. Não é zoom nativo do navegador.</p><div class="pair"><figure><img src="captures/baseline-computed-text200-375.png" alt="Texto ampliado antes"><figcaption>Antes</figcaption></figure><figure><img src="captures/candidate-computed-text200-375.png" alt="Texto ampliado depois"><figcaption>Depois</figcaption></figure></div><div class="pair"><figure><img src="captures/baseline-computed-text200-menu.png" alt="Menu ampliado antes"><figcaption>Antes · foco por teclado</figcaption></figure><figure><img src="captures/candidate-computed-text200-menu.png" alt="Menu ampliado depois"><figcaption>Depois · foco por teclado</figcaption></figure></div></section>
<section><h2>Foco e menu por teclado — candidata</h2><div class="pair"><figure><img src="captures/keyboard-tablet.png" alt="Foco de teclado no menu em tablet"><figcaption>Tablet · P03</figcaption></figure><figure><img src="captures/keyboard-mobile.png" alt="Foco de teclado no menu em celular"><figcaption>Celular · P03</figcaption></figure></div></section><section><h2>Preservação do Login e da página pública · 375 px</h2><div class="pair"><figure><img src="captures/baseline-login-375.png" alt="Login antes"><figcaption>Login antes</figcaption></figure><figure><img src="captures/candidate-login-375.png" alt="Login depois"><figcaption>Login depois · pixels idênticos</figcaption></figure></div><div class="pair"><figure><img src="captures/baseline-public-375.png" alt="Página comercial antes"><figcaption>Público antes</figcaption></figure><figure><img src="captures/candidate-public-375.png" alt="Página comercial depois"><figcaption>Público depois · pixels idênticos</figcaption></figure></div></section>
<section><h2>Limites restantes</h2><p>O cabeçalho cabe nas sete larguras. A Visão Geral tem excesso próprio de conteúdo em 187 px; a Home com identificação sintética longa tem excesso em 256/187 px. Essas ocorrências anteriores estão fora da correção e documentadas. P01 permanece para SB-06B; V01 continua em acompanhamento.</p></section></main><script>
const data=DATA_JSON;
function pair(prefix,stem){document.getElementById(prefix+'-before').src='captures/baseline-'+stem+'.png';document.getElementById(prefix+'-after').src='captures/candidate-'+stem+'.png';}
function update(){const w=document.getElementById('width').value;pair('ledger','finance-'+w);pair('route',document.getElementById('route').value+'-375');const role=document.getElementById('role').value;pair('long','long-'+role+'-'+document.getElementById('long-width').value);pair('menu','menu-'+role+'-'+document.getElementById('menu-width').value);const b=data.baseline.rows.find(r=>r.id==='finance'&&r.width==w),a=data.candidate.rows.find(r=>r.id==='finance'&&r.width==w);document.getElementById('dimensions').textContent=`Viewport ${w} px; documento ${b.documentWidth} → ${a.documentWidth} px; cabeçalho scrollWidth ${b.header.scroll} → ${a.header.scroll} px.`;}
document.querySelectorAll('select').forEach(e=>e.addEventListener('change',update));update();document.querySelectorAll('img').forEach(img=>{const link=document.createElement('a');link.href=img.src;img.before(link);link.append(img);img.addEventListener('load',()=>link.href=img.src);});</script></html>'''
small = {v:{'rows':[{'id':r['id'],'width':r['width'],'documentWidth':r['documentWidth'],'header':{'scroll':r['header']['scroll']}} for r in d['rows']]} for v,d in versions.items()}
page = page.replace('DATA_JSON',json.dumps(small,ensure_ascii=False).replace('</','<\\/'))
(E/'index.html').write_text(page)
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff',f'{BASE}..{HEAD}'],cwd=ROOT))
(E/'git-summary.txt').write_text(f'Baseline: {BASE}\nHEAD: {HEAD}\n'+subprocess.check_output(['git','log',f'{BASE}..{HEAD}','--format=%H %s'],cwd=ROOT,text=True)+'\n'+subprocess.check_output(['git','diff',f'{BASE}..{HEAD}','--stat'],cwd=ROOT,text=True)+'\n'+subprocess.check_output(['git','status','--short','--branch'],cwd=ROOT,text=True))
files={}
def include(p,name=None):
    p=Path(p);files[name or p.relative_to(ROOT).as_posix()]=p.read_bytes()
for p in (ROOT/'docs/silex-business/SB-06A').glob('*.md'):include(p)
include(ROOT/'docs/silex-business/PENDENCIAS.md')
include(ROOT/'frontend/tests/header-reflow.spec.ts')
for name in ['index.html','matrix.csv','measurements-baseline.json','measurements-candidate.json','pixel-comparison.json','layout-summary.json','database-integrity.json','api-comparison.json','test-results-summary.json','preservation-test.json','zoom-limitations.json','text-and-content-baseline.json','text-and-content-candidate.json','git-summary.txt','review.diff']:
    include(E/name)
for name in ['baseline-targeted.log','baseline-build.log','baseline-unit.log','candidate-build.log','candidate-unit.log','backend.log','types-e2e.log','e2e-final.log','computed-text200.log']:
    include(E/'tests'/name)
for p in (E/'scripts').iterdir():
    if p.suffix in ['.py','.cjs','.ts']:include(p)
for p in (E/'captures').glob('*.png'):
    if '-nativezoom-' not in p.name:include(p)
preservation=json.loads((E/'preservation-test.json').read_text());backup=Path(preservation['backup_path'])
for rel in ['baseline-sha256.json','manifest.json','original/frontend/src/styles.css','original/docs/silex-business/PENDENCIAS.md']:
    include(backup/rel,'backup/'+rel)
for name,blob in files.items():
    if any(part in {'.git','node_modules','dist','__pycache__'} for part in Path(name).parts) or Path(name).suffix in {'.sqlite','.sqlite3','.db','.env','.key'}:
        raise RuntimeError('Forbidden archive path: '+name)
    if not name.endswith('.png') and ((bool(os.environ.get('SILEX_TEST_PASSWORD')) and os.environ['SILEX_TEST_PASSWORD'].encode() in blob) or re.search(rb'-----BEGIN [^-]*PRIVATE KEY-----|sk-proj-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}',blob)):
        raise RuntimeError('Credential/secret marker in '+name)
manifest=''.join(f'{hashlib.sha256(blob).hexdigest()}  {name}\n' for name,blob in sorted(files.items()))
files['MANIFEST.sha256']=manifest.encode()
archive=E/'SB-06A-review.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    for name,blob in sorted(files.items()):z.writestr(name,blob)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for line in z.read('MANIFEST.sha256').decode().splitlines():
        digest,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==digest
sha=hashlib.sha256(archive.read_bytes()).hexdigest();(E/'SB-06A-review.zip.sha256').write_text(f'{sha}  {archive.name}\n')
(root_manifest:=E/'manifest.sha256').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT).as_posix()}\n' for p in sorted([ROOT/'frontend/src/styles.css',ROOT/'frontend/tests/header-reflow.spec.ts',ROOT/'docs/silex-business/PENDENCIAS.md',*list((ROOT/'docs/silex-business/SB-06A').glob('*.md')),*list((E/'scripts').glob('*.py')),*list((E/'scripts').glob('*.cjs')),*list((E/'scripts').glob('*.ts')),archive])))
result={'archive':archive.name,'bytes':archive.stat().st_size,'files':len(files),'sha256':sha,'crc_valid':True,'all_internal_hashes_valid':True,'source_head':HEAD,'credentials_databases_git_builds_included':False}
(E/'package-integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
