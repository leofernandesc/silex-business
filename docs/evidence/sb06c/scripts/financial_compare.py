"""Read-only financial comparison against identical disposable fixtures."""
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import urllib.request

out = Path(os.environ['SILEX_EVIDENCE'])
paths = ['/api/finance/dashboard', '/api/accounts', '/api/finance?page_size=100',
         '/api/finance/movements?page_size=100', '/api/finance/ofx/imports?page_size=50',
         '/api/finance/budgets?year=2026&month=10']
versions = {}
for variant, origin in [('baseline', os.environ['SILEX_BASELINE']), ('candidate', os.environ['SILEX_CANDIDATE'])]:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    request = urllib.request.Request(origin + '/api/auth/login', data=json.dumps({'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']}).encode(), headers={'Content-Type':'application/json'})
    with opener.open(request) as response: assert response.status == 200
    versions[variant] = {}
    for path in paths:
        with opener.open(origin + path) as response:
            versions[variant][path] = json.load(response)
checks = []
for path in paths:
    a, b = (json.dumps(versions[v][path], sort_keys=True, ensure_ascii=False).encode() for v in ['baseline', 'candidate'])
    checks.append({'path':path, 'equal':a == b, 'baseline_sha256':hashlib.sha256(a).hexdigest(), 'candidate_sha256':hashlib.sha256(b).hexdigest()})
assert all(row['equal'] for row in checks)
(out / 'financial-equivalence.json').write_text(json.dumps({'disposable_fixtures':True, 'checks':checks, 'all_equal':True}, indent=2))
print('Financial API equality:', len(checks), '/', len(paths))
