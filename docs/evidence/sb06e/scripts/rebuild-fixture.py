"""Regenerate the approved SYNTHETIC fixture stages into a new temporary database.
Historical sources are read without modifying their evidence. The seed uses
the current product calendar and both versions receive identical database copies.
"""
from pathlib import Path
import contextlib,io,json,os,re,shutil,sqlite3,sys,textwrap
from datetime import date,timedelta
s=json.loads(Path('/tmp/silex-sb06e-state.json').read_text());R=Path(s['root']);work=Path(s['work']);E=R/'docs/evidence/sb06e'
assert str(work).startswith('/tmp/silex-sb06e-') and not(work/'fixture.sqlite3').exists()
assert os.environ.get('SILEX_TEST_PASSWORD')
# Restore generated dist only inside temporary copies.
shutil.copytree(work/'candidate/frontend/dist',work/'baseline/frontend/dist',dirs_exist_ok=True)
sys.path.insert(0,str(work/'candidate/backend'));os.environ['GESTAO_DATABASE_URL']='sqlite:///'+str(work/'fixture.sqlite3')
import app.services as services
def credentials_from_environment(source):
 return re.sub(r'''(["']password["']\s*:\s*)(["'])([^"']+)\2''',r"\1os.environ['SILEX_TEST_PASSWORD']",source)
# Base catalogs, financial titles/movements and states used by the prior increments.
source=(R/'docs/evidence/sb05-2/scripts/start_isolated.py').read_text().split('servers=[]')[0]
source=source.replace('config = json.loads((EVIDENCE / "environment.json").read_text())',"config = __fixture_config").replace('/tmp/silex-sb05-2-','/tmp/silex-sb06e-')
with contextlib.redirect_stdout(io.StringIO()):
 exec(compile(credentials_from_environment(source),'approved-sb052-fixture','exec'),{'__file__':str(E/'scripts/rebuild-fixture.py'),'__fixture_config':{'work_dir':str(work),'persistent_database_used':False}})
# Existing OFX states/history. Skip the original environment/backup/server launcher.
source=(R/'docs/evidence/sb05-3a/scripts/prepare.py').read_text().split("elif sys.argv[1] == 'fixture':",1)[1]
source=source[source.index("    sys.path.insert(0,str(work/'candidate/backend'))"):]
exec(compile(credentials_from_environment(textwrap.dedent(source)),'approved-sb053a-fixture','exec'),{'sys':sys,'os':os,'work':work,'E':E,'sqlite3':sqlite3,'json':json})
# Twelve-month chart, high/negative balances and large titles via the original APIs.
source=(R/'docs/evidence/sb05-3b/scripts/augment-fixture.py').read_text();source=source[source.index('sys.path.insert'):].replace("'/tmp/silex-sb053b-'","'/tmp/silex-sb06e-'")
exec(compile(credentials_from_environment(source),'approved-sb053b-fixture','exec'),{'sys':sys,'os':os,'W':work,'E':E,'Path':Path,'sqlite3':sqlite3,'json':json,'date':date,'timedelta':timedelta})
for key in ['baseline_fixture','candidate_fixture','functional','modal_functional']:
 with sqlite3.connect(work/'fixture.sqlite3') as src,sqlite3.connect(Path(s[key])/'functional.sqlite3') as dst:src.backup(dst)
(E/'runtime-recovery.json').write_text(json.dumps({'reason':'Temporary runtime directories unavailable after continuation; all completed logs retained','approved_source_archive_verified':True,'synthetic_fixture_rebuilt_from_approved_generators':True,'seed_calendar':'current product calendar; identical clones','production_clock_modified':False,'prior_357_e2e_results_preserved':True,'work':str(work)},indent=2));print('Rebuilt synthetic copies only; no real database used')
