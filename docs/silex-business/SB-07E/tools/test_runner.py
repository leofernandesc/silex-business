"""Run unchanged historical tests in throwaway tree, protecting historical captures."""
from pathlib import Path
import os,json,subprocess as sp,tempfile,tarfile,shutil,sys
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e';base=json.loads((E/'baseline.json').read_text());name=sys.argv[1]
with tempfile.TemporaryDirectory(prefix='silex-sb07e-tests-') as d:
 work=Path(d)
 with tarfile.open(Path(base['backup'])/'approved.tar') as t:t.extractall(work,filter='data')
 shutil.copy2(R/'frontend/playwright.sb07e.config.ts',work/'frontend/playwright.sb07e.config.ts')
 (work/'frontend/node_modules').symlink_to(R/'frontend/node_modules',target_is_directory=True)
 for folder in ['partners','sprint8','sprint9-13','service-orders']:(work/'docs/evidence'/folder).mkdir(parents=True,exist_ok=True)
 env={**os.environ,'SILEX_SB07E_RESULTS':str(E/(name+'-results.json')),'SILEX_SB07E_OUTPUT':str(E/(name+'-artifacts')),'SILEX_SB04B_ENV':str(E/'session-manifest.json')}
 command=[str(R/'frontend/node_modules/.bin/playwright'),'test','-c','playwright.sb07e.config.ts',*sys.argv[2:]]
 with (E/(name+'.log')).open('w') as f:p=sp.run(command,cwd=work/'frontend',env=env,stdout=f,stderr=sp.STDOUT)
 captures=work/'docs/evidence';target=E/(name+'-captures')
 for path in captures.rglob('*.png'):
  dest=target/path.relative_to(captures);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
 print(name,'exit',p.returncode,flush=True);sys.exit(p.returncode)
