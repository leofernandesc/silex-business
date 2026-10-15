"""Read-only export/print equivalence using identical synthetic fixtures."""
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import urllib.request

versions={}
paths=['/api/finance/print?start=2026-01-01&end=2026-12-31',
       '/api/reports/finance.csv?start=2026-01-01&end=2026-12-31',
       '/api/reports/sales.csv?start=2026-01-01&end=2026-12-31',
       '/api/reports/stock.csv?start=2026-01-01&end=2026-12-31']
for version,origin in [('baseline',os.environ['SILEX_BASELINE']),('candidate',os.environ['SILEX_CANDIDATE'])]:
    op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    body=json.dumps({'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']}).encode()
    op.open(urllib.request.Request(origin+'/api/auth/login',data=body,headers={'Content-Type':'application/json'})).close()
    with op.open(origin+'/api/finance/reports/catalog') as response:catalog=json.load(response)
    versions[version]={}
    for path in paths+['/api/finance/reports/'+row['id']+'.csv?start=2026-01-01&end=2026-12-31' for row in catalog]:
        with op.open(origin+path) as response:raw=response.read()
        versions[version][path]=hashlib.sha256(raw).hexdigest()
checks=[{'path':p,'baseline_sha256':h,'candidate_sha256':versions['candidate'][p],'equal':h==versions['candidate'][p]} for p,h in versions['baseline'].items()]
assert all(c['equal'] for c in checks)
Path(os.environ['SILEX_EVIDENCE'],'export-equivalence.json').write_text(json.dumps(checks,indent=2));print(len(checks),'identical exports/print responses')
