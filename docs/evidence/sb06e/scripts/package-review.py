"""Build a compact external audit archive after a clean, reviewed Git commit."""
from pathlib import Path
import hashlib,html,json,os,re,shutil,subprocess,zipfile
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb06e';D=R/'docs/silex-business/SB-06E'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=R),'Commit the reviewed docs/instruments first'
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='dfa489a49fd7c59e6ca89a1ce6824f2f0a42ee35'
assert subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip()=='feat/sb06e-final-validation'
summary=json.loads((E/'test-results-summary.json').read_text());pres=json.loads((E/'preservation-test.json').read_text());assert pres['all_checks_passed'] and pres['candidate_head']==head
(E/'git-summary.txt').write_text(subprocess.check_output(['git','log','--format=%H %s',base+'..HEAD'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','status','--short','--branch'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','diff','--stat',base,'HEAD'],cwd=R,text=True))
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
files=[]
for line in subprocess.check_output(['git','diff','--name-status',base,'HEAD'],cwd=R,text=True).splitlines():
 status,path=line.split('\t');files.append({'status':status,'path':path,'sha256':hashlib.sha256((R/path).read_bytes()).hexdigest()})
(E/'file-inventory.json').write_text(json.dumps(files,indent=2))
photos=[]
for name in ['public','login','home','dashboard','customers','finance','finance-payable','finance-dashboard']:
 for w in [1440,768,375]:photos.append(f'{name}-{w}.png')
photos+=['baseline-home-375.png','products-375.png','sales-1440.png','pos-375.png','stock-375.png','finance-receivable-375.png','finance-reconcile-1440.png','finance-reconcile-375.png','company-settings-375.png','keyboard-modal-1440.png','keyboard-modal-768.png','keyboard-modal-375.png','keyboard-menu-375.png','date-native-finance-payable-375.png','date-native-service-orders-375.png','native-200-finance.png','native-400-finance.png','native-400-home.png','native-400-dashboard.png','reflow-dashboard-text200-detail-375.png','reflow-finance-text200-detail-768.png','reflow-home-long-name-187.png']
assert all((E/'screenshots'/p).is_file() for p in photos)
css='body{margin:0;background:#f3f6fa;color:#102d5c;font:16px system-ui,sans-serif}header,main{max-width:1200px;margin:auto;padding:24px}header{background:#102d5c;color:white;max-width:none}h1{font-size:26px}a{color:#1769e8}header a{color:#b9d2ff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px}figure{margin:0;background:white;border:1px solid #b9c9dc;border-radius:10px;overflow:auto}img{display:block;width:100%;height:300px;object-fit:contain;object-position:top}figcaption{padding:12px;overflow-wrap:anywhere}.note{padding:16px;background:#fff;border-left:4px solid #1769e8;margin-bottom:16px}table{border-collapse:collapse;width:100%;background:white}td,th{padding:10px;border:1px solid #b9c9dc;text-align:left}a:focus-visible{outline:3px solid #1769e8;outline-offset:3px}'
cards=''.join('<figure><a href="screenshots/'+p+'"><img loading="lazy" src="screenshots/'+p+'" alt="Captura '+html.escape(p)+' — dados fictícios"></a><figcaption>'+html.escape(p)+'</figcaption></figure>' for p in photos)
page='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Silex Business — revisão SB-06E</title><style>'+css+'</style><header><h1>Silex Business — SB-06E</h1><p>Consolidação e preparação para homologação. Dados fictícios. Produção preservada.</p><a href="../../silex-business/SB-06E/RELATORIO.md">Relatório técnico</a> · <a href="../../silex-business/SB-06E/RISCOS.md">Riscos</a> · <a href="../../silex-business/SB-06E/HOMOLOGACAO-MANUAL.md">Homologação manual</a></header><main><div class="note"><strong>Rebranding: apto para revisão final, com ressalvas. Homologação: controlada, com dados fictícios. Lançamento comercial: não comprovadamente apto.</strong></div><p>96 testes frontend, 69 backend, 357 E2E; sem retries/skips. 26 superfícies × cinco larguras normais. Zoom nativo Firefox 200/400 confirmado em 16 estados; leitor real não executado. P05/P07 parciais; V01/T01 em acompanhamento.</p><p>Nome baseline indica comparação com o mesmo código aprovado. Não houve redesign neste incremento. Capturas text200 são simulação de fontes; capturas native usam zoom real X11, com medidas em JSON. Clique para abrir a imagem integral.</p><div class="grid">'+cards+'</div></main></html>'
(E/'index.html').write_text(page)
# Current source excerpts as evidence, without secrets or full application payloads.
excerpts={}
for file,start,end in [('backend/app/api.py',114,132),('backend/app/api.py',160,170),('backend/app/api.py',489,498),('backend/app/models.py',39,48)]:
 source=(R/file).read_text().splitlines();excerpts[file+':'+str(start)]={'start_line':start,'end_line':end,'source':'\n'.join(source[start-1:end]),'file_sha256':hashlib.sha256((R/file).read_bytes()).hexdigest()}
