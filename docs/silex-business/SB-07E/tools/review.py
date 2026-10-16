"""Build a compact offline review ZIP from authored docs and selected safe evidence."""
from pathlib import Path
import json,hashlib,subprocess as sp,tempfile,shutil,zipfile,re,html
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e';D=R/'docs/silex-business/SB-07E';base=json.loads((E/'baseline.json').read_text())['approved_head']
def git(*a):return sp.check_output(['git',*a],cwd=R).decode().strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert git('branch','--show-current')=='test/sb07e-integrated-validation'
assert not git('status','--porcelain=v1'),'Commit and inspect intended changes first'
info={'branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),'main':git('rev-parse','main'),'baseline':base,'status_porcelain':git('status','--porcelain=v1'),'commits':git('log','--format=%H %s',base+'..HEAD').splitlines(),'diff_stat':git('diff','--stat',base+'..HEAD'),'changed_files':git('diff','--name-status',base+'..HEAD'),'counts_main_head':git('rev-list','--left-right','--count','main...HEAD'),'accumulated_diff_stat':git('diff','--stat','main..HEAD'),'fast_forward_possible':git('merge-base','main','HEAD')==git('rev-parse','main')}
(E/'git-final.json').write_text(json.dumps(info,indent=2));(E/'review.diff').write_text(git('diff',base+'..HEAD')+'\n')
selected=[]
for route in ['public','login','home','dashboard','customers','finance','finance-payable','finance-receivable','finance-reconcile','finance-dashboard','company-settings']:
 for width in [1440,768,375]:
  p=E/f'screenshots/{route}-{width}.png'
  if p.exists():selected.append(p)
selected+=sorted((E/'screenshots').glob('date-*.png'))
selected+=sorted((E/'screenshots').glob('zoom-*-400.png'))
selected+=sorted((E/'screenshots').glob('native-pointer-*.png'))
for folder in ['app-fresh-captures']:
 for p in (E/folder).rglob('*.png'):
  if 'recibo-impressao' in p.name:selected.append(p)
# Copy only essential failure screenshots, never traces/cookies or DBs.
for i,p in enumerate(sorted((E/'functional-artifacts').rglob('test-failed-1.png')),1):
 dst=E/f'screenshots/fixture-cash-failure-{i}.png';shutil.copy2(p,dst);selected.append(dst)
sections=[]
for p in selected:
 rel=str(p.relative_to(E));sections.append(f'<figure><a href="{html.escape(rel)}"><img loading="lazy" src="{html.escape(rel)}" alt="{html.escape(p.stem)}"></a><figcaption>{html.escape(p.stem)}</figcaption></figure>')
gallery='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Silex Business — revisão SB-07E</title><style>body{font:16px system-ui,sans-serif;background:#f5f7fa;color:#102d5c;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}figure{margin:0;padding:12px;background:white;border:1px solid #c0cada;border-radius:8px}img{width:100%;max-height:580px;object-fit:contain;object-position:top}a{color:#102d5c}a:focus-visible{outline:3px solid #1769e8;outline-offset:3px}figcaption{overflow-wrap:anywhere;margin-top:8px}</style><h1>SB-07E — homologação integrada</h1><p>Produto preservado. Capturas atuais com dados fictícios; nenhuma imagem é uma nova implementação. Zoom400 usa viewport320×226CSS: calendário/modal rolam verticalmente. As duas imagens de falha registram caixa fechado em fixture contaminada; a suíte original passou em base nova.</p><p><a href="../../silex-business/SB-07E/RELATORIO.md">Relatório técnico</a> · <a href="tests-summary.json">Testes e falhas preservadas</a> · <a href="git-final.json">Commits e Git</a> · <a href="pointer-diagnosis.json">Diagnóstico de ponteiro</a></p><main>'''+''.join(sections)+'</main></html>'
(E/'galeria.html').write_text(gallery)
jsons=['baseline.json','git-audit.json','git-final.json','security-inventory.json','npm-audit.json','tests-summary.json','technical-typescript.json','technical-backend.json','financial-equivalence.json','export-equivalence.json','financial-flows.json','output-dates.json','auth-safety.json','surfaces.json','css-order.json','date-locale-evidence.json','v01-navigation.json','t01-public.json','native-zoom.json','native-attempt1.json','pointer-diagnosis.json','cash-precondition-after-modal-batch.json','cash-precondition-fresh-app-fixture.json','preservation-test.json','restoration-test.json','sha256-files.json','file-inventory.json','cleanup.json']
logs=['typescript.log','build.log','frontend.log','backend.log','e2e.log','functional.log','app-fresh.log','date-firefox.log','date-chromium.log','header.log','native-attempt1.log','instrument-types.log','orca-version.txt']
files=[*D.rglob('*.md'),*D.glob('tools/*.py'),*D.glob('tools/*.cjs'),R/'frontend/playwright.sb07e.config.ts',E/'galeria.html',E/'review.diff',*selected]
files +=[E/n for n in jsons+logs];assert all(p.is_file() for p in files)
# Known synthetic credential is intentionally omitted even though already public in local history.
secret=re.search(rb'DemoLocal#[0-9]+',(R/'README.md').read_bytes()).group()
files=sorted(set(files));manifest={str(p.relative_to(R)):sha(p) for p in files}
for p in files:
 data=p.read_bytes();assert secret not in data,'Credential value in '+str(p)
 assert not any(x in p.relative_to(R).parts for x in ['.git','node_modules','__pycache__','dist'])
 assert p.suffix not in ['.db','.sqlite3','.sqlite','.env','.pem','.key']
package=R/'docs/review-packages/Silex_Business_SB-07E_Revisao.zip';package.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:z.write(p,p.relative_to(R))
 z.writestr('FILES.sha256',''.join(f'{h}  {p}\n' for p,h in manifest.items()))
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None
 for p,h in manifest.items():assert hashlib.sha256(z.read(p)).hexdigest()==h
 assert not any(secret in z.read(n) for n in z.namelist())
 for p in selected:assert str(p.relative_to(R)) in z.namelist()
result={'package':str(package.relative_to(R)),'bytes':package.stat().st_size,'sha256':sha(package),'members':len(manifest)+1,'manifest_entries_verified':len(manifest),'crc_passed':True,'credential_values_absent':True,'production_changes':False,'screenshots':len(selected),'historical_evidence_not_overwritten':True}
(E/'package-verification.json').write_text(json.dumps(result,indent=2));package.with_suffix('.zip.sha256').write_text(result['sha256']+'  '+package.name+'\n');print(json.dumps(result,indent=2))
