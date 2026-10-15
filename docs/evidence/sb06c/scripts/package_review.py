"""Compact external review package: explicit allowlist, hashes, no private data."""
from pathlib import Path
import hashlib, html, json, os, re, subprocess, zipfile

R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb06c';BASE='c2696e3f130b216aca9c12c6d6c3cad0fc79bb3f'
HEAD=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff',BASE,HEAD],cwd=R))
(E/'git-summary.txt').write_text(subprocess.check_output(['git','log','--format=%H %s',BASE+'..HEAD'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','status','--short','--branch'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','diff','--stat',BASE,HEAD],cwd=R,text=True))
changes=subprocess.check_output(['git','diff','--name-status',BASE,HEAD],cwd=R,text=True).splitlines()
(E/'file-inventory.json').write_text(json.dumps([{'status':line.split('\t')[0],'path':line.split('\t')[-1]} for line in changes],indent=2))
routes=[('public','Página pública'),('login','Login'),('home','Início'),('dashboard','Visão Geral'),('customers','Clientes'),('products','Produtos e Serviços'),('sales','Vendas'),('pos','Frente de Caixa'),('stock','Estoque'),('finance','Lançamentos'),('finance-payable','Contas a Pagar'),('finance-receivable','Contas a Receber'),('finance-reconcile','Conciliação Bancária'),('finance-dashboard','Dashboard Financeiro'),('company-settings','Empresa e identidade')]
options=''.join(f'<option value="{key}">{html.escape(label)}</option>' for key,label in routes)
page='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex Business · revisão SB-06C</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#f4f6fa;color:#102d5c;font:16px/1.6 Inter,system-ui,sans-serif}main{max-width:1500px;margin:auto}header,section{background:white;border:1px solid #dce4f0;border-radius:12px;padding:24px;margin-bottom:20px}h1,h2{line-height:1.3}label{display:inline-flex;align-items:center;gap:8px;max-width:100%;margin:8px 12px 8px 0}select{font:inherit;min-height:44px;max-width:100%;color:#102d5c;border:1px solid #8192ac;padding:6px;border-radius:6px}nav{display:flex;flex-wrap:wrap;gap:8px 20px}a{color:#102d5c;text-underline-offset:3px}a:focus-visible,select:focus-visible{outline:3px solid #1769e8;outline-offset:3px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0}figcaption{font-weight:600;margin-bottom:8px}.frame{max-height:80vh;overflow:auto;border:1px solid #dce4f0;border-radius:8px}.frame img{display:block;width:100%;height:auto}.note{color:#52627a}code{overflow-wrap:anywhere}@media(max-width:850px){.pair{grid-template-columns:minmax(0,1fr)}body{padding:12px}header,section{padding:16px}label{display:flex;flex-wrap:wrap}}
</style><main><header><h1>Silex Business · SB-06C</h1><p>Revisão de contraste, foco e áreas de acionamento. Todas as informações das capturas são fictícias. São evidências de ambiente isolado; nenhum deploy foi realizado.</p><p class="note">26 telas auditadas, 104 combinações de tela/largura. Esta galeria reúne 15 telas representativas nas três resoluções. As demais constam das matrizes. Não representa certificação WCAG completa.</p><nav><a href="../../silex-business/SB-06C/RELATORIO.md">Relatório</a><a href="../../silex-business/SB-06C/CONTRASTES.md">Contrastes</a><a href="../../silex-business/SB-06C/CONTROLES.md">Controles</a><a href="../../silex-business/SB-06C/TESTES.md">Testes e tentativas</a><a href="test-results-summary.json">Resultados</a><a href="review.diff">Diff</a><a href="git-summary.txt">Commits</a></nav></header>
<section><h2>Antes e depois</h2><label>Tela <select id="route">OPTIONS</select></label><label>Largura <select id="width"><option>1440</option><option>768</option><option selected>375</option></select></label><p class="note">Role dentro da imagem para ler a página inteira. O link abre a captura em tamanho original.</p><div class="pair"><figure><figcaption>SB-06B aprovado — antes</figcaption><a id="before-link" target="_blank" rel="noopener">Abrir captura original</a><div class="frame" tabindex="0" aria-label="Captura antes, rolável"><img id="before" alt="Tela antes do SB-06C, dados fictícios"></div></figure><figure><figcaption>SB-06C — depois</figcaption><a id="after-link" target="_blank" rel="noopener">Abrir captura original</a><div class="frame" tabindex="0" aria-label="Captura depois, rolável"><img id="after" alt="Mesma tela após o SB-06C, dados fictícios"></div></figure></div></section>
<section><h2>Foco, modal, menu e ampliação</h2><label>Estado <select id="state"><option value="payable-focus">Busca financeira com foco</option><option value="customers-dialog">Modal de Clientes</option><option value="menu">Menu aberto</option><option value="pos-cart">PDV com item</option><option value="payable-text200">Texto computado a 200%</option></select></label><div class="pair"><figure><figcaption>Antes</figcaption><div class="frame" tabindex="0" aria-label="Estado antes, rolável"><img id="state-before" alt="Estado de componente antes"></div></figure><figure><figcaption>Depois</figcaption><div class="frame" tabindex="0" aria-label="Estado depois, rolável"><img id="state-after" alt="Estado correspondente depois"></div></figure></div><p class="note">Ampliação de fonte computada é uma simulação, não zoom nativo. Excessos de conteúdo anteriores são mantidos e discriminados na matriz. V01/T01 continuam em acompanhamento.</p></section></main>
<script>function update(){const r=document.getElementById('route').value,w=document.getElementById('width').value,s=document.getElementById('state').value;for(const [variant,id]of [['baseline','before'],['candidate','after']]){const src=`screenshots/${variant}-${r}-${w}.png`;document.getElementById(id).src=src;document.getElementById(id+'-link').href=src;const extra=s==='customers-dialog'?`${variant}-customers-dialog-${w}.png`:`${variant}-${s}-${w}.png`;document.getElementById('state-'+id).src='screenshots/'+extra;}}for(const id of ['route','width','state'])document.getElementById(id).addEventListener('change',update);document.getElementById('route').value='customers';update();</script></html>'''.replace('OPTIONS',options)
(E/'index.html').write_text(page)
files={}
def include(p,rel=None):
 assert p.is_file(),p
 files[rel or p.relative_to(R).as_posix()]=p.read_bytes()
for p in (R/'docs/silex-business/SB-06C').glob('*.md'):include(p)
include(R/'docs/silex-business/PENDENCIAS.md')
for p in (E/'scripts').iterdir():
 if p.suffix in ['.py','.cjs','.ts']:include(p)
for p in ['frontend/src/styles.css','frontend/src/styles/tokens.css','frontend/tests/visual-accessibility.spec.ts']:include(R/p)
for name in ['index.html','review.diff','git-summary.txt','file-inventory.json','audit-summary.json','contrast-matrix.json','target-inventory.json','screen-matrix.json','text200-matrix.json','gradient-sampling-before-fix.json','gradient-sampling.json','test-results-summary.json','test-matrix.json','financial-equivalence.json','cash-precondition.json','closed-baseline-diagnosis.json','public-preservation.json','v01-navigation.json','preservation-test.json','baseline-sha256.json','candidate-sha256.json']:
 include(E/name)
for variant in ['baseline','candidate']:
 for width in [1440,768,375]:
  for route,_ in routes:include(E/f'screenshots/{variant}-{route}-{width}.png')
  for state in ['payable-focus','menu','pos-cart','payable-text200']:include(E/f'screenshots/{variant}-{state}-{width}.png')
  include(E/f'screenshots/{variant}-customers-dialog-{width}.png')
for name in ['baseline-build','baseline-frontend','baseline-backend','candidate-build','candidate-frontend','candidate-backend','test-types','new-tests-final','regression-final','modal-final']:
 include(E/'logs'/(name+'.log'))
state=json.loads(Path(os.environ['SILEX_STATE']).read_text());backup=Path(state['backup']);manifest=json.loads((backup/'manifest.json').read_text());include(backup/'manifest.json','recovery/manifest.json')
for rel in manifest['original_files']:include(backup/'original'/rel,'recovery/original/'+rel)
password=os.environ.get('SILEX_TEST_PASSWORD','').encode()
for rel,b in files.items():
 assert not any(part in ['.git','node_modules','__pycache__','dist'] for part in Path(rel).parts),rel
 assert Path(rel).suffix not in ['.sqlite3','.db','.env'],rel
 assert not password or password not in b,('credential found',rel)
 assert not re.search(rb'-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|sk-proj-[A-Za-z0-9_-]{20,}',b),rel
files['MANIFEST.sha256']=''.join(f'{hashlib.sha256(b).hexdigest()}  {p}\n' for p,b in sorted(files.items())).encode()
archive=E/'SB-06C-review.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p,b in sorted(files.items()):z.writestr(p,b)
with zipfile.ZipFile(archive)as z:
 assert z.testzip() is None
 for line in z.read('MANIFEST.sha256').decode().splitlines():
  h,p=line.split('  ',1);assert hashlib.sha256(z.read(p)).hexdigest()==h,p
digest=hashlib.sha256(archive.read_bytes()).hexdigest();archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(files),'sha256':digest,'all_internal_hashes_verified':True},indent=2))
