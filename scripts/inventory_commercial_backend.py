"""Inspect actual registered routes/OpenAPI against a private disposable schema only."""
import ast,json,os,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    with tempfile.TemporaryDirectory(prefix='silex-inventory-') as folder:
        os.environ.update(GESTAO_DATABASE_URL=f'sqlite:///{folder}/inventory.sqlite3',GESTAO_ENV='local')
        for key in ('RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','GESTAO_PUBLIC_HOST','GESTAO_PUBLIC_ORIGIN'):os.environ.pop(key,None)
        from app.cli import migrate
        from app.api import create_app
        from app.db import build_engine
        migrate();engine=build_engine();app=create_app(engine,serve_frontend=False)
        def dependency(d):
            return {'call':getattr(d.call,'__qualname__',str(d.call)), 'dependencies':[dependency(x) for x in d.dependencies]}
        routes=[{'path':r.path,'methods':sorted(r.methods),'handler':r.endpoint.__qualname__,'dependencies':dependency(r.dependant)} for r in app.routes if hasattr(r,'dependant')]
        old=json.loads((ROOT/'specs/integration/INVENTORY.json').read_text())
        actual={(m,r['path']) for r in routes for m in r['methods']};historical={(e['method'],e['path']) for e in old['endpoints']}
        result={'registered_routes':routes,'openapi_schemas':app.openapi()['components']['schemas'],'declarations_previously_inventoried':len(old['endpoints']),'registered_operations':len(actual),'only_in_runtime':sorted(actual-historical),'only_in_previous_declarations':sorted(historical-actual),'scope':'Real disposable schema; generic dynamic CSV declarations expand at runtime. All dependency guards recorded, identity/capability behavior validated in tests.'}
        target=ROOT/'specs/commercial-readiness/BACKEND-INVENTORY.json';target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');engine.dispose();print(len(routes),'registered route objects;',len(actual),'operations')
if __name__=='__main__':main()
