"""Minimal external audit package; full historic logs/traces remain local unchanged."""
from pathlib import Path
import json,hashlib,tempfile,zipfile,shutil
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1]
for rel in ['tests-summary.json','preservation-test.json','backup-integrity-final.json','cleanup.json']:assert json.loads((E/rel).read_text())['passed']
stage=Path(tempfile.mkdtemp(prefix='silex-sb052-review-'));included=[]
def copy(p,rel):
 target=stage/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target);included.append(str(rel))
selected=['galeria.html','baseline.json','environment.json','backup-manifest.json','backup-integrity-initial.json','backup-integrity-final.json','preservation-test.json','financial-preservation.json','query-comparison.json','tested-source-integrity.json','contrast-regression.json','tests-summary.json','test-matrix.json','test-matrix.csv','screenshots-manifest.json','git-state.json','COMMITS.md','git-diff-stat.txt','changes.diff','files-changed.json','cleanup.json','preview.json','historical-test-adapters.json','home.spec.ts.isolated.diff','navigation.spec.ts.isolated.diff','visual-baseline.json','visual-candidate.json','extra-visual-checks.json','preview-check.json','navigation-baseline-repeat.json','navigation-candidate-repeat.json','navigation-baseline-equivalent-repeat.json']
for name in selected:copy(E/name,Path('docs/evidence/sb05-2')/name)
for folder in ['scripts','screenshots','recovery-checkpoint']:
 for p in (E/folder).rglob('*'):
  if p.is_file():copy(p,Path('docs/evidence/sb05-2')/p.relative_to(E))
for name in ['frontend-final.log','backend.log','build-final.log','typescript-final.log','e2e-types.log','format.log','accounts-e2e-final.log','regression-e2e.log','regression-attempt1.log','navigation-baseline-repeat.log','navigation-candidate-repeat.log','navigation-baseline-equivalent-repeat.log','extra-visual-checks-final.log']:
 copy(E/'logs'/name,Path('docs/evidence/sb05-2/logs')/name)
for p in (R/'docs/silex-business/SB-05.2').glob('*.md'):copy(p,p.relative_to(R))
for rel in ['docs/silex-business/PENDENCIAS.md','frontend/src/finance.tsx','frontend/src/accounts.css','frontend/src/financePresentation.test.ts','frontend/tests/accounts-interface.spec.ts']:copy(R/rel,Path(rel))
(stage/'LEIA-ME.md').write_text('# Silex Business — revisão SB-05.2\n\nAbra docs/evidence/sb05-2/galeria.html e docs/silex-business/SB-05.2/RELATORIO.md. Dados exclusivamente fictícios. P02 comprovada em Pagar e Receber; P05 parcial (editor nativo/print preservados); P06 neutra em Pagar. Não existe edição direta de títulos.\n\nPacote de auditoria, não aplicação completa/deploy. Inclui evidências finais, fontes/diff, commits, backup de dois arquivos alterados, hashes e restauração de 66 originais. Traces, tentativas completas e logs de servidores permanecem localmente; não foram apagados. Sem .git, bancos, builds, dados reais ou credenciais de produção.\n\nDepois de extrair, conferir sha256sum -c FILES.sha256. Reversão deve conferir final_hashes e alterações posteriores; restaurar dois originais, remover três novos frontend e criar commit controlado. Não executar reset/clean/force push.\n')
files=sorted(p for p in stage.rglob('*') if p.is_file());assert not any('.git' in p.relative_to(stage).parts or p.suffix in ['.sqlite3','.db','.zip'] for p in files)
lines=[hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(stage)) for p in files];(stage/'FILES.sha256').write_text('\n'.join(lines)+'\n');shutil.copy2(stage/'FILES.sha256',E/'FILES.sha256');a=E/'SB-05.2-review.zip'
with zipfile.ZipFile(a,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(stage.rglob('*')):
  if p.is_file():z.write(p,str(p.relative_to(stage)))
with zipfile.ZipFile(a) as z:
 assert z.testzip() is None
 for line in lines:
  sha,rel=line.split('  ',1);assert hashlib.sha256(z.read(rel)).hexdigest()==sha
sha=hashlib.sha256(a.read_bytes()).hexdigest();(E/'SB-05.2-review.zip.sha256').write_text(sha+'  SB-05.2-review.zip\n');out={'passed':True,'sha256':sha,'size_bytes':a.stat().st_size,'payload_files':len(files),'crc_and_all_hashes_verified':True,'full_traces_and_attempt_logs_retained_local':True,'git_database_build_private_data_included':False};(E/'package-integrity.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
