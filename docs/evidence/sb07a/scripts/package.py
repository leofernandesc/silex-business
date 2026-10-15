"""Compact review: targeted results and representative images, no historical suite rerun."""
from pathlib import Path
import hashlib,json,os,subprocess,zipfile,html
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07a';D=R/'docs/silex-business/SB-07A';S=json.loads((E/'environment.json').read_text())
assert not subprocess.check_output(['git','status','--porcelain'],cwd=R),'Commit reviewed sources first'
allcases=[]
def visit(nodes,run):
 for n in nodes:
  for spec in n.get('specs',[]):
   for t in spec['tests']:
    assert t['status']=='expected' and len(t['results'])==1 and t['results'][0]['status']=='passed' and t['results'][0]['retry']==0
    allcases.append({'run':run,'file':spec['file'],'test':spec['title'],'project':t['projectName'],'status':'passed','durationMs':t['results'][0]['duration']})
  visit(n.get('suites',[]),run)
for run in ['targeted','regression']:
 j=json.loads((E/(run+'-results.json')).read_text());assert not j['errors'];visit(j['suites'],run)
assert len([c for c in allcases if c['run']=='targeted'])==6 and len(allcases)==21
pairs=[]
for p in E.glob('c01-*.json'):
 if p.name=='c01-summary.json':continue
 rows=json.loads(p.read_text());assert len(rows)==8
 for width in [1440,768,375,320]:
  a,b=[next(x for x in rows if x['width']==width and x['name']==v) for v in ['baseline','candidate']]
  for state in ['normal','enlarged']:
   assert [x['text'] for x in a[state]['values']]==[x['text'] for x in b[state]['values']]
   assert [x['font'] for x in a[state]['values']]==[x['font'] for x in b[state]['values']]
   assert b[state]['document']<=width+1
  pairs.append({'route':a['route'],'viewport':width,'baseline_document':a['enlarged']['document'],'candidate_document':b['enlarged']['document'],'values_and_font_sizes_identical':True})
(E/'c01-summary.json').write_text(json.dumps(pairs,indent=2))
normal=[]
for b in (E/'screenshots').glob('baseline-*-normal-*.png'):
 c=b.with_name(b.name.replace('baseline-','candidate-',1));equal=b.read_bytes()==c.read_bytes();assert equal;normal.append({'baseline':b.name,'candidate':c.name,'equal':equal})
