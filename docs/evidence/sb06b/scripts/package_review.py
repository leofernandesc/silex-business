"""Create a compact, whitelisted SB-06B review archive with internal hashes."""
from pathlib import Path
import hashlib
import html
import json
import os
import re
import subprocess
import zipfile

R = Path(__file__).resolve().parents[4]
E = R/'docs/evidence/sb06b'
BASE = 'fc3498e938cd2eef127dd65161ee909d9f67dd73'
HEAD = subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff',BASE,HEAD],cwd=R))
(E/'git-summary.txt').write_text(subprocess.check_output(['git','log','--format=%H %s',BASE+'..HEAD'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','status','--short','--branch'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','diff','--stat',BASE,HEAD],cwd=R,text=True))
page='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex Business · SB-06B</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#f2f5fa;color:#102d5c;font:16px/1.6 Inter,system-ui,sans-serif}main{max-width:1480px;margin:auto}header,section{padding:22px;background:white;border:1px solid #dce3ee;border-radius:12px;margin-bottom:24px}h1{font-size:clamp(1.5rem,4vw,2.2rem)}h2{font-size:1.3rem}a{color:#1769e8}nav{display:flex;gap:18px;flex-wrap:wrap}select{padding:10px;font:inherit;max-width:100%}label{display:inline-block;margin:0 14px 16px 0}a:focus-visible,select:focus-visible{outline:3px solid #1769e8;outline-offset:3px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{min-width:0;margin:0}img{max-width:100%;display:block;border:1px solid #dce3ee}figcaption{font-weight:600;padding:10px 0}.note{padding:12px;background:#eff5ff;border-left:4px solid #1769e8}@media(max-width:720px){body{padding:10px}header,section{padding:14px}.pair{grid-template-columns:1fr}}</style>
<main><header><h1>Silex Business · SB-06B</h1><p>Gerenciamento e retorno de foco dos modais. Ambiente isolado, informações fictícias. 23 usos do Modal em dez arquivos; o histórico de 42 corresponde a verificações por resolução.</p><p class="note">Escape na amostra de 45 aberturas: retorno ao acionador 0/45 → 45/45. Formulários e apresentação preservados.</p><nav><a href="../../silex-business/SB-06B/RELATORIO.md">Relatório</a><a href="../../silex-business/SB-06B/AUDITORIA.md">Auditoria</a><a href="../../silex-business/SB-06B/TESTES.md">Matriz de testes</a><a href="../../silex-business/SB-06B/PRESERVACAO.md">Recuperação</a><a href="test-results-summary.json">Resultados</a><a href="review.diff">Diff</a><a href="git-summary.txt">Commits</a></nav></header>
<section><h2>Após fechar: foco restaurado</h2><p>Clientes, fechamento por Escape. O acionador continua presente. O contorno de foco é o existente no design system.</p><label>Largura <select id="width"><option>1440</option><option>768</option><option selected>375</option></select></label><div class="pair"><figure><figcaption>Baseline — foco perdido para body</figcaption><img id="before" alt="Clientes antes: acionador sem foco após Escape"></figure><figure><figcaption>Candidata — retorno ao botão Novo cliente</figcaption><img id="after" alt="Clientes depois: Novo cliente recebe foco visível após Escape"></figure></div></section>
<section><h2>Apresentação dos modais preservada</h2><label>Diálogo <select id="module"><option value="customers">Clientes</option><option value="finance-payable">Contas a Pagar</option><option value="finance-receivable">Contas a Receber</option></select></label><p>Mesma fixture, controles e posição de foco durante o diálogo.</p><div class="pair"><figure><figcaption>Antes</figcaption><img id="open-before" alt="Modal aberto no baseline"></figure><figure><figcaption>Depois</figcaption><img id="open-after" alt="Mesmo modal aberto na candidata"></figure></div></section>
<section><h2>Conciliação e ampliação de texto</h2><div class="pair"><figure><figcaption>Revisão de movimento — foco inicial seguro</figcaption><img id="reconcile" alt="Diálogo real de Conciliação com foco no botão Fechar janela"></figure><figure><figcaption>Clientes — fontes computadas duplicadas</figcaption><img id="text" alt="Diálogo de Clientes com texto ampliado e foco por teclado"></figure></div><p class="note">Fontes a 200% são simulação de ampliação. Zoom nativo e leitor de tela real não estão homologados. R02 e os excessos independentes da Home/Visão Geral conservam seus limites anteriores.</p></section></main>
<script>function update(){const w=document.getElementById('width').value,m=document.getElementById('module').value;document.getElementById('before').src=`baseline-customers-${w}-closed.png`;document.getElementById('after').src=`candidate-customers-${w}-closed.png`;document.getElementById('open-before').src=`baseline-${m}-${w}-open.png`;document.getElementById('open-after').src=`candidate-${m}-${w}-open.png`;document.getElementById('reconcile').src=`candidate-reconciliation-${w}-focus.png`;document.getElementById('text').src=`candidate-customers-${w}-text200.png`;}document.getElementById('width').addEventListener('change',update);document.getElementById('module').addEventListener('change',update);update();</script></html>'''
(E/'index.html').write_text(page)
files={}
def include(p,rel=None):
    assert p.is_file(), p
    files[rel or p.relative_to(R).as_posix()]=p.read_bytes()
for p in (R/'docs/silex-business/SB-06B').glob('*.md'):include(p)
include(R/'docs/silex-business/PENDENCIAS.md')
for name in ['frontend/src/ui.tsx','frontend/src/useModalFocus.ts','frontend/tests/modal-focus.spec.ts','frontend/tests/modal-workflows.spec.ts','frontend/tests/fixtures/modal-focus.tsx','frontend/tests/fixtures/modal-focus.html']:include(R/name)
for p in (E/'scripts').iterdir():
    if p.suffix in ['.py','.cjs','.ts']:include(p)
for p in E.glob('*.png'):include(p)
for name in ['index.html','review.diff','git-summary.txt','test-results-summary.json','test-matrix.json','preservation-test.json','baseline-sha256.json','candidate-sha256.json','ui-preservation.json','financial-equivalence.json','modal-inventory.json','baseline-cause.json','candidate-close-trace.json','baseline-modal-probe.json','candidate-modal-probe.json','patterns-and-text200.json','visual-comparison.json','public-timeout-evidence.json']:include(E/name)
for p in (E/'tests').glob('*.log'):include(p)
backup=Path(json.loads((E/'preservation-test.json').read_text())['backup_path'])
for rel in ['manifest.json','baseline.json','original/frontend/src/ui.tsx','original/docs/silex-business/PENDENCIAS.md']:include(backup/rel,'backup/'+rel)
for rel,data in files.items():
    assert not any(part in {'.git','node_modules','dist','__pycache__'} for part in Path(rel).parts)
    assert Path(rel).suffix not in {'.db','.sqlite','.sqlite3','.env','.pem','.key'}
    if not rel.endswith('.png'):
        assert not re.search(rb'-----BEGIN [^-]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9]{20,}',data),rel
        password=os.environ.get('SILEX_TEST_PASSWORD','')
        assert not password or password.encode() not in data,rel
files['MANIFEST.sha256']=''.join(f'{hashlib.sha256(data).hexdigest()}  {rel}\n' for rel,data in sorted(files.items())).encode()
archive=E/'SB-06B-review.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    for rel,data in sorted(files.items()):z.writestr(rel,data)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for line in z.read('MANIFEST.sha256').decode().splitlines():
        digest,rel=line.split('  ',1);assert hashlib.sha256(z.read(rel)).hexdigest()==digest
sha=hashlib.sha256(archive.read_bytes()).hexdigest();(E/'SB-06B-review.zip.sha256').write_text(f'{sha}  {archive.name}\n')
result={'archive':archive.name,'bytes':archive.stat().st_size,'files':len(files),'sha256':sha,'source_head':HEAD,'crc_valid':True,'all_internal_hashes_valid':True,'private_data_git_dependencies_builds_included':False}
(E/'package-integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
