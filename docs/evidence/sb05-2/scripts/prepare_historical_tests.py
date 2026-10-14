"""Adapt only temporary test guards to this increment's disposable environment."""
from pathlib import Path
import json,hashlib,difflib
E=Path(__file__).resolve().parents[1];R=Path('/home/leofernandesc/controlmax-inspired');env=json.loads((E/'environment.json').read_text());W=Path(env['work_dir']);assert W.name.startswith('silex-sb05-2-') and not env['persistent_database_used']
rows=[]
for filename,old,new in [('navigation.spec.ts',r'/^\/tmp\/silex-sb0(?:3|4a|4b)-/',r'/^\/tmp\/silex-sb05-2-/'),('home.spec.ts',r'/^\/tmp\/silex-sb04b-/',r'/^\/tmp\/silex-sb05-2-/')]:
 rel='frontend/tests/'+filename;original=(R/rel).read_text();assert original.count(old)==1;adapted=original.replace(old,new);(W/'candidate'/rel).write_text(adapted);rows.append({'path':rel,'production_unchanged':True,'original_sha256':hashlib.sha256(original.encode()).hexdigest(),'temporary_sha256':hashlib.sha256(adapted.encode()).hexdigest()});(E/(filename+'.isolated.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True),adapted.splitlines(True),fromfile='production/'+rel,tofile='isolated/'+rel)))
(E/'historical-test-adapters.json').write_text(json.dumps({'passed':True,'only_disposable_directory_guard_changed':True,'test_logic_and_production_unchanged':True,'files':rows},indent=2));print('Two temporary directory guards adapted; historical source tests unchanged.')
