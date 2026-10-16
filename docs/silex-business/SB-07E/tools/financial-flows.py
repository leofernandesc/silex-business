"""Identical real HTTP mutations ONLY on two disposable SB-06E fixtures.
Compare explicit financial fields (IDs/cents/status/civil dates/account balances),
not generated timestamps, session tokens or audit metadata.
"""
import hashlib,http.cookiejar,json,os,urllib.request
from pathlib import Path
origins=[os.environ['SILEX_BASELINE'],os.environ['SILEX_CANDIDATE']]
assert all(o in ['http://127.0.0.1:18094','http://127.0.0.1:18095'] for o in origins)
versions={}
for variant,origin in zip(['baseline','candidate'],origins):
 op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(path,body=None,status=200,raw=None,headers=None):
  req=urllib.request.Request(origin+'/api'+path,data=raw if raw is not None else json.dumps(body).encode() if body is not None else None,headers=headers or {'Content-Type':'application/json'})
  with op.open(req) as response:
   assert response.status==status,(path,response.status)
   return json.load(response)
 call('/auth/login',{'username':'demo.admin','password':os.environ['SILEX_TEST_PASSWORD']})
 account=next(a for a in call('/accounts') if a['kind']=='bank');categories=call('/categories');steps=[]
 def snapshot(label,entry=None):
  accounts=call('/accounts')
  result={'step':label,'balances':[{k:a[k] for k in ['id','balance_cents','opening_cents']} for a in accounts]}
  if entry is not None:
   result['title']={k:entry.get(k) for k in ['id','direction','amount_cents','remaining_cents','status','due_date','competence_date','account_id','category_id','document']}
   result['payments']=[{k:p.get(k) for k in ['id','amount_cents','principal_cents','interest_cents','fine_cents','discount_cents','posting_date','competence_date','reversal_of','reversal_reason','account_id']} for p in entry['payments']]
  steps.append(result)
 snapshot('initial')
 for direction in ['expense','income']:
  category=next(c for c in categories if c['name']==('Despesas operacionais' if direction=='expense' else 'Outras receitas'))
  entry=call('/finance',{'description':'SB07E fluxo sintético '+direction,'direction':direction,'amount_cents':12345,'account_id':account['id'],'category_id':category['id'],'due_date':'2026-03-04','competence_date':'2026-02-28','document':'SB07E-FAKE'},201);identifier=entry['id'];snapshot(direction+'-created',entry)
  body={'method':'pix','account_id':account['id'],'principal_cents':3000,'interest_cents':125,'fine_cents':75,'discount_cents':200,'posting_date':'2026-10-14','request_key':'sb07e-'+direction+'-partial'}
  entry=call(f'/finance/{identifier}/settle',body);assert entry['status']=='partial' and entry['remaining_cents']==9345;snapshot(direction+'-partial',entry);payment=entry['payments'][0]['id']
  repeated=call(f'/finance/{identifier}/settle',body);assert len(repeated['payments'])==1;snapshot(direction+'-idempotent',repeated)
  entry=call(f'/finance/{identifier}/settle',{'method':'pix','account_id':account['id'],'principal_cents':9345,'posting_date':'2026-10-14','request_key':'sb07e-'+direction+'-final'});assert entry['status']=='paid';snapshot(direction+'-paid',entry);last=entry['payments'][-1]['id']
  entry=call(f'/finance/payments/{payment}/reverse',{'reason':'SB07E reversão sintética validada'});assert entry['remaining_cents']==3000;snapshot(direction+'-reverse-partial',entry)
  entry=call(f'/finance/payments/{last}/reverse',{'reason':'SB07E reversão final sintética'});assert entry['remaining_cents']==12345;snapshot(direction+'-reverse-final',entry)
  entry=call(f'/finance/{identifier}/cancel',{'reason':'SB07E cancelamento de teste'});assert entry['status']=='canceled';snapshot(direction+'-canceled',entry)
 category=next(c for c in categories if c['name']=='Despesas operacionais')
 entry=call('/finance',{'description':'SB07E OFX sintético','direction':'expense','amount_cents':1001,'account_id':account['id'],'category_id':category['id'],'due_date':'2026-03-04','competence_date':'2026-03-04'},201)
 ofx=('OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261014120000[-4:AMT]<TRNAMT>-10.01<FITID>SB07E-SYNTHETIC-001<NAME>SB07E sintético<MEMO>Conferência manual</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>').encode()
 imported=call('/finance/ofx/imports?account_id='+str(account['id']),status=201,raw=ofx,headers={'Content-Type':'application/x-ofx','X-Statement-Name':'SB07E-ficticio.ofx'})
 # Obtain actual import payload from the API; no matching guesses or altered responses.
 statement_id=imported['id'];items=imported['items'];item=items[0]
 confirmed=call(f"/finance/ofx/imports/{statement_id}/items/{item['id']}/confirm",{'entry_id':entry['id'],'principal_cents':1001})
 steps.append({'step':'ofx-manual-confirm','response':{k:confirmed.get(k) for k in ['id','status','amount_cents','entry_id','posted_date']}})
 snapshot('after-ofx')
 versions[variant]=steps
checks=[{'step':a['step'],'equal':a==b,'baseline':a,'candidate':b} for a,b in zip(versions['baseline'],versions['candidate'])]
Path(os.environ['SILEX_EVIDENCE'],'financial-flows.json').write_text(json.dumps({'synthetic_disposable_only':True,'timestamp_fields_not_compared':True,'checks':checks,'all_equal':all(c['equal'] for c in checks)},indent=2));assert all(c['equal'] for c in checks)
print(len(checks),'identical mutation checkpoints')
