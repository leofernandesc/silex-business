"""Indicadores, orçamentos e os 26 relatórios financeiros locais."""
from calendar import monthrange
from datetime import date

from fastapi import Depends, Query
from sqlalchemy import and_, case, func, literal, or_, select

from . import schemas as S, services as V
from .financial import require_active
from .models import Account, BankStatementImport, Category, Customer, FinanceEntry, MonthlyBudget, Payment, Subcategory, Supplier

REPORTS=[
 ('cash-daily','Fluxo de caixa diário','payments','posting-day',None),
 ('cash-monthly','Fluxo de caixa mensal','payments','posting-month',None),
 ('result-monthly','Resultado por competência','payments','result-month',None),
 ('income-category','Receitas por categoria','payments','category','income'),
 ('expense-category','Despesas por categoria','payments','category','expense'),
 ('income-subcategory','Receitas por subcategoria','payments','subcategory','income'),
 ('expense-subcategory','Despesas por subcategoria','payments','subcategory','expense'),
 ('income-account','Receitas por conta','payments','account','income'),
 ('expense-account','Despesas por conta','payments','account','expense'),
 ('income-customer','Receitas por cliente','payments','customer','income'),
 ('expense-supplier','Despesas por fornecedor','payments','supplier','expense'),
 ('by-origin','Movimentos por origem','payments','origin',None),
 ('by-method','Movimentos por forma de pagamento','payments','method',None),
 ('receivable-open','Contas a receber em aberto','titles','receivable-open',None),
 ('payable-open','Contas a pagar em aberto','titles','payable-open',None),
 ('receivable-overdue','Contas a receber vencidas','titles','receivable-overdue',None),
 ('payable-overdue','Contas a pagar vencidas','titles','payable-overdue',None),
 ('titles-due','Títulos por vencimento','titles','due',None),
 ('titles-competence','Títulos por competência','titles','competence',None),
 ('settlements-daily','Quitações por dia','payments','posting-day',None),
 ('charges-monthly','Juros e multas por competência','payments','charges-month',None),
 ('discounts-monthly','Descontos por competência','payments','discount-month',None),
 ('partial-payments','Baixas parciais','payments-detail','partial',None),
 ('reversals','Estornos financeiros','payments-detail','reversal',None),
 ('documents','Títulos por documento','titles','document',None),
 ('budget-actual','Orçamento mensal x realizado','budget','budget',None),
]
REPORT_MAP={r[0]:r for r in REPORTS}


def budget_result(db,row,supplier_kind=None):
    lower=date(row.year,row.month,1);upper=date(row.year,row.month,monthrange(row.year,row.month)[1])
    query=select(func.coalesce(func.sum(-Payment.amount_cents),0)).join(FinanceEntry,Payment.entry_id==FinanceEntry.id).where(FinanceEntry.direction=='expense',Payment.competence_date>=lower,Payment.competence_date<=upper,FinanceEntry.category_id==row.category_id)
    if row.subcategory_id: query=query.where(FinanceEntry.subcategory_id==row.subcategory_id)
    if supplier_kind: query=query.where(FinanceEntry.supplier_id.in_(select(Supplier.id).where(Supplier.kind==supplier_kind)))
    actual=max(0,db.scalar(query) or 0)
    return {**V.data(row),'category_name':V.get(db,Category,row.category_id).name,'subcategory_name':V.get(db,Subcategory,row.subcategory_id).name if row.subcategory_id else 'Todas as subcategorias','actual_cents':actual,'remaining_cents':row.target_cents-actual,'percent_used':round(actual*100/row.target_cents,1)}


def rows_page(db,query,page,page_size):
    total=db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    rows=db.execute(query.offset((page-1)*page_size).limit(page_size)).all()
    return {'items':[dict(row._mapping) for row in rows],'total':total,'page':page,'page_size':page_size}


