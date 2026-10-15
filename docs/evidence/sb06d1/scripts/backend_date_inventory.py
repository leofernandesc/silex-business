"""Read-only complementary inventory: contracts, date operations and print/export paths."""
import ast
import json
import os
from pathlib import Path

root=Path(os.environ['SILEX_ROOT']);rows=[]
for path in sorted((root/'backend/app').glob('*.py')):
    text=path.read_text();tree=ast.parse(text);parents={child:node for node in ast.walk(tree) for child in ast.iter_child_nodes(node)}
    for node in ast.walk(tree):
        if not isinstance(node,(ast.Call,ast.AnnAssign)):continue
        expression=ast.get_source_segment(text,node) or ''
        if not any(word in expression for word in ('date','Date','strftime','isoformat','timedelta')):continue
        # Outer calls/functions repeat children; retain boundaries, not complete route bodies.
        if len(expression)>700:continue
        parent=parents.get(node)
        while parent and not isinstance(parent,(ast.FunctionDef,ast.ClassDef)):parent=parents.get(parent)
        rows.append({'file':str(path.relative_to(root)),'line':node.lineno,'owner':getattr(parent,'name','module'),'expression':expression,'action':'audit only; no backend edit','risk':'contract/computation/print; preserve'})
out=Path(os.environ['SILEX_EVIDENCE'])/'backend-date-inventory.json';out.write_text(json.dumps(rows,indent=2));print(len(rows),'backend date boundaries inventoried')
