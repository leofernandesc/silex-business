"""Compare real API/CSV results with main using independent disposable, equivalent fixtures."""
import ast
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
BASE='7214ad2543e0e980366a386b27cc7bbb39eddb32'

def definitions(source):return {n.name:ast.dump(n,include_attributes=False) for n in ast.walk(ast.parse(source)) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))}

def main():
    with tempfile.TemporaryDirectory(prefix='silex-integrated-finance-') as folder:
        directory=Path(folder);baseline=directory/'baseline';baseline.mkdir()
        with (directory/'base.tar').open('wb') as f:subprocess.run(['git','archive',BASE,'backend'],cwd=ROOT,stdout=f,check=True)
        with tarfile.open(directory/'base.tar') as tar:tar.extractall(baseline,filter='data')
        outputs=[]
        for name,source in [('baseline',baseline),('integrated',ROOT)]:
            dbdir=directory/name;dbdir.mkdir(exist_ok=True);out=dbdir/'result.json'
            env={**os.environ,'PYTHONPATH':str(source/'backend'),'GESTAO_DATABASE_URL':f'sqlite:///{dbdir}/fixture.sqlite3','GESTAO_ENV':'local','SILEX_COMPARE_OUTPUT':str(out)}
            for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):env.pop(key,None)
            subprocess.run([sys.executable,'-c',PROBE],cwd=source,env=env,check=True,stdout=subprocess.DEVNULL)
            outputs.append(json.loads(out.read_text()))
        assert outputs[0].keys()==outputs[1].keys()
        mismatches=[k for k in outputs[0] if outputs[0][k]!=outputs[1][k]]
        functions={
            'services.py':['expected_cash','cash_data','move_stock','line_total','create_sale','sale_data','default_records','category_subcategory','repeat_date','choose_account','principal_paid','settle_entry','reverse_payment','finalize_sale','cancel_entry','cancel_sale','finance_data','date_window','page'],
            'reporting.py':['budget_result','rows_page','finance_dashboard','payment_report','report_result'],
            'financial.py':['account_data','movement_query','movement_data','movements','csv_movements','save_attachment','reverse_title_payment','reverse_movement'],
        }
        checks={}
        for file,names in functions.items():
            old=definitions((baseline/'backend/app'/file).read_text());new=definitions((ROOT/'backend/app'/file).read_text())
            for name in names:checks[file+':'+name]=old[name]==new[name]
        result={'base':BASE,'comparisons':len(outputs[0]),'json_comparisons':sum(not k.endswith('.csv') for k in outputs[0]),'csv_byte_comparisons':sum(k.endswith('.csv') for k in outputs[0]),'mismatches':mismatches,'unchanged_financial_functions':checks,'fixture':'Equivalent integer-cent titles, partial payments with charges/discount and reversals. Fixed synthetic event timestamps; only additive summary.as_of_date and volatile JSON timestamp fields omitted by the original probe. CSV byte hashes are not normalized.','not_compared':'Capability return fields and intentional document normalization are validated separately; this comparison does not assume all source files remain identical after integration.'}
        target=ROOT/'specs/integration/evidence/finance-comparison.json';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps({k:v for k,v in result.items() if k!='unchanged_financial_functions'},indent=2))
        bad=[k for k,v in checks.items() if not v];print('Changed selected financial functions:',bad)
        return int(bool(mismatches or bad))
if __name__=='__main__':raise SystemExit(main())
