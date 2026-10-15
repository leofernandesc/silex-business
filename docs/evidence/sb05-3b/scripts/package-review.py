"""Produce a scoped review archive; preserve justified failures and exclude credentials/data."""
from pathlib import Path
import hashlib, html, json, shutil, sqlite3, subprocess, sys, zipfile
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb05-3b';D=R/'docs/silex-business/SB-05.3B'
env=json.loads((E/'environment.json').read_text());base=env['baseline_commit']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def cases(name):
    out=[]
    def walk(s,parents):
        names=parents+[s.get('title','')]
        for spec in s.get('specs',[]):
            for t in spec['tests']:
                result=t['results'][-1] if t['results'] else {}
                out.append({'key':' | '.join(names+[spec['title'],t['projectName']]),'file':spec['file'],'title':spec['title'],'project':t['projectName'],'status':result.get('status','not-run'),'duration_ms':sum(r.get('duration',0) for r in t['results'])})
        for c in s.get('suites',[]):walk(c,names)
    for s in json.loads((E/name).read_text())['suites']:walk(s,[])
    return out
new={r['key']:r for r in cases('dashboard-results.json')}
for r in cases('chart-final-contrast-results.json'):new[r['key']]=r
new=list(new.values());reg=cases('regression-results.json');legacy=cases('baseline-ledger-results.json')
assert len(new)==21 and all(r['status']=='passed' for r in new)
assert len(reg)==210 and sum(r['status']=='passed' for r in reg)==208
assert all(r['file']=='ledger-interface.spec.ts' and r['project']=='mobile' and 'P05 native ISO' in r['title'] for r in reg if r['status']!='passed')
assert len(legacy)==2 and all(r['status']=='failed' for r in legacy)
probe=json.loads((E/'legacy-ledger.json').read_text());assert probe['preexisting'] and probe['identicalDataAndPresentation']
financial=json.loads((E/'financial-comparison.json').read_text());assert financial['responseEqual'] and financial['uiEqual']
preservation=json.loads((E/'preservation-test.json').read_text());assert preservation['passed']
styles=json.loads((E/'stable-style-comparison.json').read_text());assert styles['passed']
visual=json.loads((E/'visual-candidate.json').read_text())['rows']
assert all(r['document']<=r['viewport']+1 for r in visual if r['id'] not in ['reflow187','zoom200'])
assert all(r['scopeScroll']<=r['scope']+1 and not r['errors'] for r in visual)
access=json.loads((E/'accessibility.json').read_text());assert all(not r['failures'] for r in access['failures'] if r['variant']=='candidate')
database=[];W=Path(env['work_dir']);assert str(W).startswith('/tmp/silex-sb053b-') and env['persistent_database_used'] is False
for name in ['baseline','candidate','functional','baseline-functional']:
    with sqlite3.connect(W/(name+'.sqlite3')) as c:
        integrity=c.execute('PRAGMA integrity_check').fetchone()[0];fk=c.execute('PRAGMA foreign_key_check').fetchall();assert integrity=='ok' and not fk;database.append({'temporary':True,'database':name,'integrity':integrity,'foreign_key_errors':len(fk)})
