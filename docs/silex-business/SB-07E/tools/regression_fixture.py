"""Reuse historical SYNTHETIC fixture stages, without changing historical evidence."""
from pathlib import Path
import contextlib, io, json, os, re, sqlite3, sys, textwrap
from datetime import date, timedelta
ROOT=Path(__file__).resolve().parents[4]
project=Path(sys.argv[1]); work=project.parent; E=ROOT/'docs/evidence/sb07e'
assert str(work).startswith('/tmp/silex-sb07e-') and os.environ.get('SILEX_TEST_PASSWORD')
def credentials(source):
    return re.sub(r"([\"']password[\"']\s*:\s*)([\"'])([^\"']+)\2", r"\1os.environ['SILEX_TEST_PASSWORD']", source)
source=(ROOT/'docs/evidence/sb05-2/scripts/start_isolated.py').read_text().split('servers=[]')[0]
source=source.replace('config = json.loads((EVIDENCE / "environment.json").read_text())', 'config = __config')
source=source.replace('candidate = work / "candidate"', 'candidate = __project').replace('work / "fixture.sqlite3"','work / "synthetic.sqlite3"').replace('/tmp/silex-sb05-2-','/tmp/silex-sb07e-')
source=source.replace('assert all((work/v/"frontend/dist/index.html").is_file() for v in ["baseline","candidate"]), "Build both isolated copies before starting servers"','assert (candidate/"frontend/dist/index.html").is_file()')
with contextlib.redirect_stdout(io.StringIO()):
    exec(compile(credentials(source),'synthetic-sb052','exec'),{'__file__':__file__,'__config':{'work_dir':str(work),'persistent_database_used':False},'__project':project})
source=(ROOT/'docs/evidence/sb05-3a/scripts/prepare.py').read_text().split("elif sys.argv[1] == 'fixture':",1)[1]
source=source[source.index("    sys.path.insert(0,str(work/'candidate/backend'))"):].split("    for variant in")[0]
source=textwrap.dedent(source).replace("work/'candidate/backend'","project/'backend'").replace('fixture.sqlite3','synthetic.sqlite3')
exec(compile(credentials(source),'synthetic-sb053a','exec'),globals())
source=(ROOT/'docs/evidence/sb05-3b/scripts/augment-fixture.py').read_text()
source=source[source.index('sys.path.insert'):].split("for name in ['baseline'")[0]
source=source.replace("W/'candidate/backend'","project/'backend'").replace('fixture.sqlite3','synthetic.sqlite3')
W=work
exec(compile(credentials(source),'synthetic-sb053b','exec'),globals())
print('Historical synthetic fixture prepared; no persistent database used')
