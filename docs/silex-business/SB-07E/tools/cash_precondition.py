"""Record only cash-open precondition; no mutation apart from synthetic login."""
from pathlib import Path
import os,json,urllib.request,http.cookiejar,sys
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e';origin='http://127.0.0.1:8011'
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
op.open(urllib.request.Request(origin+'/api/auth/login',data=json.dumps({'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']}).encode(),headers={'Content-Type':'application/json'})).close()
with op.open(origin+'/api/cash-sessions/current') as f:cash=json.load(f)
(E/('cash-precondition-'+sys.argv[1]+'.json')).write_text(json.dumps({'origin':origin,'admin_cash_open':cash is not None,'cash_id':cash.get('id') if cash else None,'synthetic_only':True},indent=2));print('admin cash open:',cash is not None)
