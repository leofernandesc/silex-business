"""Build a compact, explicit evidence package without credentials, databases or cookies."""
from pathlib import Path
import hashlib, html, json, shutil, subprocess, zipfile

R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb05-3a';D=R/'docs/silex-business/SB-05.3A'
env=json.loads((E/'environment.json').read_text());baseline=env['baseline_commit']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def flatten(j):
    rows=[]
    def visit(s,parents):
        titles=parents+[s.get('title','')]
        for spec in s.get('specs',[]):
            for t in spec['tests']:
                results=t['results'];result=results[-1] if results else {}
                rows.append({'key':' | '.join(titles+[spec['title'],t['projectName']]),'file':spec['file'],'title':spec['title'],'project':t['projectName'],'status':result.get('status','not-run'),'duration_ms':sum(r.get('duration',0) for r in results)})
        for child in s.get('suites',[]):visit(child,titles)
    for s in j['suites']:visit(s,[])
    return rows
def merge(names):
    rows={}
    for name in names:
        for row in flatten(json.loads((E/name).read_text())):rows[row['key']]=row
    return list(rows.values())
new=merge(['reconciliation-e2e-results.json','reconciliation-final-results.json','empty-final-results.json','reconciliation-dialog-results.json'])
regression=merge(['regression-results.json','regression-port-results.json','regression-port-final-results.json'])
assert len(new)==21 and all(r['status']=='passed' for r in new)
assert len(regression)==189 and all(r['status']=='passed' for r in regression)
functional=[]
for size in ['desktop','tablet','mobile']:
    a=json.loads((E/f'functional/baseline-{size}.json').read_text());b=json.loads((E/f'functional/candidate-{size}.json').read_text());assert a==b;functional.append({'project':size,'identical':True,'result':b})