summary={'baseline':base,'frontend_baseline':65,'frontend_candidate':71,'backend':69,'typescript_build':'passed','dashboard_e2e':new,'regression_e2e':reg,'baseline_legacy_failures':legacy,'counts':{'dashboard_passed':21,'regression_passed':208,'regression_total':210,'justified_preexisting_failures':2},'all_regression_tests_passed':False,'v01':{'executions':financial['v01']['executions'],'passed':financial['v01']['passed'],'closed':False},'financial_response_pairs':len(financial['variants']['baseline']['responses']),'financial_ui_pairs':len(financial['variants']['baseline']['ui']),'database_checks':database,'R02_open':True,'V02_open':True,'automatic_retries':False}
(E/'tests-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
changes=[]
for line in subprocess.check_output(['git','diff','--name-status',base],cwd=R,text=True).splitlines():
    status,rel=line.split('\t',1);p=R/rel;changes.append({'status':status,'path':rel,'bytes':p.stat().st_size,'sha256':sha(p)})
(E/'file-inventory.json').write_text(json.dumps(changes,indent=2))
(E/'git-diff-stat.txt').write_text(subprocess.check_output(['git','diff','--stat',base],cwd=R,text=True))
paths=['frontend/src/financePlanning.tsx','frontend/src/financialDashboard.css','frontend/src/dashboardPresentation.tsx','frontend/src/dashboardPresentation.test.ts','docs/silex-business/PENDENCIAS.md']
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff',base,'--',*paths],cwd=R))
commits=[{'hash':line.split('\t')[0],'subject':line.split('\t',1)[1]} for line in subprocess.check_output(['git','log','--reverse','--format=%H%x09%s',base+'..HEAD'],cwd=R,text=True).splitlines()]
(E/'commits.json').write_text(json.dumps({'branch':subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip(),'baseline':base,'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'main':subprocess.check_output(['git','rev-parse','main'],cwd=R,text=True).strip(),'commits':commits,'status':subprocess.check_output(['git','status','--short'],cwd=R,text=True),'push_merge_deploy':False},indent=2))
labels={'full':'Dashboard completo','indicators':'Indicadores e filtros','chart':'Gráfico mensal','classification':'Resultado por classificação','accounts':'Saldos por conta','focus':'Foco por teclado','last-column':'Última coluna','text200':'Texto ampliado a 200%','zoom200':'Zoom CSS a 200%','reflow187':'Reflow equivalente a 187 px CSS','legacy-ledger':'V02: Lançamentos, problema anterior'}
parts=['<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Silex Business · SB-05.3B</title><style>body{margin:0;padding:24px;background:#f4f6fa;color:#102d5c;font:16px system-ui}main{max-width:1500px;margin:auto}a{color:#1769e8}h1{font-size:28px}h2{font-size:20px}section{background:white;padding:16px;margin:24px 0;border:1px solid #dce4f0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;min-width:0}img{width:100%;height:auto;border:1px solid #dce4f0}figcaption{padding:8px;font-weight:600}button{background:white;color:#102d5c;border:1px solid #8192ac;padding:12px 16px;border-radius:6px;margin:4px}button:focus-visible{outline:3px solid #1769e8;outline-offset:2px}.note{padding:16px;background:#fff5e6;color:#855000}[hidden]{display:none!important}@media(max-width:768px){body{padding:12px}.pair{grid-template-columns:1fr}}</style><main><h1>Silex Business · SB-05.3B</h1><p>Capturas da aplicação em ambiente isolado, exclusivamente com dados fictícios. Antes: baseline aprovado. Depois: refinamento do Dashboard Financeiro. Clique para abrir cada imagem original.</p><p class="note">Dashboard: 21/21 cenários aprovados. Regressões: 208/210; duas falhas preexistentes de Lançamentos reproduzidas no baseline (V02). V01/R02 permanecem abertas.</p><p><a href="documents/RELATORIO.md">Relatório</a> · <a href="documents/AUDITORIA.md">Semântica</a> · <a href="documents/TESTES.md">Testes e limites</a> · <a href="tests-summary.json">Matriz</a> · <a href="file-inventory.json">Arquivos</a></p><nav aria-label="Larguras"><button onclick="choose(1440)">1440 px</button><button onclick="choose(768)">768 px</button><button onclick="choose(375)">375 px</button><button onclick="choose(0)">Todas</button></nav>']
screens=[]
for width in [1440,768,375]:
    for id,label in labels.items():
        if id in ['zoom200','reflow187'] and width!=375:continue
        images=[E/f'screenshots/{v}-{id}-{width}.png' for v in ['baseline','candidate']]
        if not all(p.is_file() for p in images):continue
        parts.append(f'<section data-width="{width}"><h2>{html.escape(label)} · {width} px</h2><div class="pair">')
        for title,p in zip(['Antes','Depois'],images):
            rel=p.relative_to(E).as_posix();screens.append(p);parts.append(f'<figure><figcaption>{title}</figcaption><a href="{rel}"><img loading="lazy" src="{rel}" alt="{title}: {html.escape(label)}, {width} px"></a></figure>')
        parts.append('</div></section>')
    for id,label in [('monthly-table','Nova alternativa textual: mesmos dados do gráfico'),('state-loading','Carregamento — simulação de apresentação'),('state-empty','Contas vazias — simulação de apresentação'),('state-error','Erro — simulação de apresentação')]:
        p=E/f'screenshots/candidate-{id}-{width}.png';assert p.is_file();screens.append(p);rel=p.relative_to(E).as_posix();parts.append(f'<section data-width="{width}"><h2>{html.escape(label)} · {width} px</h2><a href="{rel}"><img loading="lazy" src="{rel}" alt="{html.escape(label)} em {width} px"></a></section>')
parts.append('<script>function choose(w){document.querySelectorAll("[data-width]").forEach(s=>s.hidden=w>0&&Number(s.dataset.width)!==w)}choose(375)</script></main></html>')
(E/'index.html').write_text(''.join(parts))
documents=E/'documents';documents.mkdir(exist_ok=True)
for p in D.glob('*.md'):shutil.copy2(p,documents/p.name)
shutil.copy2(R/'docs/silex-business/PENDENCIAS.md',documents/'PENDENCIAS.md')
recovery=E/'recovery';recovery.mkdir(exist_ok=True);shutil.copytree(Path(env['backup'])/'original',recovery/'original',dirs_exist_ok=True);shutil.copy2(Path(env['backup'])/'manifest.json',recovery/'manifest.json')
if '--prepare' in sys.argv:
    print('Review gallery and metadata prepared; archive not generated.');raise SystemExit(0)
essentials=['index.html','tests-summary.json','commits.json','file-inventory.json','git-diff-stat.txt','review.diff','preservation-test.json','baseline-sha256.json','after-sha256.json','backup-initial.json','financial-comparison.json','fixture-dashboard.json','visual-baseline.json','visual-candidate.json','state-captures.json','accessibility.json','stable-style-comparison.json','legacy-ledger.json','historical-test-adapters.json','app.spec.ts.isolated.diff','home.spec.ts.isolated.diff','navigation.spec.ts.isolated.diff','public.spec.ts.isolated.diff','baseline-unit.log','baseline-build.log','candidate-unit-final.log','final-build.log','new-test-types.log','backend-tests.log','dashboard-e2e.log','chart-final-contrast.log','baseline-ledger.log','gallery-check.json','cleanup.json']
files=sorted(set(screens+list(documents.glob('*.md'))+list(recovery.rglob('*.md'))+list(recovery.rglob('*.tsx'))+[recovery/'manifest.json']+[E/name for name in essentials]));assert all(p.is_file() for p in files)
for p in files:
    assert p.suffix.lower() not in ['.sqlite3','.db','.env'] and '.git' not in p.parts
    if p.suffix!='.png':
        raw=p.read_text();assert 'DemoLocal#2026' not in raw and 'gestao_session=' not in raw and 'BEGIN PRIVATE KEY' not in raw,p
manifest=E/'manifest.sha256';manifest.write_text(''.join(f'{sha(p)}  {p.relative_to(E).as_posix()}\n' for p in files));files.append(manifest)
out=E/'SB-05.3B-review.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:z.write(p,p.relative_to(E).as_posix())
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    for line in manifest.read_text().splitlines():
        expected,rel=line.split('  ',1);assert hashlib.sha256(z.read(rel)).hexdigest()==expected
(E/'zip.sha256').write_text(sha(out)+'  '+out.name+'\n')
print(json.dumps({'zip':str(out),'bytes':out.stat().st_size,'files':len(files),'sha256':sha(out),'integrity_and_manifest_verified':True},indent=2))
