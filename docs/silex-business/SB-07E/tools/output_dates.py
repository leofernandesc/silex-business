"""Inventory actual export/print data shapes; never convert or persist their contents."""
from pathlib import Path
import os,urllib.request,http.cookiejar,json,csv,io,re,hashlib
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e';origin=os.environ['SILEX_CANDIDATE'];assert origin=='http://127.0.0.1:18095'
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
op.open(urllib.request.Request(origin+'/api/auth/login',data=json.dumps({'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']}).encode(),headers={'Content-Type':'application/json'})).close()
with op.open(origin+'/api/finance/reports/catalog') as f:catalog=json.load(f)
paths=['/api/finance/movements.csv','/api/reports/finance.csv','/api/reports/sales.csv','/api/reports/stock.csv','/api/finance/print']+[f"/api/finance/reports/{r['id']}.csv" for r in catalog]
rows=[]
for path in paths:
 with op.open(origin+path+'?start=2026-01-01&end=2026-12-31') as f:raw=f.read();mime=f.headers.get('Content-Type')
 text=raw.decode('utf-8-sig');dates=sorted(set(re.findall(r'\b\d{4}-\d{2}-\d{2}(?:T[0-9:.+Z-]+)?\b|\b\d{2}/\d{2}/\d{4}\b|\b\d{4}-\d{2}\b',text)))
 records=list(csv.reader(io.StringIO(text),delimiter=';')) if '.csv' in path else []
 rows.append({'path':path,'mime':mime,'headers':records[0] if records else None,'row_count':max(len(records)-1,0) if records else None,'date_examples_synthetic':dates[:5],'date_formats':{'iso_civil':bool(re.search(r'\b\d{4}-\d{2}-\d{2}\b',text)),'iso_timestamp':bool(re.search(r'\d{4}-\d{2}-\d{2}T',text)),'iso_month':bool(re.search(r'\b\d{4}-\d{2}\b(?!-)',text)),'brazilian':bool(re.search(r'\b\d{2}/\d{2}/\d{4}\b',text))},'sha256':hashlib.sha256(raw).hexdigest()})
(E/'output-dates.json').write_text(json.dumps(rows,indent=2));print(len(rows),'export/print shapes measured, unchanged')
