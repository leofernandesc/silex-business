"""CSV seguro dos relatórios financeiros."""
import csv
import io
from fastapi import Response


def report_csv_response(db,slug,start,end,account_id,category_id,report_result,report_map,supplier_kind=None):
    if slug not in report_map:
        from .services import fail
        fail('Relatório não encontrado',404)
    output=io.StringIO();writer=csv.writer(output,delimiter=';')
    first=report_result(db,slug,start,end,account_id,category_id,1,100,supplier_kind)
    rows=first['items'];total=first['total'];page=2
    while len(rows)<total:
        result=report_result(db,slug,start,end,account_id,category_id,page,100,supplier_kind)
        if not result['items']:break
        rows.extend(result['items']);page+=1
    if not rows:
        rows=[{}]
    fields=list(rows[0])
    writer.writerow(fields)
    for row in rows:
        cells=[]
        for key in fields:
            value=row.get(key)
            if value is None:value=''
            elif key.endswith('_cents'):
                sign='-' if value<0 else '';value=abs(value);value=f'{sign}{value//100},{value%100:02d}'
            elif isinstance(value,(dict,list)):value=''
            else:
                value=str(value)
                if value.lstrip().startswith(('=','+','-','@','\t','\r')):value="'"+value
            cells.append(value)
        writer.writerow(cells)
    return Response('\ufeff'+output.getvalue(),media_type='text/csv; charset=utf-8',headers={'Content-Disposition':f'attachment; filename="financeiro-{slug}.csv"'})