(E/'architecture-evidence.json').write_text(json.dumps(excerpts,ensure_ascii=False,indent=2))
B=Path(pres['backup_path']);recovery=E/'recovery';(recovery/'original').mkdir(parents=True,exist_ok=True);shutil.copy2(B/'original/docs/silex-business/PENDENCIAS.md',recovery/'original/PENDENCIAS.md');shutil.copy2(B/'manifest.json',recovery/'manifest.json')
jsons=['test-results-summary.json','test-matrix.json','integrated-results.json','modal-results.json','surfaces.json','baseline-reflow-comparison.json','reflow-findings.json','reflow-detail.json','overflow-sources.json','native-zoom-attempt.json','interaction-evidence.json','v01-navigation.json','t01-public.json','financial-equivalence.json','export-equivalence.json','financial-flows.json','auth-safety.json','risk-matrix.json','runtime-environment.json','runtime-recovery.json','fixture-provenance.json','recovered-fixture-provenance.json','preservation-test.json','baseline-sha256.json','candidate-sha256.json','build-equivalence.json','file-inventory.json','architecture-evidence.json','environment.json']
logs=['frontend.log','backend.log','build.log','baseline-build.log','instrument-types-final.log','integrated.log','modal.log','native-zoom.log','stability.log','reflow-detail.log','overflow-sources.log','interaction.log','preservation.log','financial-flows-recovered.log']
paths=list(D.glob('*.md'))+[R/'docs/silex-business/PENDENCIAS.md']+list((E/'scripts').glob('*.py'))+list((E/'scripts').glob('*.cjs'))+list((E/'scripts').glob('*.ts'))+[E/n for n in jsons]+[E/'logs'/n for n in logs]+[E/'screenshots'/p for p in photos]+[E/'index.html',E/'git-summary.txt',E/'review.diff',recovery/'original/PENDENCIAS.md',recovery/'manifest.json']
# Referenced approved collectors are copied without modifying historical files.
paths += [R/'docs/evidence/sb06d1/scripts/financial_compare.py',R/'docs/evidence/sb06d1/scripts/export_compare.py',R/'docs/evidence/sb06d2/scripts/matrix.cjs']
contents={str(p.relative_to(R)):p.read_bytes() for p in paths}
contents['index.html']=b'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>SB-06E</title><h1>SB-06E</h1><p><a href="docs/evidence/sb06e/index.html">Abrir galeria e documentos de revisao</a></p></html>'
contents['README.md']='# Revisão SB-06E\n\nAbra index.html ou docs/evidence/sb06e/index.html. Relatório em docs/silex-business/SB-06E/RELATORIO.md. Dados fictícios; nenhum banco/credencial acompanha o pacote. Sem deploy/push/merge.\n\nMANIFEST.sha256 cobre todos os itens, exceto o próprio manifesto. Para verificar: sha256sum -c MANIFEST.sha256. O ZIP também possui SHA externo. Scripts requerem checkout/dependências já disponíveis; consulte REPRODUCAO.md.\n'.encode()
for name,raw in contents.items():
 assert not any(p in {'.git','node_modules','dist','__pycache__','data','uploads'} for p in Path(name).parts),name
 assert Path(name).suffix not in {'.sqlite','.sqlite3','.db','.env','.pyc','.zip','.tar'},name
 assert len(raw)<8_000_000,(name,len(raw))
 if Path(name).suffix in {'.json','.txt','.log','.md','.diff','.py','.cjs','.ts','.html'}:
  text=raw.decode();assert os.environ['SILEX_TEST_PASSWORD'] not in text,name
  assert not re.search(r'(?m)^-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/]{32}',text),name
manifest=''.join(hashlib.sha256(raw).hexdigest()+'  '+name+'\n' for name,raw in sorted(contents.items()));contents['MANIFEST.sha256']=manifest.encode();(E/'MANIFEST.sha256').write_text(manifest)
archive=E/'SB-06E-review.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
 for name,raw in sorted(contents.items()):z.writestr(name,raw)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name,raw in contents.items():assert z.read(name)==raw
checksum=hashlib.sha256(archive.read_bytes()).hexdigest();Path(str(archive)+'.sha256').write_text(checksum+'  '+archive.name+'\n')
result={'archive':str(archive),'bytes':archive.stat().st_size,'entries':len(contents),'screenshots':len(photos),'sha256':checksum,'crc_passed':True,'manifest_passed':True,'forbidden_files_or_known_demo_secret':False,'candidate_head':head};(E/'package-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
