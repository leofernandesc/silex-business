"""Compare all 26 legacy reports and CSV bytes against the confirmed PR14 baseline."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
from compare_financial_stage1 import PROBE

ROOT=Path(__file__).resolve().parents[1]
BASE='00fcaa5f869d702dda6ad535d264a0216dd11b65'


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default=BASE)
    parser.add_argument('--output',type=Path,default=ROOT/'specs/dre-integration/legacy-report-comparison.json')
    args=parser.parse_args()
    baseline_commit=subprocess.check_output(['git','rev-parse','--verify',args.base+'^{commit}'],cwd=ROOT,text=True).strip()
    with tempfile.TemporaryDirectory(prefix='silex-dre-contracts-') as directory:
        temp=Path(directory);baseline=temp/'baseline';baseline.mkdir()
        archive=temp/'baseline.tar'
        with archive.open('wb') as f:subprocess.run(['git','archive',baseline_commit,'backend'],cwd=ROOT,stdout=f,check=True)
        with tarfile.open(archive) as f:f.extractall(baseline,filter='data')
        outputs=[]
        for name,source in [('baseline',baseline),('candidate',ROOT)]:
            target=temp/name;target.mkdir(exist_ok=True);result=target/'result.json'
            env={**os.environ,'PYTHONPATH':str(source/'backend'),'GESTAO_ENV':'local','GESTAO_DATABASE_URL':f'sqlite:///{target}/fixture.sqlite3','SILEX_COMPARE_OUTPUT':str(result)}
            for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):env.pop(key,None)
            subprocess.run([sys.executable,'-c',PROBE],cwd=source,env=env,check=True,stdout=subprocess.DEVNULL)
            outputs.append(json.loads(result.read_text()))
        comparisons=[]
        for key in sorted(outputs[0].keys()|outputs[1].keys()):
            old,new=outputs[0].get(key),outputs[1].get(key)
            comparisons.append({'case':key,'equal':old==new,'baseline_sha256':hashlib.sha256(json.dumps(old,sort_keys=True).encode()).hexdigest(),'candidate_sha256':hashlib.sha256(json.dumps(new,sort_keys=True).encode()).hexdigest()})
        report_ids=[d['id'] for d in outputs[0]['before-reversal:catalog']]
        assert len(report_ids)==26
        target=args.output
        target.parent.mkdir(parents=True,exist_ok=True)
        summary={'baseline':baseline_commit,'reports':report_ids,'comparisons':comparisons,'mismatches':[r['case'] for r in comparisons if not r['equal']],
                 'fixture':'Independent disposable SQLite fixtures; partial principal, charges, discounts and reversal. Identical event registration timestamps for CSV; JSON removes only the documented volatile timestamps from the existing probe. No CSV normalization.',
                 'intentional_dashboard_change':'/api/dashboard uses remaining principal including partial/reversed titles; proved separately in test_dre_receivables.'}
        target.write_text(json.dumps(summary,indent=2)+'\n')
        print(json.dumps({'comparisons':len(comparisons),'reports':26,'mismatches':summary['mismatches']}))
        return int(bool(summary['mismatches']))


if __name__=='__main__':raise SystemExit(main())
