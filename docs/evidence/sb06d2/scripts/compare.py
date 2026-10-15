"""Fail on any unexpected computed property, geometry, control state or visual change."""
from pathlib import Path
import hashlib
import json
import os

e=Path(os.environ['SILEX_EVIDENCE']);a=json.loads((e/'baseline-matrix.json').read_text());b=json.loads((e/'candidate-matrix.json').read_text());assert not a['errors'] and not b['errors'];assert a['properties']==b['properties']
key=lambda r:(r['width'],r['route'],r['state'])
left={key(r):r for r in a['rows']};right={key(r):r for r in b['rows']};assert left.keys()==right.keys()
differences=[];properties=0
for k,x in left.items():
    y=right[k]
    for name in ['viewport','document','nodes']:
        if x[name]!=y[name]:differences.append({'state':k,'field':name,'baseline':x[name],'candidate':y[name]})
    order=lambda row:[(s['logical'],s['media'],s['disabled']) for s in row['sheets']]
    if order(x)!=order(y):differences.append({'state':k,'field':'stylesheet-order','baseline':order(x),'candidate':order(y)})
    properties+=sum(len(n['style']) for n in x['nodes'])
(e/'computed-differences.json').write_text(json.dumps(differences,indent=2))
images=[]
for p in sorted((e/'screenshots').glob('baseline-*.png')):
    other=p.with_name(p.name.replace('baseline-','candidate-',1));assert other.is_file()
    images.append({'baseline':p.name,'candidate':other.name,'equal':p.read_bytes()==other.read_bytes(),'baseline_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256(other.read_bytes()).hexdigest()})
orders=[]
for filename in ['baseline-order.json','candidate-order.json']:orders.append(json.loads((e/filename).read_text()))
normalize=lambda rows:[{'state':r['state'],'path':r['path'],'sheets':[{'logical':s['logical'],'media':s['media'],'disabled':s['disabled'],'familyOrder':s['familyOrder']} for s in r['sheets']]} for r in rows]
assert normalize(orders[0])==normalize(orders[1])
result={'states':len(left),'properties_compared':properties,'computed_differences':len(differences),'screenshots':images,'load_order_states':len(orders[0]),'load_order_equal':True,'all_equal':not differences and all(r['equal'] for r in images)}
(e/'computed-comparison.json').write_text(json.dumps(result,indent=2));print({k:v for k,v in result.items() if k!='screenshots'})
assert result['all_equal'],'Unexpected computed or screenshot difference; inspect computed-differences.json before proceeding.'