def register(app,get_db,admin):
    DB=Depends(get_db,scope='function');ADMIN=Depends(admin)

    @app.get('/api/finance/reports/catalog')
    def report_catalog(db=DB,user=ADMIN):
        return [{'id':key,'name':name,'source':source,'date_basis':'competence' if group in ('competence','result-month','charges-month','discount-month') else 'posting'} for key,name,source,group,direction in REPORTS]

    @app.get('/api/finance/budgets')
    def budgets(year:int=Query(ge=2000,le=2200),month:int=Query(ge=1,le=12),supplier_kind:str|None=None,db=DB,user=ADMIN):
        if supplier_kind not in (None,'supplier','day_worker','subcontracted_freight'): V.fail('Tipo de beneficiário inválido',422)
        return [budget_result(db,row,supplier_kind) for row in db.scalars(select(MonthlyBudget).where(MonthlyBudget.year==year,MonthlyBudget.month==month,MonthlyBudget.active).order_by(MonthlyBudget.category_id,MonthlyBudget.subcategory_id))]

    @app.post('/api/finance/budgets',status_code=201)
    def save_budget(payload:S.MonthlyBudgetInput,db=DB,user=ADMIN):
        category=require_active(db,Category,payload.category_id)
        if category.direction not in ('both','expense'): V.fail('Orçamento exige categoria de despesa',422)
        if payload.subcategory_id:
            sub=require_active(db,Subcategory,payload.subcategory_id)
            if sub.category_id!=category.id: V.fail('Subcategoria não pertence à categoria',422)
        query=select(MonthlyBudget).where(MonthlyBudget.year==payload.year,MonthlyBudget.month==payload.month,MonthlyBudget.category_id==category.id,MonthlyBudget.subcategory_id==payload.subcategory_id)
        row=db.scalar(query)
        values=payload.model_dump()
        if row:
            for key,value in values.items(): setattr(row,key,value)
            V.audit(db,user,'update','budget',row.id)
        else:
            row=MonthlyBudget(**values,user_id=user.id);db.add(row);db.flush();V.audit(db,user,'create','budget',row.id)
        db.flush();return budget_result(db,row)

    @app.delete('/api/finance/budgets/{identifier}')
    def deactivate_budget(identifier:int,db=DB,user=ADMIN):
        row=V.get(db,MonthlyBudget,identifier);row.active=False;V.audit(db,user,'toggle','budget',row.id);return {'ok':True,'id':row.id}

    @app.get('/api/finance/dashboard')
    def finance_dashboard(start:date|None=None,end:date|None=None,db=DB,user=ADMIN):
        end=end or V.today();start=start or end.replace(day=1)
        if start>end:V.fail('Data inicial deve ser anterior à final',422)
        payments=list(db.scalars(select(Payment).where(Payment.posting_date>=start,Payment.posting_date<=end).order_by(Payment.posting_date,Payment.id)))
        income=sum(max(0,p.amount_cents) for p in payments);expense=sum(max(0,-p.amount_cents) for p in payments)
        accounts=[{**V.data(a),'balance_cents':a.opening_cents+(db.scalar(select(func.coalesce(func.sum(Payment.amount_cents),0)).where(Payment.account_id==a.id)) or 0)} for a in db.scalars(select(Account).order_by(Account.id))]
        titles=list(db.scalars(select(FinanceEntry).where(FinanceEntry.status.in_(['open','partial']))))
        pending=[]
        for row in titles:
            remaining=max(0,row.amount_cents-V.principal_paid(db,row))
            if remaining:pending.append((row,remaining))
        open_income=sum(amount for row,amount in pending if row.direction=='income')
        open_expense=sum(amount for row,amount in pending if row.direction=='expense')
        overdue_income=sum(amount for row,amount in pending if row.direction=='income' and row.due_date<V.today())
        overdue_expense=sum(amount for row,amount in pending if row.direction=='expense' and row.due_date<V.today())
        months=[]
        serial=end.year*12+end.month-1
        for offset in range(11,-1,-1):
            y,m=divmod(serial-offset,12);m+=1;lo=date(y,m,1);hi=date(y,m,monthrange(y,m)[1])
            ps=db.scalars(select(Payment).where(Payment.posting_date>=lo,Payment.posting_date<=hi))
            entries=list(ps);inc=sum(max(0,p.amount_cents) for p in entries);out=sum(max(0,-p.amount_cents) for p in entries)
            months.append({'month':f'{y:04d}-{m:02d}','income_cents':inc,'expense_cents':out,'net_cents':inc-out})
        groups={}
        for p in db.scalars(select(Payment).where(Payment.competence_date>=start,Payment.competence_date<=end)):
            entry=V.get(db,FinanceEntry,p.entry_id);cat=V.get(db,Category,entry.category_id)
            sub=db.get(Subcategory,entry.subcategory_id) if entry.subcategory_id else None
            if sub and not sub.affects_result:continue
            group=(cat.classification,cat.result_group or cat.name,entry.direction)
            values=groups.setdefault(group,{'income_cents':0,'expense_cents':0})
            if entry.direction=='income':values['income_cents']+=p.amount_cents
            else:values['expense_cents']-=p.amount_cents
        result_groups=[{'classification':key[0],'group':key[1],'direction':key[2],**value} for key,value in sorted(groups.items())]
        return {'start':start.isoformat(),'end':end.isoformat(),'income_cents':income,'expense_cents':expense,'net_cents':income-expense,'movement_count':len(payments),'accounts':accounts,'receivable_open_cents':open_income,'payable_open_cents':open_expense,'receivable_overdue_cents':overdue_income,'payable_overdue_cents':overdue_expense,'monthly':months,'result_groups':result_groups,'budget_month':end.strftime('%Y-%m')}

    def payment_report(db,slug,start,end,account_id,category_id,supplier_kind=None):
        _,_,_,group,direction=REPORT_MAP[slug]
        P=Payment;E=FinanceEntry;C=Category;SC=Subcategory;A=Account;CU=Customer;SU=Supplier
        criteria=[]
        date_column=P.competence_date if group in ('competence','result-month','charges-month','discount-month') else P.posting_date
        if start:criteria.append(date_column>=start)
        if end:criteria.append(date_column<=end)
        if account_id:criteria.append(P.account_id==account_id)
        if category_id:criteria.append(E.category_id==category_id)
        if supplier_kind:criteria.append(E.supplier_id.in_(select(SU.id).where(SU.kind==supplier_kind)))
        if direction:criteria.append(E.direction==direction)
        if group=='partial':criteria.append(func.abs(P.principal_cents)<E.amount_cents)
        if group=='reversal':criteria.append(P.reversal_of.is_not(None))
        if group in ('charges-month','discount-month'):
            label=func.substr(P.competence_date,1,7)
        else:
            classification=case((C.classification=='operating','Operacional'),(C.classification=='investment','Investimento'),(C.classification=='financing','Financiamento'),else_=C.classification)
            label={'posting-day':P.posting_date,'posting-month':func.substr(P.posting_date,1,7),'result-month':classification+literal(': ')+func.coalesce(C.result_group,C.name)+literal(' · ')+func.substr(P.competence_date,1,7),'category':C.name,'subcategory':func.coalesce(SC.name,'Geral'),'account':A.name,'customer':func.coalesce(CU.name,'Não informado'),'supplier':func.coalesce(SU.name,'Não informado'),'origin':case((P.reversal_of.is_not(None),'Estorno'),(E.origin=='manual','Manual'),(E.origin=='sale','Venda'),(E.origin=='ofx','OFX'),else_='Quitação de título'),'method':P.method,'partial':E.description,'reversal':E.description}.get(group,P.posting_date)
        if direction:
            incoming=func.coalesce(func.sum(case((E.direction=='income',P.amount_cents),else_=0)),0)
            outgoing=func.coalesce(func.sum(case((E.direction=='expense',-P.amount_cents),else_=0)),0)
        else:
            incoming=func.coalesce(func.sum(case((P.amount_cents>0,P.amount_cents),else_=0)),0)
            outgoing=func.coalesce(func.sum(case((P.amount_cents<0,-P.amount_cents),else_=0)),0)
        interest=func.coalesce(func.sum(P.interest_cents),0);fine=func.coalesce(func.sum(P.fine_cents),0);discount=func.coalesce(func.sum(P.discount_cents),0)
        if group in ('partial','reversal'):
            return select(P.id.label('payment_id'),P.posting_date,P.competence_date,E.description,E.document,E.direction,C.name.label('category_name'),func.coalesce(SC.name,'Geral').label('subcategory_name'),A.name.label('account_name'),P.method,P.amount_cents,P.principal_cents,P.interest_cents,P.fine_cents,P.discount_cents,P.reversal_of).select_from(P).join(E,P.entry_id==E.id).join(C,E.category_id==C.id).outerjoin(SC,E.subcategory_id==SC.id).join(A,P.account_id==A.id).where(*criteria).order_by(P.posting_date.desc(),P.id.desc())
        stmt=select(label.label('group'),incoming.label('income_cents'),outgoing.label('expense_cents'),(incoming-outgoing).label('net_cents'),func.count(P.id).label('count'),interest.label('interest_cents'),fine.label('fine_cents'),discount.label('discount_cents')).select_from(P).join(E,P.entry_id==E.id).join(C,E.category_id==C.id).outerjoin(SC,E.subcategory_id==SC.id).outerjoin(A,P.account_id==A.id).outerjoin(CU,E.customer_id==CU.id).outerjoin(SU,E.supplier_id==SU.id).where(*criteria)
        return stmt.group_by(label).order_by(label)

    def report_result(db,slug,start,end,account_id,category_id,page,page_size,supplier_kind=None):
        if start and end and start>end:V.fail('Data inicial deve ser anterior à final',422)
        if slug not in REPORT_MAP:V.fail('Relatório não encontrado',404)
        key,name,source,group,direction=REPORT_MAP[slug]
        if source=='payments':
            query=payment_report(db,slug,start,end,account_id,category_id,supplier_kind)
            return rows_page(db,query,page,page_size)
        if source=='payments-detail':
            query=payment_report(db,slug,start,end,account_id,category_id,supplier_kind)
            return rows_page(db,query,page,page_size)
        if source=='budget':
            q=select(MonthlyBudget).where(MonthlyBudget.active)
            if start:q=q.where(or_(MonthlyBudget.year>start.year,and_(MonthlyBudget.year==start.year,MonthlyBudget.month>=start.month)))
            if end:q=q.where(or_(MonthlyBudget.year<end.year,and_(MonthlyBudget.year==end.year,MonthlyBudget.month<=end.month)))
            if category_id:q=q.where(MonthlyBudget.category_id==category_id)
            query=q.order_by(MonthlyBudget.year.desc(),MonthlyBudget.month.desc(),MonthlyBudget.category_id)
            return V.page(db,query,page,page_size,lambda row:budget_result(db,row,supplier_kind))
        q=select(FinanceEntry).order_by(FinanceEntry.due_date,FinanceEntry.id)
        if direction:q=q.where(FinanceEntry.direction==direction)
        if group in ('receivable-open','payable-open','receivable-overdue','payable-overdue'):
            q=q.where(FinanceEntry.status.in_(['open','partial']))
            if group.startswith('receivable'):q=q.where(FinanceEntry.direction=='income')
            else:q=q.where(FinanceEntry.direction=='expense')
            if group.endswith('overdue'):q=q.where(FinanceEntry.due_date<V.today())
            if start:q=q.where(FinanceEntry.due_date>=start)
            if end:q=q.where(FinanceEntry.due_date<=end)
        elif group=='due':
            if start:q=q.where(FinanceEntry.due_date>=start)
            if end:q=q.where(FinanceEntry.due_date<=end)
        elif group=='competence':
            if start:q=q.where(FinanceEntry.competence_date>=start)
            if end:q=q.where(FinanceEntry.competence_date<=end)
        elif group=='document':q=q.where(FinanceEntry.document!='')
        if account_id:q=q.where(FinanceEntry.account_id==account_id)
        if category_id:q=q.where(FinanceEntry.category_id==category_id)
        if supplier_kind:q=q.where(FinanceEntry.supplier_id.in_(select(Supplier.id).where(Supplier.kind==supplier_kind)))
        return V.page(db,q,page,page_size,lambda row:V.finance_data(db,row))

    @app.get('/api/finance/reports/{slug}.csv')
    def finance_report_csv(slug:str,start:date|None=None,end:date|None=None,account_id:int|None=None,category_id:int|None=None,supplier_kind:str|None=None,db=DB,user=ADMIN):
        from .report_exports import report_csv_response
        return report_csv_response(db,slug,start,end,account_id,category_id,report_result,REPORT_MAP,supplier_kind)

    @app.get('/api/finance/reports/{slug}')
    def finance_report(slug:str,start:date|None=None,end:date|None=None,account_id:int|None=None,category_id:int|None=None,supplier_kind:str|None=None,page:int=Query(1,ge=1,le=1_000_000),page_size:int=Query(20,ge=1,le=100),db=DB,user=ADMIN):
        if start and end and start>end:V.fail('Data inicial deve ser anterior à final',422)
        result=report_result(db,slug,start,end,account_id,category_id,page,page_size,supplier_kind)
        return {'id':slug,'name':REPORT_MAP[slug][1],**result}



def planned_report_count():return len(REPORTS)
