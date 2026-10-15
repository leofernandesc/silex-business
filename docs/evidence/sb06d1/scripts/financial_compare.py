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
         '/api/finance/budgets?year=2026&month=10',
         '/api/finance/movements?start=2026-10-01&end=2026-10-31&page_size=100',
         '/api/sales?start=2026-10-01&end=2026-10-31',
         '/api/stock-movements?start=2026-10-01&end=2026-10-31']
versions = {}
for variant, origin in [('baseline', os.environ['SILEX_BASELINE']), ('candidate', os.environ['SILEX_CANDIDATE'])]:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    request = urllib.request.Request(origin + '/api/auth/login', data=json.dumps({'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']}).encode(), headers={'Content-Type':'application/json'})
    with opener.open(request) as response: assert response.status == 200
    versions[variant] = {}
    with opener.open(origin + '/api/finance/reports/catalog') as response:
        catalog = json.load(response)
    all_paths = paths + ['/api/finance/reports/' + row['id'] + '?start=2026-01-01&end=2026-12-31&page_size=100' for row in catalog]
    for path in all_paths:
        with opener.open(origin + path) as response:
            versions[variant][path] = json.load(response)
checks = []
for path in all_paths:
    a, b = (json.dumps(versions[v][path], sort_keys=True, ensure_ascii=False).encode() for v in ['baseline', 'candidate'])
    checks.append({'path':path, 'equal':a == b, 'baseline_sha256':hashlib.sha256(a).hexdigest(), 'candidate_sha256':hashlib.sha256(b).hexdigest()})
assert all(row['equal'] for row in checks)
(out / 'financial-equivalence.json').write_text(json.dumps({'disposable_fixtures':True, 'checks':checks, 'all_equal':True}, indent=2))
print('Financial API equality:', len(checks), '/', len(all_paths))
