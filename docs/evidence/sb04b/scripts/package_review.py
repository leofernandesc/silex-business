"""Package review docs/evidence/checkpoint and affected source, without deployment."""
from pathlib import Path
import hashlib,json,shutil,tempfile,zipfile
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1]
assert json.loads((E/'preservation-test.json').read_text())['passed'];assert json.loads((E/'backup-integrity-final.json').read_text())['passed'];assert json.loads((E/'cleanup.json').read_text())['passed']
manifest=json.loads((E/'backup-manifest.json').read_text());stage=Path(tempfile.mkdtemp(prefix='silex-sb04b-review-'))
excluded={'SB-04B-review.zip','SB-04B-review.zip.sha256','package-integrity.json','FILES.sha256'}
shutil.copytree(E,stage/'docs/evidence/sb04b',ignore=lambda d,n:[x for x in n if Path(d)==E and x in excluded])
for folder in (R/'docs/silex-business').glob('SB-*'):
 for p in folder.glob('*.md'):
  t=stage/p.relative_to(R);t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,t)
shutil.copy2(R/'docs/silex-business/PENDENCIAS.md',stage/'docs/silex-business/PENDENCIAS.md')
for rel in manifest['modified_existing']+manifest['new_files_to_remove_on_restore']:
 t=stage/rel;t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/rel,t)
(stage/'LEIA-ME.md').write_text('# Revisão externa — Silex Business SB-04B\n\nAbra docs/evidence/sb04b/galeria.html e leia docs/silex-business/SB-04B/RELATORIO.md.\n\nInclui comparação C/implementação, capturas antes/depois, fontes afetadas, diff, logs finais/tentativas, matriz de testes e recuperação. Documentos históricos são cópias intactas; outras evidências históricas dependem dos pacotes anteriores.\n\nSomente dados fictícios de ambiente isolado nas imagens. Nenhum banco real ou descartável incluído. Pacote de revisão, não build para deploy nem aplicação completa. Backend/contratos/regras foram preservados; SB-05 não iniciado.\n\nConferir sha256sum -c FILES.sha256 após extrair. Recuperação manual: recovery-checkpoint/manifest.json e RESTORE.md, oito originais e remoção de cinco novos arquivos, após conferir diferenças posteriores.\n')
files=sorted(p for p in stage.rglob('*') if p.is_file());assert not any(p.suffix in ['.sqlite3','.db'] for p in files)
rows=[hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(stage)) for p in files];(stage/'FILES.sha256').write_text('\n'.join(rows)+'\n');shutil.copy2(stage/'FILES.sha256',E/'FILES.sha256')
a=E/'SB-04B-review.zip'
with zipfile.ZipFile(a,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(stage.rglob('*')):
  if p.is_file():z.write(p,str(p.relative_to(stage)))
with zipfile.ZipFile(a) as z:
 assert z.testzip() is None
 for line in rows:
  expected,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==expected
sha=hashlib.sha256(a.read_bytes()).hexdigest();(E/'SB-04B-review.zip.sha256').write_text(sha+'  SB-04B-review.zip\n');result={'passed':True,'archive':str(a),'sha256':sha,'size_bytes':a.stat().st_size,'archive_files':len(files)+1,'verified_payload_files':len(files),'crc_passed':True,'all_payload_hashes_match':True,'contains_database':False};(E/'package-integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