runtime=[json.loads((E/f'runtime-{v}.json').read_text()) for v in ['baseline','candidate']]
v01=[row for j in runtime for row in j['v01']]
summary={'baseline':baseline,'unit':65,'backend':69,'new_e2e':len(new),'regression_e2e':len(regression),'baseline_functional_e2e':3,'all_final_cases_passed':True,'retry_policy':'Only failed environment/test setup cases were rerun; no automatic retries. Earlier attempts retained locally.','v01':{'executions':len(v01),'passed':sum(r['passed'] for r in v01),'observation_closed':False},'new':new,'regression':regression,'functional_comparison':functional}
(E/'tests-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
checks=json.loads((E/'preservation-test.json').read_text());assert checks['passed']
changes=subprocess.check_output(['git','diff','--name-status',baseline],cwd=R,text=True)
(E/'git-diff-stat.txt').write_text(subprocess.check_output(['git','diff','--stat',baseline],cwd=R,text=True))
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff',baseline,'--','frontend/src/financePlanning.tsx','frontend/src/reconciliation.css','docs/silex-business/PENDENCIAS.md'],cwd=R))
inventory=[]
for line in changes.splitlines():
    status,rel=line.split('\t',1);p=R/rel;inventory.append({'status':status,'path':rel,'bytes':p.stat().st_size,'sha256':sha(p)})
(E/'file-inventory.json').write_text(json.dumps(inventory,indent=2))
commits=[{'hash':line.split('\t')[0],'subject':line.split('\t',1)[1]} for line in subprocess.check_output(['git','log','--reverse','--format=%H%x09%s',baseline+'..HEAD'],cwd=R,text=True).splitlines()]
(E/'commits.json').write_text(json.dumps({'branch':subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip(),'baseline':baseline,'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'commits':commits,'main':subprocess.check_output(['git','rev-parse','main'],cwd=R,text=True).strip(),'status':subprocess.check_output(['git','status','--short'],cwd=R,text=True),'push_merge_deploy':False},indent=2))
labels={'main':'Extrato e estados','history':'Histórico de importações','focus':'Foco por teclado','last-column':'Última coluna e ações','match-dialog':'Associação de título','match-fields':'Principal e encargos','new-dialog':'Criação de lançamento','text200':'Texto ampliado a 200%','reg-finance-dashboard':'Dashboard preservado','reflow187':'Reflow equivalente a 187 px CSS','zoom200':'Simulação de zoom CSS a 200%','dialog-normal':'Diálogo: valor elevado','dialog-text200':'Diálogo com texto ampliado a 200%'}
parts=['<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SB-05.3A — revisão visual</title><style>body{font:16px system-ui;color:#102d5c;background:#f3f6fa;margin:0;padding:24px}main{max-width:1500px;margin:auto}a{color:#1769e8}h1{font-size:28px}h2{font-size:21px}section{margin:28px 0;padding:16px;background:white;border:1px solid #dbe3ed;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;min-width:0}img{width:100%;height:auto;border:1px solid #dbe3ed}figcaption{padding:8px;font-weight:600}button{padding:10px 16px;margin:4px;border:1px solid #102d5c;background:white;color:#102d5c;border-radius:6px}button:focus-visible{outline:3px solid #1769e8;outline-offset:2px}[hidden]{display:none!important}@media(max-width:768px){body{padding:12px}.pair{grid-template-columns:1fr}}</style><main><h1>Silex Business · SB-05.3A</h1><p>Capturas reais da aplicação em ambiente isolado, com dados fictícios. Antes: baseline aprovado. Depois: refinamento exclusivo da Conciliação. Clique na imagem para abrir em tamanho original.</p><p><a href="documents/RELATORIO.md">Relatório</a> · <a href="documents/TESTES.md">Testes</a> · <a href="tests-summary.json">Matriz</a> · <a href="preservation-test.json">Preservação</a></p><nav aria-label="Larguras"><button onclick="choose(1440)">1440 px</button><button onclick="choose(768)">768 px</button><button onclick="choose(375)">375 px</button><button onclick="choose(0)">Todas</button></nav><p>V01: 60/60 cliques direcionados aprovados, observação aberta. R02: shell com transbordamento anterior em zoom elevado; não há conformidade completa de reflow. P05 parcial.</p>']
selected=[]
for width in [1440,768,375]:
    for id,label in labels.items():
        paths=[E/f'screenshots/{v}-{id}-{width}.png' for v in ['baseline','candidate']]
        if not all(p.exists() for p in paths):continue
        selected.extend(paths);parts.append(f'<section data-width="{width}"><h2>{html.escape(label)} · {width} px</h2><div class="pair">')
        for v,p in zip(['Antes','Depois'],paths):
            rel=p.relative_to(E).as_posix();parts.append(f'<figure><figcaption>{v}</figcaption><a href="{rel}"><img loading="lazy" src="{rel}" alt="{v}: {html.escape(label)} em {width} px"></a></figure>')
        parts.append('</div></section>')
parts.append('<script>function choose(w){document.querySelectorAll("[data-width]").forEach(s=>s.hidden=w>0&&Number(s.dataset.width)!==w)}choose(375)</script></main></html>')
(E/'index.html').write_text(''.join(parts))
documents=E/'documents';documents.mkdir(exist_ok=True)
for p in D.glob('*.md'):shutil.copy2(p,documents/p.name)
shutil.copy2(R/'docs/silex-business/PENDENCIAS.md',documents/'PENDENCIAS.md')
recovery=E/'recovery';recovery.mkdir(exist_ok=True)
shutil.copytree(Path(env['backup'])/'original',recovery/'original',dirs_exist_ok=True)
shutil.copy2(Path(env['backup'])/'manifest.json',recovery/'manifest.json')
files=selected+list(documents.glob('*.md'))+list(recovery.rglob('*.md'))+list(recovery.rglob('*.tsx'))+[recovery/'manifest.json']
essentials=['index.html','tests-summary.json','file-inventory.json','commits.json','review.diff','git-diff-stat.txt','preservation-test.json','baseline-sha256.json','after-sha256.json','backup-initial.json','stable-style-comparison.json','dialog-audit.json','visual-baseline.json','visual-candidate.json','runtime-baseline.json','runtime-candidate.json','historical-test-adapters.json','navigation.spec.ts.isolated.diff','home.spec.ts.isolated.diff','public.spec.ts.isolated.diff','app.spec.ts.isolated.diff','baseline-unit.log','baseline-build.log','backend-tests.log','candidate-unit.log','candidate-types.log','new-test-types.log','final-build.log','regression-port.log','regression-port-final.log','reconciliation-dialog.log','reconciliation-corrected.log','empty-final.log','reflow-and-accessibility.json','gallery-check.json']
files += [E/name for name in essentials]
files += list((E/'functional').glob('*.json'))
files=sorted(set(files));assert all(p.is_file() for p in files)
for p in files:
    assert p.suffix.lower() not in ['.sqlite3','.db','.env'] and '.git' not in p.parts
    if p.suffix.lower() not in ['.png']:
        raw=p.read_text();assert 'DemoLocal#2026' not in raw and 'gestao_session=' not in raw and 'BEGIN PRIVATE KEY' not in raw,p
manifest=E/'manifest.sha256';manifest.write_text(''.join(f'{sha(p)}  {p.relative_to(E).as_posix()}\n' for p in files));files.append(manifest)
out=E/'SB-05.3A-review.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:z.write(p,p.relative_to(E).as_posix())
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    for line in manifest.read_text().splitlines():
        expected,rel=line.split('  ',1);assert hashlib.sha256(z.read(rel)).hexdigest()==expected
(E/'zip.sha256').write_text(sha(out)+'  '+out.name+'\n')
print(json.dumps({'zip':str(out),'bytes':out.stat().st_size,'sha256':sha(out),'files':len(files),'zip_integrity':True,'manifest_verified':True},indent=2))
