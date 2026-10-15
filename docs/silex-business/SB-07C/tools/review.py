"""Prepare a credential-free review ZIP; never a deploy/build/database package."""
from pathlib import Path
import hashlib,html,json,re,shutil,subprocess,tempfile,zipfile
ROOT=Path(__file__).resolve().parents[4];E=ROOT/'docs/evidence/sb07c';BASE='fddcb66d18ba22fc1c07700852cd2f5a5c6b6ed8'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# Password is read only to assert its ABSENCE from every external artifact.
password=re.search(r'\| Administrador \| `demo.admin` \| `([^`]+)`',(ROOT/'README.md').read_text()).group(1).encode()
runs=[]
for path in sorted(E.glob('*results.json')):
    data=json.loads(path.read_text());tests=[]
    def walk(suites):
        for suite in suites:
            for spec in suite.get('specs',[]):
                for test in spec.get('tests',[]):
                    tests.append({'file':spec.get('file'),'title':spec['title'],'project':test.get('projectName'),'status':test.get('status'),'attempts':[{'status':r.get('status'),'retry':r.get('retry'),'duration':r.get('duration'),'error':re.sub(r'\x1b\[[0-9;]*m','',r.get('error',{}).get('message',''))[:700]} for r in test.get('results',[])]})
            walk(suite.get('suites',[]))
    walk(data.get('suites',[]));runs.append({'evidence':path.name,'stats':data.get('stats'),'tests':tests})
