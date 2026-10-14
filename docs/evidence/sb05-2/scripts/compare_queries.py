"""Compare read-only queries and original print/CSV in equivalent disposable fixtures."""
from pathlib import Path
import json,urllib.request,http.cookiejar,hashlib
E=Path(__file__).resolve().parents[1]
paths=['/dashboard','/customers','/products','/sales','/stock-movements','/accounts','/finance/dashboard','/finance/movements?page_size=100']
for direction in ['expense','income']:
 paths += ['/finance?direction='+direction+suffix for suffix in ['&page_size=100','&page=2','&status=open','&status=partial','&status=paid','&status=canceled','&status=overdue','&supplier_kind=day_worker','&search_field=document&q=SB052-'+direction+'-02','&date_field=competence&start=2026-10-01&end=2026-10-01']]
 paths += ['/finance/print?direction='+direction+'&q=SB052-'+direction+'-02','/reports/finance.csv?direction='+direction+'&q=SB052-'+direction+'-02']
rows=[]
for role in ['demo.admin','demo.operador']:
 data={}
 for port in [18035,18036]:
  op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));base=f'http://127.0.0.1:{port}/api';op.open(urllib.request.Request(base+'/auth/login',data=json.dumps({'username':role,'password':'DemoLocal#2026'}).encode(),headers={'Content-Type':'application/json'},method='POST')).read();data[port]={}
  for endpoint in paths if role=='demo.admin' else ['/dashboard','/finance','/accounts','/finance/print','/reports/finance.csv']:
   try:
    res=op.open(base+endpoint);body=res.read();status=res.status
   except urllib.error.HTTPError as err:body=err.read();status=err.code
   data[port][endpoint]={'status':status,'sha256':hashlib.sha256(body).hexdigest()}
 for endpoint,value in data[18035].items():rows.append({'role':role,'endpoint':endpoint,'equal':value==data[18036][endpoint],'status':value['status'],'baseline_sha256':value['sha256'],'candidate_sha256':data[18036][endpoint]['sha256']})
assert all(x['equal'] for x in rows)
(E/'query-comparison.json').write_text(json.dumps({'passed':True,'results':rows},indent=2));print(json.dumps({'equal_responses':len(rows)}))
