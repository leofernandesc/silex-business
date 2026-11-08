"""Reproduce candidate validation with disposable SQLite only; no publication commands."""
import argparse,os,shlex,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--layer',choices=['core','browsers','all'],default='core')
    parser.add_argument('--browser',choices=['chromium','firefox'],default='chromium')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--list',action='store_true')
    args=parser.parse_args();output=args.output.resolve();output.mkdir(mode=0o700,parents=True,exist_ok=True)
    commands=[]
    if args.layer in ('core','all'):
        commands.extend([(ROOT,[sys.executable,'-m','pytest','backend/tests','-q']),
                         (ROOT/'frontend',['npm','test']),
                         (ROOT/'frontend',['npm','run','build']),
                         (ROOT,[sys.executable,'scripts/compare_commercial_finance.py'])])
    if args.layer in ('browsers','all'):
        commands.extend([(ROOT/'frontend',['npx','--no-install','playwright','test','--config','playwright.integration.config.ts']),
                         (ROOT,[sys.executable,'scripts/check_financial_stage1.py']),
                         (ROOT,[sys.executable,'scripts/check_transport_module.py']),
                         (ROOT/'frontend',['npx','--no-install','playwright','test','--config','playwright.components-review.config.ts'])])
    with tempfile.TemporaryDirectory(prefix='silex-commercial-run-') as folder:
        env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'GESTAO_ENV':'local','GESTAO_DATABASE_URL':f'sqlite:///{folder}/guard.sqlite3',
             'SILEX_INTEGRATION_BROWSER':args.browser,'SILEX_REVIEW_BROWSER':args.browser,
             'SILEX_INTEGRATION_REPORT':str(output/f'{args.browser}-matrix.json'),
             'SILEX_FINANCIAL_EVIDENCE_DIR':str(output/'financial')}
        for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN','SILEX_INTEGRATION_MANIFEST','SILEX_E2E_MANIFEST'):env.pop(key,None)
        for index,(cwd,command) in enumerate(commands,1):
            print(f'[{cwd.relative_to(ROOT) or "."}] {shlex.join(command)}',flush=True)
            if not args.list:
                with (output/f'{index:02d}-{args.browser}.txt').open('w') as log:
                    result=subprocess.run(command,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
                print('PASS' if not result.returncode else f'FAIL exit={result.returncode}',flush=True)
                if result.returncode:return result.returncode
    return 0
if __name__=='__main__':raise SystemExit(main())