assert len(normal)==8
(E/'normal-visual-comparison.json').write_text(json.dumps(normal,indent=2))
native=json.loads((E/'native-zoom-attempt.json').read_text());assert len(native['rows'])==12 and all(r['nativeZoomConfirmed'] and r['metrics']['innerWidth']==r['metrics']['document'] for r in native['rows'])
preservation=json.loads((E/'preservation-test.json').read_text());recovery=json.loads((E/'recovery-test.json').read_text());assert preservation['all_checks_passed'] and recovery['restore_rehearsal']=='passed'
assert '96 passed' in (E/'logs/frontend.log').read_text() and '1 passed' in (E/'logs/backend-service-orders.log').read_text() and '2 passed' in (E/'logs/backend-financial.log').read_text()
summary={'frontend':96,'backend_targeted':3,'new_e2e':6,'selected_e2e':15,'retries':0,'skips':0,'c01_pairs':16,'normal_png_pairs_identical':8,'native_zoom_states':12,'native_zoom_percent':[200,400],'baseline_main_commits':59,'screen_reader_not_homologated':True,'P05_scope':'three service fields corrected; global P05 partial','V01_T01':'monitoring, not closed','restored_files':recovery['original_files_restored']}
(E/'test-summary.json').write_text(json.dumps(summary,indent=2));(E/'test-matrix.json').write_text(json.dumps(allcases,ensure_ascii=False,indent=2))
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
(E/'git-summary.txt').write_text(subprocess.check_output(['git','log','--format=%H %s',S['head']+'..HEAD'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','status','--short','--branch'],cwd=R,text=True)+'\nMain divergence: '+subprocess.check_output(['git','rev-list','--count','main..HEAD'],cwd=R,text=True)+'\n'+subprocess.check_output(['git','diff','--stat',S['head'],'HEAD'],cwd=R,text=True))
(E/'review.diff').write_bytes(subprocess.check_output(['git','diff',S['head'],'HEAD'],cwd=R));(E/'production.diff').write_bytes(subprocess.check_output(['git','diff',S['head'],'HEAD','--','frontend/src'],cwd=R))
changed=[]
for line in subprocess.check_output(['git','diff','--name-status',S['head'],'HEAD'],cwd=R,text=True).splitlines():
 status,path=line.split('\t');changed.append({'status':status,'path':path,'sha256':hashlib.sha256((R/path).read_bytes()).hexdigest()})
(E/'file-inventory.json').write_text(json.dumps(changed,indent=2))
photos=[];figures=[]
for route,width in [('dashboard',375),('finance',768),('finance-payable',768),('finance-receivable',768)]:
 names=[f'{v}-{route}-text200-{width}.png' for v in ['baseline','candidate']];photos+=names;figures.append((f'{route} · texto200 · {width}px',names))
for locale in ['pt-BR','en-US']:
 names=[f'baseline-service-date-{locale}-375.png',f'candidate-service-date-{locale}-375.png'];photos+=names;figures.append((f'Data em Serviços · {locale}',names))
for name in ['native-200-finance.png','native-400-finance.png','native-400-service-date.png','candidate-dashboard-normal-1440.png']:
 photos.append(name);figures.append((name,[name]))
style='body{font:16px system-ui;color:#102d5c;background:#f3f6fa;max-width:1200px;margin:auto;padding:24px}a{color:#1769e8}h1{font-size:28px}.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}figure{margin:0;background:white;padding:12px;border-radius:10px}img{width:100%;height:430px;object-fit:contain;object-position:top}h2{margin-top:32px;font-size:20px}figcaption{overflow-wrap:anywhere}'
body=''.join('<section><h2>'+html.escape(title)+'</h2><div class="pair">'+''.join('<figure><a href="screenshots/'+name+'"><img src="screenshots/'+name+'" alt="'+html.escape(name)+' — dados fictícios"></a><figcaption>'+html.escape(name)+'</figcaption></figure>' for name in names)+'</div></section>' for title,names in figures)
(E/'index.html').write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SB-07A — revisão</title><style>'+style+'</style><h1>Silex Business — SB-07A</h1><p>Correções pontuais C01 e datas de Serviços. Dados fictícios. Sem novo rebranding.</p><p><a href="../../silex-business/SB-07A/RELATORIO.md">Relatório</a> · <a href="git-summary.txt">Commits/diff</a></p><p>6 testes novos + 15 regressões, 96 frontend e 3 backend direcionados. Texto200 é simulação de fontes; capturas native são zoom real Firefox. P05 global parcial, leitor real pendente, V01/T01 em acompanhamento. Sem autorização comercial.</p>'+body+'</html>')
jsons=['test-summary.json','test-matrix.json','targeted-results.json','regression-results.json','c01-summary.json','c01-dashboard.json','c01-finance.json','c01-finance-payable.json','c01-finance-receivable.json','normal-visual-comparison.json','p05-pt-BR.json','p05-en-US.json','date-baseline.json','native-zoom-attempt.json','financial-equivalence.json','export-equivalence.json','preservation-test.json','recovery-test.json','candidate-sha256.json','file-inventory.json','environment.json']
paths=[D/'RELATORIO.md',R/'docs/silex-business/PENDENCIAS.md',R/'frontend/tests/content-dates.spec.ts']+list((E/'scripts').glob('*.py'))+list((E/'scripts').glob('*.ts'))+list((E/'scripts').glob('*.cjs'))+[E/n for n in jsons]+[E/'screenshots'/n for n in photos]+[E/'index.html',E/'git-summary.txt',E/'review.diff',E/'production.diff']
paths += [E/'logs'/n for n in ['frontend.log','candidate-build.log','test-types-final.log','backend-service-orders.log','backend-financial.log','targeted.log','regression.log','native-zoom.log']]
contents={str(p.relative_to(R)):p.read_bytes() for p in paths};contents['index.html']=b'<!doctype html><meta charset="utf-8"><a href="docs/evidence/sb07a/index.html">Abrir galeria SB-07A</a>'
for name,raw in contents.items():
 assert not any(p in ['.git','dist','node_modules','data','__pycache__'] for p in Path(name).parts)
 assert Path(name).suffix not in ['.db','.sqlite3','.zip','.pyc','.env']
 if Path(name).suffix!='.png':assert os.environ['SILEX_TEST_PASSWORD'] not in raw.decode(),name
manifest=''.join(hashlib.sha256(v).hexdigest()+'  '+k+'\n' for k,v in sorted(contents.items()));contents['MANIFEST.sha256']=manifest.encode();(E/'MANIFEST.sha256').write_text(manifest)
archive=E/'SB-07A-review.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
 for name,raw in contents.items():z.writestr(name,raw)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for line in manifest.splitlines():h,p=line.split('  ',1);assert hashlib.sha256(z.read(p)).hexdigest()==h
checksum=hashlib.sha256(archive.read_bytes()).hexdigest();Path(str(archive)+'.sha256').write_text(checksum+'  '+archive.name+'\n');(E/'package-verification.json').write_text(json.dumps({'head':head,'zip_bytes':archive.stat().st_size,'entries':len(contents),'images':len(photos),'sha256':checksum,'crc_manifest_verified':True},indent=2));print('ZIP',archive.stat().st_size,'bytes; entries',len(contents),'SHA',checksum)
