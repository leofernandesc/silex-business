"""Boundary checks on disposable localhost; never emit cookies/tokens/credentials."""
import http.cookiejar,json,os,urllib.request,urllib.error
from pathlib import Path
origin=os.environ['SILEX_CANDIDATE'];assert origin=='http://127.0.0.1:18062'
rows=[]
for role in ['anonymous','admin','operator']:
 jar=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
 if role!='anonymous':
  body=json.dumps({'username':'demo.admin' if role=='admin' else 'demo.operador','password':os.environ['SILEX_TEST_PASSWORD']}).encode()
  op.open(urllib.request.Request(origin+'/api/auth/login',data=body,headers={'Content-Type':'application/json'})).close()
 for path,expected in [('/api/auth/me',401 if role=='anonymous' else 200),('/api/finance/dashboard',200 if role=='admin' else 401 if role=='anonymous' else 403),('/api/company-settings',401 if role=='anonymous' else 200),('/',200)]:
  try:response=op.open(origin+path)
  except urllib.error.HTTPError as error:response=error
  status=response.status;headers=response.headers
  rows.append({'role':role,'path':path,'status':status,'expected':expected,'pass':status==expected,'headers':{k:headers.get(k) for k in ['Cache-Control','Content-Security-Policy','X-Content-Type-Options','X-Frame-Options','Referrer-Policy']}});response.close();assert status==expected
 if role!='anonymous':
  cookie=next(c for c in jar if c.name=='gestao_session')
  rows.append({'role':role,'cookie_flags_only':{'name':cookie.name,'secure':cookie.secure,'httpOnly':cookie.has_nonstandard_attr('HttpOnly'),'sameSite':cookie.get_nonstandard_attr('SameSite'),'path':cookie.path},'note':'secure=False is current local HTTP behavior, a commercial Internet deployment blocker until transport/cookie review; no full penetration audit performed'})
Path(os.environ['SILEX_EVIDENCE'],'auth-safety.json').write_text(json.dumps(rows,indent=2));print('12 authorization/header checks passed; cookie flags recorded without values')
