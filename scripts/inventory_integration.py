"""Static inventory: no application imports or database access."""
import ast
import json
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

def inventory():
    source=(ROOT/'frontend/src/navigation/routes.ts').read_text().split('] as const;',1)[0]
    routes=[]
    for body in re.findall(r'\{([^{}]+)\}',source):
        identifier=re.search(r'id:\s*"([^"]+)"',body)
        if not identifier:continue
        routes.append({'id':identifier[1],'title':re.search(r'title:\s*"([^"]+)"',body)[1],'admin':'admin: true' in body,'transport':identifier[1]=='subcontracted-freight'})
    endpoints=[]
    for file in ['api.py','financial.py','reporting.py','service_orders.py']:
        path=ROOT/'backend/app'/file;tree=ast.parse(path.read_text())
        for node in ast.walk(tree):
            if not isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):continue
            for decorator in node.decorator_list:
                if isinstance(decorator,ast.Call) and isinstance(decorator.func,ast.Attribute) and decorator.func.attr in ('get','post','put','delete','patch') and decorator.args and isinstance(decorator.args[0],ast.Constant):
                    endpoints.append({'method':decorator.func.attr.upper(),'path':decorator.args[0].value,'function':node.name,'file':'backend/app/'+file,'line':node.lineno,'defaults':[ast.unparse(n) for n in node.args.defaults],'guards':sorted({n.func.id for n in ast.walk(node) if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id in ('transport_kind','transport_supplier','require_transport','guard_existing_transport')})})
    tests={}
    for path in sorted((ROOT/'backend/tests').glob('test_*.py')):
        tests[str(path.relative_to(ROOT))]=[n.name for n in ast.walk(ast.parse(path.read_text())) if isinstance(n,ast.FunctionDef) and n.name.startswith('test_')]
    return {'routes':routes,'endpoints':endpoints,'backend_tests':tests,'limits':'Static route access is not authorization for every mutation. Endpoint dependencies and backend tests are authoritative.'}
if __name__=='__main__':
    record=inventory();target=ROOT/'specs/integration/INVENTORY.json';target.write_text(json.dumps(record,indent=2)+'\n')
    print(f"{len(record['routes'])} authenticated routes; {len(record['endpoints'])} endpoint declarations; {sum(map(len,record['backend_tests'].values()))} named backend tests (before parametrization)")
