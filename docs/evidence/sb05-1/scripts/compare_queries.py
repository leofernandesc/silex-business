"""Read-only comparison on equivalent disposable fixtures; never production data."""
from pathlib import Path
import json,urllib.request,http.cookiejar
E=Path(__file__).resolve().parents[1]
results=[]
for role in ['demo.admin','demo.operador']:
 values={}
 for port in [18032,18033]:
  jar=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));base=f'http://127.0.0.1:{port}/api'
  op.open(urllib.request.Request(base+'/auth/login',data=json.dumps({'username':role,'password':'DemoLocal#2026'}).encode(),headers={'Content-Type':'application/json'},method='POST')).read()
  values[port]={}
  for endpoint in ['/dashboard','/customers','/products','/sales']+(['/finance','/stock-movements','/accounts','/finance/movements?page_size=100','/finance/movements?direction=income','/finance/movements?direction=expense','/finance/movements?origin=manual','/finance/movements?origin=reversal','/finance/movements?search_field=document&q=DOC-SB05-02','/finance/movements?has_attachment=false','/finance/movements?date_field=competence&start=2026-10-01&end=2026-10-31'] if role=='demo.admin' else []):
   try:values[port][endpoint]=json.loads(op.open(base+endpoint).read())
   except urllib.error.HTTPError as error:values[port][endpoint]={'status':error.code}
 for endpoint, value in values[18032].items():
  # Session log events and timestamps in sales are fixed by the single common fixture.
  results.append({'role':role,'endpoint':endpoint,'equal':value==values[18033][endpoint],'baseline_status':value.get('status') if isinstance(value,dict) else None})
(E/'query-comparison.json').write_text(json.dumps({'passed':all(x['equal'] for x in results),'results':results},indent=2));print(json.dumps(results))
