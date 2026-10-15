"""Adapt only environment guards and the isolated origin, never production tests."""
from pathlib import Path
import difflib, hashlib, json

R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb05-3a'
env=json.loads((E/'environment.json').read_text());W=Path(env['work_dir'])
assert str(W).startswith('/tmp/silex-sb053a-') and env['persistent_database_used'] is False
rows=[]
for name in ['navigation.spec.ts','home.spec.ts','public.spec.ts','app.spec.ts']:
    rel='frontend/tests/'+name;original=(R/rel).read_text();adapted=original
    if name=='navigation.spec.ts':adapted=adapted.replace(r'/^\/tmp\/silex-sb0(?:3|4a|4b)-/',r'/^\/tmp\/silex-sb053a-/')
    if name=='home.spec.ts':adapted=adapted.replace(r'/^\/tmp\/silex-sb04b-/',r'/^\/tmp\/silex-sb053a-/')
    adapted=adapted.replace(':8011',':18042')
    (W/'candidate'/rel).write_text(adapted)
    diff=''.join(difflib.unified_diff(original.splitlines(True),adapted.splitlines(True),fromfile='production/'+rel,tofile='isolated/'+rel))
    (E/(name+'.isolated.diff')).write_text(diff)
    rows.append({'path':rel,'original_sha256':hashlib.sha256(original.encode()).hexdigest(),'temporary_sha256':hashlib.sha256(adapted.encode()).hexdigest(),'production_unchanged':True})
(E/'historical-test-adapters.json').write_text(json.dumps({'files':rows,'purpose':'Only disposable path guards and fixed origin port; all tested actions and authorization expectations retained.'},indent=2))
print('Disposable test copies adapted; production tests unchanged.')
