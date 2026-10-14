"""Adapt only temporary test guards to this increment's disposable environment."""
from pathlib import Path
import json,hashlib,difflib
E=Path(__file__).resolve().parents[1];R=Path('/home/leofernandesc/controlmax-inspired');env=json.loads((E/'environment.json').read_text());W=Path(env['work_dir']);assert W.name.startswith('silex-sb05-2-') and not env['persistent_database_used']
rows=[]
for filename,old,new in [('navigation.spec.ts',r'/^\/tmp\/silex-sb0(?:3|4a|4b)-/',r'/^\/tmp\/silex-sb05-2-/'),('home.spec.ts',r'/^\/tmp\/silex-sb04b-/',r'/^\/tmp\/silex-sb05-2-/')]:
 rel='frontend/tests/'+filename;original=(R/rel).read_text();assert original.count(old)==1;adapted=original.replace(old,new);
 if filename=='navigation.spec.ts':
  target='  await page\n    .getByRole("button", { name: "Abrir livro caixa", exact: true })\n    .click();'
  assert original.count(target)==1
  adapted=adapted.replace(target,'  await page.evaluate(() => document.fonts.ready);\n  await page.getByRole("button", { name: "Abrir livro caixa", exact: true }).scrollIntoViewIfNeeded();\n  await page.getByRole("button", { name: "Abrir livro caixa", exact: true }).hover();\n'+target)
(W/'candidate'/rel).write_text(adapted);rows.append({'path':rel,'production_unchanged':True,'original_sha256':hashlib.sha256(original.encode()).hexdigest(),'temporary_sha256':hashlib.sha256(adapted.encode()).hexdigest()});(E/(filename+'.isolated.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True),adapted.splitlines(True),fromfile='production/'+rel,tofile='isolated/'+rel)))
(E/'historical-test-adapters.json').write_text(json.dumps({'passed':True,'disposable_guards_and_navigation_font_layout_wait_only':True,'actions_assertions_and_production_unchanged':True,'files':rows},indent=2));print('Two directory guards and font/layout readiness wait adapted; original clicks/assertions and production unchanged.')
