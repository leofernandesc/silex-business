"""Append-only economic policies. Reading a prior version never mutates a revision."""
from datetime import date, timedelta
from dataclasses import dataclass
from hashlib import sha256
import json
from sqlalchemy import select, func
from . import services as V
from .models import Category, Subcategory, DreMapping, DreDecision, FinanceEntry, Payment
from .dre_policy import BASE_LINES


def fingerprint(value):
    return sha256(json.dumps(value,sort_keys=True,default=str,separators=(',',':')).encode()).hexdigest()


@dataclass(frozen=True)
class MappingWindow:
    record: DreMapping
    valid_from: date
    valid_to: date

    def __getattr__(self,name):
        return getattr(self.record,name)


def mapping_data(row):
    record=row.record if isinstance(row,MappingWindow) else row
    return {**V.data(record),'supersedes_id':record.replaces_id or record.supersedes_id,
            'valid_from':row.valid_from.isoformat(),'valid_to':row.valid_to.isoformat()}


def mapping_policy_data(row):
    # Window borders may be shortened by a future revision without changing the
    # policy applicable to an older fact or invalidating its coverage assertion.
    return {k:v for k,v in mapping_data(row).items() if k not in ('valid_from','valid_to')}


def active_mappings(db, version=None):
    rows=list(db.scalars(select(DreMapping).order_by(DreMapping.id)))
    if version is not None:rows=[r for r in rows if r.id<=version]
    windows=[]
    for row in rows:
        predecessor=row.replaces_id or row.supersedes_id
        remaining=[]
        for old in windows:
            if old.id!=predecessor or row.valid_from>old.valid_to or row.valid_to<old.valid_from:
                remaining.append(old);continue
            if old.valid_from<row.valid_from:
                remaining.append(MappingWindow(old.record,old.valid_from,row.valid_from-timedelta(days=1)))
            if old.valid_to>row.valid_to:
                remaining.append(MappingWindow(old.record,row.valid_to+timedelta(days=1),old.valid_to))
        windows=remaining+[MappingWindow(row,row.valid_from,row.valid_to)]
    return sorted(windows,key=lambda r:(r.target,r.valid_from,r.id))


def economic_policy(source,mapping):
    return {
        'classification':mapping.economic_classification if mapping else source['catalog_classification'],
        'affects_result':mapping.economic_affects_result if mapping and mapping.subcategory_id is not None else source['catalog_affects_result'],
    }


def policy_fingerprint(source,mapping):
    return fingerprint(economic_policy(source,mapping))


def catalog_policy_used(db,category_id,subcategory_id=None):
    query=select(DreMapping.id).where(DreMapping.category_id==category_id)
    if subcategory_id is None:
        if db.scalar(query.limit(1)):return True
    else:
        if db.scalar(query.where(DreMapping.subcategory_id==subcategory_id).limit(1)):return True
        inherited=db.scalar(query.where(DreMapping.subcategory_id.is_(None)).limit(1))
        if inherited and db.scalar(select(FinanceEntry.id).where(FinanceEntry.subcategory_id==subcategory_id).limit(1)):return True
    keys=set(db.scalars(select(DreDecision.source_key)))
    if not keys:return False
    query=select(FinanceEntry).where(FinanceEntry.category_id==category_id)
    if subcategory_id is not None:query=query.where(FinanceEntry.subcategory_id==subcategory_id)
    entries=list(db.scalars(query))
    for e in entries:
        candidates={f'finance_entry:{e.id}:principal',f'sale:{e.sale_id}:principal',f'service_order:{e.service_order_id}:revenue',f'service_order_cost:{e.service_order_cost_id}:principal'}
        if keys&candidates:return True
    identifiers={e.id for e in entries}
    return any(f'payment:{p.id}:{component}' in keys for p in db.scalars(select(Payment).where(Payment.entry_id.in_(identifiers))) for component in ('interest','fine','discount'))


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
    if prior and (prior.target!=target or not any(r.id==prior.id for r in active_mappings(db))):
        V.fail('Revisão anterior inválida',409)
    for row in active_mappings(db):
        if row.target==target and (not prior or row.id!=prior.id) and row.valid_from<=values['valid_to'] and row.valid_to>=values['valid_from']:
            V.fail('Vigências sobrepostas; substitua explicitamente a revisão anterior',409)
    if prior and not any(r.id==prior.id and r.valid_from<=values['valid_from']<=values['valid_to']<=r.valid_to for r in active_mappings(db)):
        V.fail('A revisão deve estar contida em uma vigência ativa do mapeamento anterior',422)
    return target,revision+1,prior
