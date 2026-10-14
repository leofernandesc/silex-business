"""Package review artifacts after servers stop; does not change application code."""
from pathlib import Path
import hashlib,json,shutil,tempfile,zipfile
root=Path('/home/leofernandesc/controlmax-inspired');evidence=Path(__file__).resolve().parents[1]
assert json.loads((evidence/'cleanup.json').read_text())['passed']
assert json.loads((evidence/'preservation-test.json').read_text())['passed']
manifest=json.loads((evidence/'backup-manifest.json').read_text())
stage=Path(tempfile.mkdtemp(prefix='silex-sb03-review-'))
excluded={'SB-03-review.zip','SB-03-review.zip.sha256','package-integrity.json','FILES.sha256'}
shutil.copytree(evidence,stage/'docs/evidence/sb03',ignore=lambda d,n: [x for x in n if Path(d)==evidence and x in excluded])
for folder in (root/'docs/silex-business').glob('SB-*'):
 for p in folder.glob('*.md'):
  target=stage/p.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
shutil.copy2(root/'docs/silex-business/PENDENCIAS.md',stage/'docs/silex-business/PENDENCIAS.md')
for rel in manifest['modified_existing']+manifest['new_files_to_remove_on_restore']:
 target=stage/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/rel,target)
(stage/'LEIA-ME.md').write_text('# Revisão externa Silex Business SB-03\n\nAbra docs/evidence/sb03/comparativo.html para os pares antes/depois e leia docs/silex-business/SB-03/RELATORIO.md.\n\nInclui diffs, fontes afetadas, resultados finais/tentativas, capturas responsivas, manifesto de preservação e checkpoint de recuperação. Documentos históricos são cópias sem alteração; referências a antigos pacotes de imagem dependem dos pacotes anteriores.\n\nTodos os dados das capturas/testes são fictícios. Nenhum banco real ou banco descartável está no ZIP. Este pacote não é um build para deploy nem contém toda a aplicação backend. Não ativa páginas pública/home, não altera dados e não autoriza SB-04.\n\nFILES.sha256 cobre cada arquivo do pacote exceto o próprio manifesto. Conferir com sha256sum -c FILES.sha256 após extrair. A restauração é manual e controlada por recovery-checkpoint/manifest.json e RESTORE.md: três originais e remoção dos seis novos arquivos do incremento. Revisar diferenças posteriores antes de executar.\n')
files=sorted(p for p in stage.rglob('*') if p.is_file())
rows=[hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(stage)) for p in files]
(stage/'FILES.sha256').write_text('\n'.join(rows)+'\n');shutil.copy2(stage/'FILES.sha256',evidence/'FILES.sha256')
archive=evidence/'SB-03-review.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(stage.rglob('*')):
  if p.is_file():z.write(p,str(p.relative_to(stage)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for row in rows:
  expected,name=row.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==expected
sha=hashlib.sha256(archive.read_bytes()).hexdigest();(evidence/'SB-03-review.zip.sha256').write_text(sha+'  SB-03-review.zip\n')
result={'passed':True,'archive':str(archive),'sha256':sha,'size_bytes':archive.stat().st_size,'archive_files':len(files)+1,'verified_payload_files':len(files),'crc_passed':True,'all_payload_hashes_match':True,'contains_database':False,'stage':str(stage)}
(evidence/'package-integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
