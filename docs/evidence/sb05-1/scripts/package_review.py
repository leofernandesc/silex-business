"""Create a review package without .git, databases, real customer data or builds."""
from pathlib import Path
import hashlib,json,shutil,tempfile,zipfile,subprocess
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1]
for p in ['preservation-test.json','backup-integrity-final.json','tests-summary.json','cleanup.json']:assert json.loads((E/p).read_text())['passed']
stage=Path(tempfile.mkdtemp(prefix='silex-sb05-review-'));exclude={'SB-05-stage1-review.zip','SB-05-stage1-review.zip.sha256','FILES.sha256','package-integrity.json'}
shutil.copytree(E,stage/'docs/evidence/sb05-1',ignore=lambda d,n:[x for x in n if Path(d)==E and x in exclude])
for p in (R/'docs/silex-business/SB-05').glob('*.md'):
 t=stage/p.relative_to(R);t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,t)
for rel in ['docs/silex-business/PENDENCIAS.md','docs/VERSIONAMENTO.md','frontend/src/ledger.tsx','frontend/src/ledger.css','frontend/src/ledgerPresentation.tsx','frontend/src/ledgerPresentation.test.ts','frontend/tests/ledger-interface.spec.ts']:
 t=stage/rel;t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/rel,t)
(stage/'LEIA-ME.md').write_text('# Silex Business — SB-05 etapa 1\n\nAbra docs/evidence/sb05-1/galeria.html e docs/silex-business/SB-05/RELATORIO-ETAPA1.md. Capturas de fixtures fictícias em bases temporárias; comparação D não representa os mesmos cinco registros do estudo. P02 de Pagar/Receber pendente, P05 parcial, P06 neutra somente em Ledger.\n\nInclui fontes/diff, commits, testes/tentativas, capturas, backup/manifestos e recuperação. Nenhuma pasta .git, base real/descartável ou build é incluído. Não é pacote de deploy nem aplicação completa.\n\nConferir sha256sum -c FILES.sha256 após extrair. Reversão somente após revisar final_hashes e alterações posteriores, restaurar dois originais e remover quatro novos frontend, com novo commit controlado; nada de reset/clean/force push.\n')
files=sorted(p for p in stage.rglob('*') if p.is_file());assert not any('.git' in p.relative_to(stage).parts or p.suffix in ['.sqlite3','.db'] for p in files)
rows=[hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(stage)) for p in files];(stage/'FILES.sha256').write_text('\n'.join(rows)+'\n');shutil.copy2(stage/'FILES.sha256',E/'FILES.sha256')
a=E/'SB-05-stage1-review.zip'
with zipfile.ZipFile(a,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(stage.rglob('*')):
  if p.is_file():z.write(p,str(p.relative_to(stage)))
with zipfile.ZipFile(a) as z:
 assert z.testzip() is None
 for line in rows:
  expected,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==expected
sha=hashlib.sha256(a.read_bytes()).hexdigest();(E/'SB-05-stage1-review.zip.sha256').write_text(sha+'  SB-05-stage1-review.zip\n');result={'passed':True,'sha256':sha,'size_bytes':a.stat().st_size,'payload_files':len(files),'crc_passed':True,'all_payload_hashes_match':True,'git_and_database_included':False};(E/'package-integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
