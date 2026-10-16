"""Verify every baseline file except the authorized central documentation supplement."""
from pathlib import Path
import json,hashlib,subprocess as sp
R=Path(__file__).resolve().parents[4];E=R/'docs/evidence/sb07e';b=json.loads((E/'baseline.json').read_text());changed=[]
for p,h in b['tracked'].items():
 if hashlib.sha256((R/p).read_bytes()).hexdigest()!=h:changed.append(p)
assert changed==['docs/silex-business/PENDENCIAS.md'],changed
production=[p for p in b['tracked'] if p.startswith(('frontend/src/','backend/','frontend/public/')) or p in ['frontend/package.json','frontend/package-lock.json','frontend/vite.config.ts','frontend/index.html']]
assert all(hashlib.sha256((R/p).read_bytes()).hexdigest()==b['tracked'][p] for p in production)
assert sp.check_output(['git','rev-parse','main'],cwd=R).decode().strip()=='61c744f4ea291a7f2872c8f3d78f4346e3943ce2'
sp.run(['git','diff','--check'],cwd=R,check=True)
result={'baseline':b['approved_head'],'original_files':len(b['tracked']),'protected_original_files_match':len(b['tracked'])-len(changed),'modified_original_files':changed,'production_file_count':len(production),'production_hashes_unchanged':True,'production_files':production,'main_unchanged':True,'no_dependency_changes':True,'persistent_database_used':False,'historical_tracked_evidence_unchanged':True,'note':'Persistent customer database was not opened or used as fixture; no before/after claim on untracked real database bytes.'}
(E/'preservation-test.json').write_text(json.dumps(result,indent=2));print(len(production),'production paths preserved;',len(b['tracked'])-len(changed),'original paths protected')
