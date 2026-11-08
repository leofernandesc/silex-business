"""Append-only economic policies. Reading a prior version never mutates a revision."""
from datetime import date
from hashlib import sha256
import json
from sqlalchemy import select, func
from . import services as V
from .models import Category, Subcategory, DreMapping
from .dre_policy import BASE_LINES


def fingerprint(value):
    return sha256(json.dumps(value,sort_keys=True,default=str,separators=(',',':')).encode()).hexdigest()


def active_mappings(db, version=None):
    rows=list(db.scalars(select(DreMapping).order_by(DreMapping.id)))
    if version is not None:rows=[r for r in rows if r.id<=version]
    retired={r.supersedes_id for r in rows if r.supersedes_id is not None}
    return [r for r in rows if r.id not in retired]


def mapping_at(rows, category_id, subcategory_id, economic_date):
    for sub in ([subcategory_id,None] if subcategory_id is not None else [None]):
        matches=[r for r in rows if r.category_id==category_id and r.subcategory_id==sub and r.valid_from<=economic_date<=r.valid_to]
        if len(matches)>1:V.fail('Vigências DRE inconsistentes; revise o histórico',409)
        if matches:return matches[0]
    return None


def validate_mapping(db, values):
    V.get(db,Category,values['category_id'])
    sub=values.get('subcategory_id')
    if sub is not None and V.get(db,Subcategory,sub).category_id!=values['category_id']:
        V.fail('Subcategoria não pertence à categoria',422)
    if values['line_code'] not in (*BASE_LINES,'outside_dre'):V.fail('Rubrica DRE inválida',422)
    if values['valid_from']>values['valid_to']:V.fail('Vigência inválida',422)
    target=f"category:{values['category_id']}:subcategory:{sub or 0}"
    revision=db.scalar(select(func.max(DreMapping.revision)).where(DreMapping.target==target)) or 0
    if values['expected_revision']!=revision:V.fail('Mapeamento alterado; refaça a prévia',409)
    prior=V.get(db,DreMapping,values['supersedes_id']) if values.get('supersedes_id') else None
    if prior and (prior.target!=target or prior not in active_mappings(db)):
        V.fail('Revisão anterior inválida',409)
    for row in active_mappings(db):
        if row.target==target and (not prior or row.id!=prior.id) and row.valid_from<=values['valid_to'] and row.valid_to>=values['valid_from']:
            V.fail('Vigências sobrepostas; substitua explicitamente a revisão anterior',409)
    if prior and (prior.valid_from!=values['valid_from'] or prior.valid_to!=values['valid_to']):
        V.fail('Substituição deve preservar o intervalo anterior; separe vigências por nova revisão supervisionada',422)
    return target,revision+1,prior
