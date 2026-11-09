"""Batch read of canonical economic sources. No financial writes or inferred payments."""
from collections import defaultdict
from datetime import timezone
from sqlalchemy import select
from . import services as V
from .capabilities import has_transport
from .models import FinanceEntry,Payment,Sale,SaleItem,Product,ServiceOrder,ServiceOrderCost,Supplier,Category,Subcategory
from .dre_history import fingerprint


def sources(db,user):
    categories={r.id:r for r in db.scalars(select(Category))}
    subcategories={r.id:r for r in db.scalars(select(Subcategory))}
    entries=list(db.scalars(select(FinanceEntry).order_by(FinanceEntry.id)))
    sales={r.id:r for r in db.scalars(select(Sale))}
    orders={r.id:r for r in db.scalars(select(ServiceOrder))}
    costs={r.id:r for r in db.scalars(select(ServiceOrderCost))}
    suppliers={r.id:r for r in db.scalars(select(Supplier))}
    products={r.id:r for r in db.scalars(select(Product))}
    sale_items=defaultdict(list)
    for r in db.scalars(select(SaleItem)):sale_items[r.sale_id].append(r)
    restricted_orders={c.service_order_id for c in costs.values() if c.kind=='subcontracted_freight' and (not has_transport(user) or orders[c.service_order_id].user_id!=user.id)}
    entry_sale_ids={e.sale_id for e in entries if e.sale_id}
    entry_cost_ids={e.service_order_cost_id for e in entries if e.service_order_cost_id}
    entry_revenue_orders={e.service_order_id for e in entries if e.service_order_id and e.direction=='income'}
    grouped=defaultdict(list); output=[]; restricted=False
    for entry in entries:
        supplier=suppliers.get(entry.supplier_id)
        hidden=entry.service_order_id in restricted_orders or (supplier and supplier.kind=='subcontracted_freight' and (not has_transport(user) or entry.user_id!=user.id))
        if hidden:restricted=True;continue
        key=f'sale:{entry.sale_id}:principal' if entry.sale_id else f'service_order_cost:{entry.service_order_cost_id}:principal' if entry.service_order_cost_id else f'service_order:{entry.service_order_id}:revenue' if entry.service_order_id and entry.direction=='income' else f'finance_entry:{entry.id}:principal'
        grouped[key].append(entry)
    for key,group in grouped.items():
        entry=group[0];kind,identifier,component=key.split(':');identifier=int(identifier)
        issues=[];automatic=False;amount=entry.amount_cents;economic_date=None
        if len(group)>1:issues.append('duplicate_documents')
        if kind=='sale':
            sale=sales.get(identifier)
            if sale is None or not sale.finalized_at:issues.append('sale_not_finalized')
            else:
                economic_date=sale.finalized_at.replace(tzinfo=timezone.utc).astimezone(V.TZ).date()
                items=sale_items[identifier]
                if not items or sum(i.total_cents for i in items)-sale.discount_cents!=sale.total_cents:issues.append('sale_values_unreconciled')
                if any(products.get(i.product_id) is None or products[i.product_id].kind!='product' for i in items):issues.append('delivery_confirmation_required')
                automatic=not issues
                amount=sale.total_cents
                if amount!=entry.amount_cents:issues.append('sale_title_mismatch')
        elif kind=='service_order':
            order=orders.get(identifier)
            if not order or order.status not in ('completed','canceled'):issues.append('service_not_completed')
            economic_date=getattr(order,'completed_on',None) if order else None
            if economic_date is None:issues.append('completion_evidence_required')
            if order and order.negotiated_cents!=amount:issues.append('service_title_mismatch')
            automatic=not issues
        elif kind=='service_order_cost':
            if identifier not in costs:issues.append('missing_operational_cost')
            else:
                if costs[identifier].agreed_amount_cents!=amount:issues.append('cost_title_mismatch')
                if suppliers.get(costs[identifier].supplier_id) is None or suppliers[costs[identifier].supplier_id].kind!=costs[identifier].kind:issues.append('supplier_kind_mismatch')
                economic_date=costs[identifier].incurred_on
                automatic=economic_date is not None
        output.append({'key':key,'source_type':kind,'source_id':identifier,'component':component,'entry_ids':[e.id for e in group],
                       'category_id':entry.category_id,'subcategory_id':entry.subcategory_id,'amount_cents':amount,
                       'candidate_date':entry.competence_date,'economic_date':economic_date,'automatic':automatic,'issues':issues,
                       'direction':entry.direction,'commercial_discount_cents':sales[identifier].discount_cents if kind=='sale' and identifier in sales else 0, 'canceled_on':entry.canceled_at.replace(tzinfo=timezone.utc).astimezone(V.TZ).date() if entry.canceled_at else None, 'cancellation_fingerprint':fingerprint({'source_key':key,'canceled_at':entry.canceled_at,'entry_ids':[e.id for e in group]}) if entry.canceled_at else None})
    entries_by_id={e.id:e for e in entries}
    visible_entries={i for src in output for i in src['entry_ids']}
    for payment in db.scalars(select(Payment)):
        if payment.entry_id not in visible_entries:continue
        entry=entries_by_id[payment.entry_id]
        sign=1 if entry.direction=='income' else -1
        for component in ('interest','fine','discount'):
            amount=getattr(payment,component+'_cents')*sign
            if amount:
                output.append({'key':f'payment:{payment.id}:{component}','source_type':'payment','source_id':payment.id,'component':component,'entry_ids':[entry.id],
                               'category_id':entry.category_id,'subcategory_id':entry.subcategory_id,'amount_cents':amount,'candidate_date':payment.posting_date,
                               'economic_date':None,'automatic':False,'issues':[],'direction':entry.direction,'commercial_discount_cents':0})
    for order in orders.values():
        if order.id in restricted_orders:restricted=True;continue
        if order.status=='completed' and order.id not in entry_revenue_orders:
            output.append({'key':f'service_order:{order.id}:revenue','source_type':'service_order','source_id':order.id,'component':'revenue','entry_ids':[],
                           'category_id':None,'subcategory_id':None,'amount_cents':order.negotiated_cents,'candidate_date':getattr(order,'completed_on',None) or order.service_date,
                           'economic_date':None,'automatic':False,'issues':['titles_required'],'direction':'income','commercial_discount_cents':0})
    for sale in sales.values():
        if sale.finalized_at and sale.id not in entry_sale_ids:
            when=sale.finalized_at.replace(tzinfo=timezone.utc).astimezone(V.TZ).date()
            output.append({'key':f'sale:{sale.id}:principal','source_type':'sale','source_id':sale.id,'component':'principal','entry_ids':[],
                           'category_id':None,'subcategory_id':None,'amount_cents':sale.total_cents,'candidate_date':when,'economic_date':None,
                           'automatic':False,'issues':['titles_required'],'direction':'income','commercial_discount_cents':sale.discount_cents})
    for cost in costs.values():
        order=orders.get(cost.service_order_id)
        if order is None or order.status!='completed' or cost.id in entry_cost_ids:continue
        if cost.service_order_id in restricted_orders:restricted=True;continue
        output.append({'key':f'service_order_cost:{cost.id}:principal','source_type':'service_order_cost','source_id':cost.id,'component':'principal','entry_ids':[],
                       'category_id':None,'subcategory_id':None,'amount_cents':cost.agreed_amount_cents,'candidate_date':getattr(order,'completed_on',None) or order.service_date,
                       'economic_date':None,'automatic':False,'issues':['cost_title_required'],'direction':'expense','commercial_discount_cents':0})
    for item in output:
        if item['source_type']=='sale':origin={'route':'sales','id':item['source_id']}
        elif item['source_type']=='service_order':origin={'route':'service-orders','id':item['source_id']}
        elif item['source_type']=='service_order_cost':origin={'route':'service-orders','id':costs[item['source_id']].service_order_id}
        else:origin={'route':'finance-receivable' if item['direction']=='income' else 'finance-payable','id':item['entry_ids'][0]}
        item['catalog_classification']=categories[item['category_id']].classification if item['category_id'] in categories else None
        item['catalog_affects_result']=subcategories[item['subcategory_id']].affects_result if item['subcategory_id'] in subcategories else True
        item['origin']=origin
        item['fingerprint']=fingerprint({k:v for k,v in item.items() if k not in ('candidate_date','canceled_on','cancellation_fingerprint','origin')})
    return output,restricted
