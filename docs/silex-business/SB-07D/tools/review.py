"""Build a compact review package, excluding runtime databases and credentials."""
from pathlib import Path
import hashlib,html,json,re,shutil,subprocess,tempfile,zipfile
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07d';BASE='43f9d95f461b31b92253eef026a6b9e84d923309'
def git(*args):return subprocess.check_output(['git',*args],cwd=R,text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
password=re.search(r'\| Administrador \| `demo.admin` \| `([^`]+)`',(R/'README.md').read_text()).group(1).encode()
assert git('branch','--show-current')=='fix/sb07d-content-reflow' and not git('status','--porcelain=v1')
commits=[{'hash':s.split('\t')[0],'subject':s.split('\t')[1]}for s in git('log','--reverse','--format=%H%x09%s',BASE+'..HEAD').splitlines()]
(E/'git-final.json').write_text(json.dumps({'baseline':BASE,'branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),'main':git('rev-parse','main'),'commits':commits,'status':git('status','--porcelain=v1'),'diffCheckPassed':subprocess.run(['git','diff','--check'],cwd=R).returncode==0,'noPushMergeDeploy':True},indent=2))
(E/'review.diff').write_text(git('diff','--binary',BASE,'HEAD')+'\n');(E/'production.diff').write_text(git('diff',BASE,'HEAD','--','frontend/src')+'\n');(E/'diff-stat.txt').write_text(git('diff','--stat',BASE,'HEAD')+'\n')
runs=[]
for p in sorted(E.glob('*results.json')):
 d=json.loads(p.read_text());runs.append({'file':p.name,'stats':d.get('stats')})
(E/'tests-summary.json').write_text(json.dumps({'executions':runs,'overlappingSelectionsNotSummed':True,'historicalAttemptsRetainedLocally':True,'realScreenReaderOrHumanValidation':False},indent=2))
images=[]
for p in (E/'screenshots').glob('*.png'):
 if re.fullmatch(r'(baseline|candidate)-(home|dashboard)-(1440|1024|768|375|320|256|187)\.png',p.name) or re.fullmatch(r'(baseline|candidate)-admin-(home|dashboard)-text200-(375|320)\.png',p.name) or re.fullmatch(r'(baseline|candidate)-operator-(home|dashboard)-normal-375\.png',p.name) or p.name.startswith(('native-','region-keyboard-','print-')):images.append(p)
images.sort();sections=[]
for candidate in images:
 if 'candidate' not in candidate.name:continue
 baseline=candidate.with_name(candidate.name.replace('candidate','baseline',1))
 if baseline not in images:continue
 title=html.escape(candidate.stem.replace('candidate-','').replace('-candidate',''))
 sections.append('<section><h2>'+title+'</h2><div class="pair">'+''.join('<figure><a href="screenshots/'+p.name+'"><img loading="lazy" src="screenshots/'+p.name+'" alt="'+label+' '+title+'"></a><figcaption>'+label+'</figcaption></figure>' for p,label in [(baseline,'Antes · SB-07C'),(candidate,'Depois · SB-07D')])+'</div></section>')
for p in images:
 if p.name.startswith('region-keyboard-'):sections.append('<details><summary>'+p.stem+'</summary><img src="screenshots/'+p.name+'" alt="'+p.stem+'"></details>')
(E/'galeria.html').write_text('''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex Business — SB-07D</title><style>body{font:16px system-ui;color:#172b45;background:#f4f6fa;max-width:1500px;margin:24px auto;padding:0 16px}h1,h2,a{color:#102d5c}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure,details{margin:12px 0;padding:12px;background:white;border:1px solid #8192ac;border-radius:8px;min-width:0}img{display:block;max-width:100%;height:auto}figcaption{padding-top:8px}summary{cursor:pointer;min-height:32px}a:focus-visible,summary:focus-visible{outline:2px solid #1769e8;outline-offset:3px}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><h1>SB-07D — C02</h1><p>Capturas reais de versões baseline/candidata com dados exclusivamente fictícios. Comparativos padrão nas sete larguras; texto 200%, valores altos/negativos, operador, região por teclado, zoom Firefox real 200/400 e recibo em mídia de impressão. Clique para a imagem integral.</p><p>Texto200 é duplicação computada, não zoom nativo. Em 256/187 ampliados, a região dos indicadores pode rolar internamente para manter o número íntegro. Não houve homologação humana, leitor real ou dispositivo físico. A matriz JSON cobre todos os cenários; capturas completas adicionais permanecem locais para evitar duplicação excessiva.</p><p><a href="../../silex-business/SB-07D/RELATORIO.md">Relatório</a> · <a href="reflow-matrix.json">Matriz pareada</a> · <a href="native-zoom.json">Zoom real</a> · <a href="preservation-test.json">Preservação</a></p>'''+''.join(sections)+'</html>')
output=R/'docs/review-packages/Silex_Business_SB-07D_Revisao.zip';output.parent.mkdir(exist_ok=True,parents=True)
with tempfile.TemporaryDirectory(prefix='silex-sb07d-review-')as directory:
 stage=Path(directory)
 def copy(p,relative):
  target=stage/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
 for p in (R/'docs/silex-business/SB-07D').rglob('*'):
  if p.is_file()and '__pycache__'not in p.parts:copy(p,p.relative_to(R))
 copy(R/'docs/silex-business/PENDENCIAS.md','docs/silex-business/PENDENCIAS.md')
 essential=['baseline.json','preservation-test.json','restoration-test.json','sha256-files.json','file-inventory.json','git-final.json','tests-summary.json','reflow-matrix.json','api-comparison.json','baseline-probe.json','candidate-standard-final-probe.json','native-zoom.json','keyboard.json','standard-visual-comparison-final.json','review.diff','production.diff','diff-stat.txt','galeria.html','baseline-build.log','candidate-build.log','baseline-unit.log','candidate-unit.log','backend.log','test-types-final.log','c02-final.log','regression.log','expired-session.log','date-regression.log','header-regression.log','finance-focus.log','native-zoom.log','cleanup.json']
 for name in essential:
  p=E/name
  if p.exists():copy(p,Path('docs/evidence/sb07d')/name)
 for p in images:copy(p,Path('docs/evidence/sb07d/screenshots')/p.name)
 for role in ['admin','operator']:copy(E/f'c02-{role}-firefox.json',Path('docs/evidence/sb07d')/f'c02-{role}-firefox.json')
 for file in git('diff','--name-only','--diff-filter=A',BASE,'HEAD').splitlines():
  if file.startswith('frontend/'):copy(R/file,Path('source')/file)
 (stage/'LEIA-ME.md').write_text('# SB-07D — revisão\n\nAbra docs/evidence/sb07d/galeria.html e docs/silex-business/SB-07D/RELATORIO.md. Conferir FILES.sha256 após extrair.\n\nPacote de revisão, não aplicação/instalador/deploy. Sem banco, credencial, .git, cache ou build. O backup integral fica local; recuperação exige checkout legítimo e commit aprovado ou backup. Mais capturas e logs de tentativas ficam locais, sem exclusão de evidência histórica.\n')
 manifest=[]
 for p in sorted(stage.rglob('*')):
  if p.is_file():
   rel=p.relative_to(stage);assert not any(v in rel.parts for v in ['.git','node_modules','__pycache__','dist','cache']);assert p.suffix not in ['.db','.sqlite','.sqlite3','.pyc','.zip','.tar'];assert password not in p.read_bytes(),'Credential in external package'
   manifest.append(sha(p)+'  '+str(rel))
 (stage/'FILES.sha256').write_text('\n'.join(manifest)+'\n')
 with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for p in sorted(stage.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(stage))
with zipfile.ZipFile(output)as z:
 assert z.testzip()is None
 for line in z.read('FILES.sha256').decode().splitlines():
  digest,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==digest
 members=len(z.namelist())
output.with_suffix('.zip.sha256').write_text(sha(output)+'  '+output.name+'\n')
(E/'package-verification.json').write_text(json.dumps({'zip':str(output),'bytes':output.stat().st_size,'members':members,'sha256':sha(output),'internalHashesVerified':True,'forbiddenFilesAndCredentialAbsent':True,'head':git('rev-parse','HEAD')},indent=2));print('Review ZIP verified:',output,output.stat().st_size,'bytes')