(E/'tests-summary.json').write_text(json.dumps({'executions':runs,'no_automatic_retries_added':True,'not_human_validation':True},indent=2,ensure_ascii=False))
commits=[{'hash':line.split('\t')[0],'subject':line.split('\t')[1]} for line in git('log','--reverse','--format=%H%x09%s',BASE+'..HEAD').splitlines()]
state={'branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),'approved_baseline':BASE,'commits':commits,'status':git('status','--porcelain=v1'),'main':git('rev-parse','main'),'approved_prior_commits_not_in_main':int(git('rev-list','--count','main..'+BASE)),'diff_check_passed':subprocess.run(['git','diff','--check'],cwd=ROOT).returncode==0,'no_push_merge_deploy':True}
assert state['branch']=='feat/sb07c-ptbr-dates' and not state['status'],'Commit review documents before packaging'
(E/'git-final.json').write_text(json.dumps(state,indent=2));(E/'review.diff').write_text(git('diff','--binary',BASE,'HEAD')+'\n');(E/'diff-stat.txt').write_text(git('diff','--stat',BASE,'HEAD')+'\n')
figures=[]
for candidate in sorted((E/'screenshots').glob('candidate-*.png')):
    baseline=candidate.with_name(candidate.name.replace('candidate-','baseline-',1))
    if baseline.exists():
        label=candidate.stem.replace('candidate-','').replace('desktop','Firefox').replace('chromium','Chromium')
        figures.append('<section><h2>'+html.escape(label)+'</h2><div class="pair">'+''.join('<figure><a href="screenshots/'+p.name+'"><img loading="lazy" src="screenshots/'+p.name+'" alt="'+tag+' '+html.escape(label)+'"></a><figcaption>'+tag+'</figcaption></figure>' for p,tag in [(baseline,'Antes · SB-07B'),(candidate,'Depois · SB-07C')])+'</div></section>')
for image in sorted((E/'screenshots').glob('*.png')):
    if image.name.startswith(('calendar-','invalid-','native-')):
        figures.append('<details><summary>'+html.escape(image.stem)+'</summary><a href="screenshots/'+image.name+'"><img loading="lazy" src="screenshots/'+image.name+'" alt="'+html.escape(image.stem)+'"></a></details>')
(E/'galeria.html').write_text('''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex Business — SB-07C</title><style>body{font:16px system-ui;background:#f4f6fa;color:#172b45;max-width:1500px;margin:24px auto;padding:0 16px}h1,h2,a{color:#102d5c}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure,details{background:white;border:1px solid #8192ac;padding:12px;border-radius:8px;margin:12px 0}figure{min-width:0}img{display:block;max-width:100%;height:auto}figcaption{padding-top:8px}summary{cursor:pointer;min-height:32px}a:focus-visible,summary:focus-visible{outline:2px solid #1769e8;outline-offset:3px}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><h1>Silex Business — SB-07C</h1><p>Capturas reais de versões baseline/candidata, exclusivamente com dados fictícios em SQLite descartável. Datas brasileiras nos editores; contratos ISO preservados. Clique para abrir a imagem integral.</p><p>Firefox e Chromium via Brave existente; pt-BR/en-US. Texto 200% é ampliação computada, enquanto native-200/native-400 são zoom real do Firefox em X11 privado, medido por DPR. Leitor de tela real, participantes e dispositivo físico não homologados.</p><p><a href="../../silex-business/SB-07C/RELATORIO.md">Relatório</a> · <a href="tests-summary.json">Execuções e ocorrências</a> · <a href="preservation-test.json">Preservação</a></p>'''+''.join(figures)+'</html>')
output=ROOT/'docs/review-packages/Silex_Business_SB-07C_Revisao.zip';output.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='silex-sb07c-review-') as directory:
    stage=Path(directory)
    def copy(source,relative):
        target=stage/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
    for p in (ROOT/'docs/silex-business/SB-07C').rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts:copy(p,p.relative_to(ROOT))
    copy(ROOT/'docs/silex-business/PENDENCIAS.md','docs/silex-business/PENDENCIAS.md')
    evidence=['galeria.html','tests-summary.json','baseline.json','input-inventory-baseline.json','input-inventory-candidate.json','migration-inventory.json','preservation-test.json','restoration-test.json','sha256-files.json','file-inventory.json','git-final.json','review.diff','diff-stat.txt','dependency-metadata.json','date-metadata.json','transitive-dependencies.json','second-browser.json','native-zoom.json','accessibility.json','final-build.log','final-unit.log','candidate-backend.log','final-test-types.log','restoration-build.log','accessibility.log','cleanup.json']
    for name in evidence:
        p=E/name
        if p.exists():copy(p,Path('docs/evidence/sb07c')/name)
    for pattern in ['pilot-desktop-*.json','pilot-chromium-*.json','migration-desktop-*.json','migration-chromium-*.json','visual-*.json','screenshots/*.png']:
        for p in E.glob(pattern):copy(p,Path('docs/evidence/sb07c')/p.relative_to(E))
    # Full copies only of NEW sources/tests; existing modified tests may contain
    # historical demo credentials. The checked diff retains their exact edits.
    for file in git('diff','--name-only','--diff-filter=A',BASE,'HEAD').splitlines():
        if file.startswith('frontend/'):copy(ROOT/file,Path('source')/file)
    for package in ['react-aria-components','@internationalized/date']:
        for p in (ROOT/'frontend/node_modules'/package).glob('LICENSE*'):copy(p,Path('licenses')/package/p.name)
    (stage/'LEIA-ME.md').write_text('# SB-07C — revisão externa\n\nAbra docs/evidence/sb07c/galeria.html e docs/silex-business/SB-07C/RELATORIO.md. Conferir FILES.sha256 após extrair. Material de revisão, sem banco, build ou instalador.\n\nO Git final/commits/diff e os manifestos permitem auditoria. Backup completo e tentativas/logs antigos ficam locais, sem serem apagados. A restauração de 446 arquivos foi ensaiada. Para executar ou restaurar, é necessário checkout legítimo e a base aprovada; ver REPRODUCAO.md e RECUPERACAO.md. Nenhuma credencial acompanha o ZIP.\n')
    manifest=[]
    for p in sorted(stage.rglob('*')):
        if p.is_file():
            relative=p.relative_to(stage)
            assert not any(v in relative.parts for v in ['.git','node_modules','__pycache__','dist','cache'])
            assert p.suffix not in ['.db','.sqlite','.sqlite3','.pyc','.zip','.tar']
            assert password not in p.read_bytes(), 'Credential value found in external artifact'
            manifest.append(sha(p)+'  '+str(relative))
    (stage/'FILES.sha256').write_text('\n'.join(manifest)+'\n')
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for p in sorted(stage.rglob('*')):
            if p.is_file():z.write(p,p.relative_to(stage))
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    for line in z.read('FILES.sha256').decode().splitlines():
        digest,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==digest
output.with_suffix('.zip.sha256').write_text(sha(output)+'  '+output.name+'\n')
(E/'package-verification.json').write_text(json.dumps({'zip':str(output),'sha256':sha(output),'bytes':output.stat().st_size,'members':len(zipfile.ZipFile(output).namelist()),'internal_hashes_verified':True,'forbidden_files_and_demo_credential_absent':True,'git_head':state['head']},indent=2))
print('Review ZIP verified:',output,'bytes',output.stat().st_size)
