"""Run selected ORIGINAL tests against the original frontend and equivalent synthetic data."""
from pathlib import Path
import json, os, subprocess, tarfile, tempfile
ROOT=Path(__file__).resolve().parents[4]; E=ROOT/'docs/evidence/sb07c'
baseline=json.loads((E/'baseline.json').read_text());archive=Path(baseline['backup'])/'approved.tar'
with tempfile.TemporaryDirectory(prefix='silex-sb07c-original-tests-') as directory:
    work=Path(directory)
    with tarfile.open(archive) as tar:
        for entry in tar.getmembers():
            if entry.name.startswith('frontend/tests/') or entry.name=='frontend/src/format.ts':tar.extract(entry,work,filter='data')
    (work/'frontend/node_modules').symlink_to(ROOT/'frontend/node_modules',target_is_directory=True)
    cfg={'testDir':str(work/'frontend/tests'),'testMatch':['accounts-interface.spec.ts','dashboard-interface.spec.ts','modal-workflows.spec.ts'],'timeout':45000,'workers':1,'retries':0,'use':{'browserName':'firefox','viewport':{'width':1440,'height':900},'baseURL':'http://127.0.0.1:8012','launchOptions':{'executablePath':os.environ.get('GESTAO_FIREFOX_PATH','/home/leofernandesc/.cache/ms-playwright/firefox-1543/firefox/firefox')}},'reporter':[['list'],['json',{'outputFile':str(E/'baseline-legacy-results.json')}]],'outputDir':str(E/'baseline-legacy-artifacts')}
    config=work/'playwright.config.cjs';config.write_text('module.exports='+json.dumps(cfg))
    with (E/'baseline-legacy.log').open('w') as log:
        result=subprocess.run(['node',str(ROOT/'frontend/node_modules/.bin/playwright'),'test','--config',str(config),'--grep',os.environ.get('SILEX_LEGACY_GREP','P02 visible|chart keeps|complete small|Conciliação')],cwd=ROOT/'frontend',stdout=log,stderr=subprocess.STDOUT)
    print('Original baseline tests completed, exit',result.returncode)
