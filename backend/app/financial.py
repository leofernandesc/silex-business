"""Livro caixa efetivo e cadastros financeiros (Sprint 8)."""
import csv
import base64
import binascii
import hashlib
import io
import json
import re
from urllib.parse import quote, unquote
from pathlib import PurePosixPath
from datetime import date
from typing import Literal

from fastapi import Depends, Query, Request, Response
from sqlalchemy import case, exists, func, literal, or_, select

from . import schemas as S, services as V
from .models import Account, Attachment, BankStatementImport, BankStatementItem, Category, FinanceEntry, Payment, Subcategory, Supplier


def account_data(db, row):
    return {**V.data(row), 'balance_cents': row.opening_cents + db.scalar(select(func.coalesce(func.sum(Payment.amount_cents), 0)).where(Payment.account_id == row.id))}


def require_active(db, model, identifier):
    row = V.get(db, model, identifier)
    if not row.active:
        V.fail('Cadastro inativo: ' + row.name)
    return row


def register(app, get_db, admin):
    DB = Depends(get_db, scope='function')
    ADMIN = Depends(admin)

    @app.put('/api/accounts/{identifier}')
    def edit_account(identifier: int, payload: S.AccountInput, db=DB, user=ADMIN):
        row = V.get(db, Account, identifier)
        values = payload.model_dump()
        values['opening_date'] = payload.opening_date or row.opening_date
        validate_account(values)
        if db.scalar(select(Payment.id).where(Payment.account_id == identifier).limit(1)) or db.scalar(select(FinanceEntry.id).where(FinanceEntry.account_id == identifier).limit(1)):
            if any(values[n] != getattr(row,n) for n in ('kind','opening_cents','opening_date')):
                V.fail('Conta com histórico: tipo, saldo inicial e referência não podem ser alterados')
        for key,value in values.items():
            setattr(row,key,value)
        V.audit(db,user,'update','account',row.id)
        db.flush()
        return account_data(db,row)

    @app.put('/api/categories/{identifier}')
    def edit_category(identifier: int, payload: S.CategoryInput, db=DB, user=ADMIN):
        row = V.get(db,Category,identifier)
        if row.direction != payload.direction and db.scalar(select(FinanceEntry.id).where(FinanceEntry.category_id == identifier).limit(1)):
            V.fail('Categoria com histórico: tipo de receita/despesa não pode ser alterado')
        for key,value in payload.model_dump().items():
            setattr(row,key,value)
        V.audit(db,user,'update','category',row.id)
        db.flush()
        return V.data(row)

    from .ofx import parse_ofx

    def statement_data(db, statement, include_items=True):
        rows=list(db.scalars(select(BankStatementItem).where(BankStatementItem.import_id==statement.id).order_by(BankStatementItem.posted_date,BankStatementItem.id)))
        pending=sum(row.status=='pending' for row in rows)
        derived_status='preview' if pending else 'complete'
        result={**V.data(statement),'status':derived_status,'account_name':V.get(db,Account,statement.account_id).name,'count':len(rows),'pending':pending,'duplicates':sum(row.status=='duplicate' for row in rows)}
        if include_items:
            result['items']=[{**V.data(row),'matched_description':V.get(db,FinanceEntry,row.matched_entry_id).description if row.matched_entry_id else None} for row in rows]
        return result

    @app.get('/api/finance/ofx/imports')
    def list_ofx_imports(page:int=Query(1,ge=1,le=1_000_000),page_size:int=Query(20,ge=1,le=100),db=DB,user=ADMIN):
        return V.page(db,select(BankStatementImport).order_by(BankStatementImport.id.desc()),page,page_size,lambda row:statement_data(db,row,False))

    @app.post('/api/finance/ofx/imports',status_code=201)
    async def import_ofx(account_id:int,request:Request,db=DB,user=ADMIN):
        account=require_active(db,Account,account_id)
        if account.kind!='bank': V.fail('Importe OFX somente em conta bancária',422)
        length=request.headers.get('content-length')
        if length:
            try: declared_length=int(length)
            except ValueError: V.fail('Tamanho de arquivo inválido',400)
            if declared_length<0: V.fail('Tamanho de arquivo inválido',400)
            if declared_length>10*1024*1024: V.fail('Arquivo OFX excede 10 MB',413)
        raw=await request.body()
        if len(raw)>10*1024*1024: V.fail('Arquivo OFX excede 10 MB',413)
        transactions=parse_ofx(raw,V.today())
        name=unquote(request.headers.get('x-statement-name','extrato.ofx')).replace('\\','/')
        name=PurePosixPath(name).name
        name=''.join(c for c in name if c.isprintable()).strip()[:180] or 'extrato.ofx'
        digest=hashlib.sha256(raw).hexdigest()
        statement=BankStatementImport(account_id=account.id,user_id=user.id,original_name=name,sha256=digest,status='preview')
        db.add(statement);db.flush()
        for item in transactions:
            previous=db.scalar(select(BankStatementItem).join(BankStatementImport,BankStatementItem.import_id==BankStatementImport.id).where(BankStatementImport.account_id==account.id,BankStatementItem.fitid==item['fitid']).order_by(BankStatementItem.id).limit(1))
            row=BankStatementItem(import_id=statement.id,**item,status='duplicate' if previous else 'pending',duplicate_of_id=previous.id if previous else None)
            db.add(row)
        db.flush()
        if not any(row.status=='pending' for row in db.scalars(select(BankStatementItem).where(BankStatementItem.import_id==statement.id))): statement.status='complete'
        V.audit(db,user,'import','ofx',statement.id)
        return statement_data(db,statement)

    @app.get('/api/finance/ofx/imports/{identifier}')
    def ofx_detail(identifier:int,db=DB,user=ADMIN):
        return statement_data(db,V.get(db,BankStatementImport,identifier))

    @app.get('/api/finance/ofx/imports/{import_id}/items/{item_id}/suggestions')
    def ofx_suggestions(import_id:int,item_id:int,db=DB,user=ADMIN):
        statement=V.get(db,BankStatementImport,import_id);item=V.get(db,BankStatementItem,item_id)
        if item.import_id!=statement.id: V.fail('Transação não pertence a este extrato',404)
        if item.status!='pending': return []
        direction='income' if item.amount_cents>0 else 'expense'
        candidates=[]
        for entry in db.scalars(select(FinanceEntry).where(FinanceEntry.direction==direction,FinanceEntry.status.in_(['open','partial'])).order_by(FinanceEntry.due_date,FinanceEntry.id).limit(1000)):
            remaining=entry.amount_cents-V.principal_paid(db,entry)
            candidates.append({'entry':V.finance_data(db,entry),'difference_cents':abs(remaining-abs(item.amount_cents)),'same_date':entry.due_date==item.posted_date})
        candidates.sort(key=lambda c:(c['difference_cents'],not c['same_date'],c['entry']['due_date']))
        return candidates[:10]

    @app.post('/api/finance/ofx/imports/{import_id}/items/{item_id}/confirm')
    def confirm_ofx(import_id:int,item_id:int,payload:S.OfxConfirm,db=DB,user=ADMIN):
        statement=V.get(db,BankStatementImport,import_id);item=V.get(db,BankStatementItem,item_id)
        if item.import_id!=statement.id: V.fail('Transação não pertence a este extrato',404)
        fingerprint=hashlib.sha256(json.dumps(payload.model_dump(mode='json'),sort_keys=True).encode()).hexdigest()
        if item.status in ('posted','matched','ignored'):
            if item.resolution_hash!=fingerprint: V.fail('Esta transação OFX já foi resolvida')
            return statement_data(db,statement)
        if item.status=='duplicate': V.fail('FITID já existe neste histórico; transação mantida como duplicada')
        if payload.ignore:
            item.status='ignored';item.resolution_hash=fingerprint
        else:
            account=require_active(db,Account,statement.account_id)
            if payload.create_title:
                if payload.entry_id: V.fail('Escolha conciliar um título ou criar outro lançamento',422)
                if not payload.category_id or not payload.subcategory_id: V.fail('Novo lançamento exige categoria e subcategoria',422)
                category=require_active(db,Category,payload.category_id);subcategory=require_active(db,Subcategory,payload.subcategory_id)
                if subcategory.category_id!=category.id: V.fail('Subcategoria não pertence à categoria',422)
                direction='income' if item.amount_cents>0 else 'expense'
                if category.direction not in ('both',direction): V.fail('Categoria incompatível com o movimento',422)
                if direction=='income' and payload.supplier_id is not None or direction=='expense' and payload.customer_id is not None:
                    V.fail('Cliente é usado em receitas e fornecedor em despesas',422)
                if payload.customer_id: V.active_customer(db,payload.customer_id)
                if payload.supplier_id: require_active(db,Supplier,payload.supplier_id)
                title=FinanceEntry(description=(item.name or item.memo or f'Movimento OFX {item.fitid}')[:180],direction=direction,amount_cents=abs(item.amount_cents),account_id=account.id,category_id=category.id,subcategory_id=subcategory.id,customer_id=payload.customer_id,supplier_id=payload.supplier_id,origin='ofx',document=item.fitid[:100],competence_date=item.posted_date,due_date=item.posted_date,user_id=user.id)
                db.add(title);db.flush();V.settle_entry(db,title,'ofx',account,user,item.posted_date,principal_cents=abs(item.amount_cents),request_key=f"ofx-{import_id}-{hashlib.sha256(item.fitid.encode()).hexdigest()}",request_hash=fingerprint)
                item.matched_entry_id=title.id
            else:
                if not payload.entry_id: V.fail('Selecione um título pendente ou marque criar novo lançamento',422)
                title=V.get(db,FinanceEntry,payload.entry_id)
                if title.direction!=('income' if item.amount_cents>0 else 'expense'): V.fail('Tipo do título não corresponde ao sinal do extrato',422)
                if title.status not in ('open','partial'): V.fail('Título não está pendente')
                V.settle_entry(db,title,'ofx',account,user,item.posted_date,principal_cents=payload.principal_cents,interest_cents=payload.interest_cents,fine_cents=payload.fine_cents,discount_cents=payload.discount_cents,request_key=f"ofx-{import_id}-{hashlib.sha256(item.fitid.encode()).hexdigest()}",request_hash=fingerprint)
                payment=db.scalar(select(Payment).where(Payment.request_key==f"ofx-{import_id}-{hashlib.sha256(item.fitid.encode()).hexdigest()}"))
                if abs(payment.amount_cents)!=abs(item.amount_cents): V.fail('Valor líquido da baixa não corresponde ao extrato',422)
                item.matched_entry_id=title.id
            payment=db.scalar(select(Payment).where(Payment.request_key==f"ofx-{import_id}-{hashlib.sha256(item.fitid.encode()).hexdigest()}"))
            item.payment_id=payment.id;item.status='matched' if payload.entry_id else 'posted';item.resolution_hash=fingerprint
            V.audit(db,user,'reconcile','ofx_item',item.id)
        if not db.scalar(select(BankStatementItem.id).where(BankStatementItem.import_id==statement.id,BankStatementItem.status=='pending')): statement.status='complete'
        db.flush()
        return statement_data(db,statement)

    @app.get('/api/subcategories')
    def subcategories(db=DB, user=ADMIN):
        return [{**V.data(row),'category_name': V.get(db,Category,row.category_id).name} for row in db.scalars(select(Subcategory).order_by(Subcategory.id))]

    @app.post('/api/subcategories',status_code=201)
    def create_subcategory(payload: S.SubcategoryInput,db=DB,user=ADMIN):
        require_active(db,Category,payload.category_id)
        row=Subcategory(**payload.model_dump())
        db.add(row); db.flush()
        V.audit(db,user,'create','subcategory',row.id)
        return V.data(row)

    @app.put('/api/subcategories/{identifier}')
    def edit_subcategory(identifier:int,payload:S.SubcategoryInput,db=DB,user=ADMIN):
        row=V.get(db,Subcategory,identifier)
        if payload.category_id != row.category_id:
            require_active(db,Category,payload.category_id)
            if db.scalar(select(FinanceEntry.id).where(FinanceEntry.subcategory_id == identifier).limit(1)):
                V.fail('Subcategoria com histórico não pode mudar de categoria')
        for key,value in payload.model_dump().items():
            setattr(row,key,value)
        db.flush(); V.audit(db,user,'update','subcategory',row.id)
        return V.data(row)

    @app.get('/api/suppliers')
    def suppliers(q:str='',active:bool|None=None,kind:Literal['supplier','day_worker','subcontracted_freight']|None=None,search_field:str='all',page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),db=DB,user=ADMIN):
        query=select(Supplier).order_by(Supplier.id.desc())
        if q:
            fields={'name':Supplier.name,'document':Supplier.document,'phone':Supplier.phone,'email':Supplier.email,'contact':Supplier.contact_name,'address':Supplier.city,'pix':Supplier.pix_key}
            if search_field=='all':query=query.where(or_(*(column.contains(q,autoescape=True) for column in fields.values())))
            elif search_field in fields:query=query.where(fields[search_field].contains(q,autoescape=True))
            else:V.fail('Campo de busca inválido',422)
        if kind is not None:
            query=query.where(Supplier.kind == kind)
        if active is not None:
            query=query.where(Supplier.active == active)
        return V.page(db,query,page,page_size)

    @app.post('/api/suppliers',status_code=201)
    def create_supplier(payload:S.SupplierInput,db=DB,user=ADMIN):
        row=Supplier(**payload.model_dump()); db.add(row); db.flush()
        V.audit(db,user,'create','supplier',row.id)
        return V.data(row)

    @app.put('/api/suppliers/{identifier}')
    def edit_supplier(identifier:int,payload:S.SupplierInput,db=DB,user=ADMIN):
        row=V.get(db,Supplier,identifier)
        if row.kind != payload.kind and db.scalar(select(FinanceEntry.id).where(FinanceEntry.supplier_id == identifier).limit(1)):
            V.fail('Beneficiário com histórico financeiro não pode mudar de tipo')
        for key,value in payload.model_dump().items():
            setattr(row,key,value)
        db.flush(); V.audit(db,user,'update','supplier',row.id)
        return V.data(row)

    origin = case((Payment.reversal_of.is_not(None),'reversal'),else_=FinanceEntry.origin)

    def movement_query(q,search_field,direction,account_id,origin_filter,has_attachment,start,end,date_field):
        query=select(Payment).join(FinanceEntry).order_by(Payment.posting_date.desc(),Payment.id.desc())
        if start and end and start > end:
            V.fail('Data inicial deve ser anterior à final',422)
        column=Payment.posting_date if date_field == 'posting' else Payment.competence_date
        if start: query=query.where(column >= start)
        if end: query=query.where(column <= end)
        if q: query=query.where((FinanceEntry.document if search_field == 'document' else FinanceEntry.description).contains(q,autoescape=True))
        if direction: query=query.where(Payment.amount_cents > 0 if direction == 'income' else Payment.amount_cents < 0)
        if account_id: query=query.where(Payment.account_id == account_id)
        if origin_filter: query=query.where(origin == origin_filter)
        proof=or_(exists(select(Attachment.id).where(Attachment.payment_id==Payment.id)),exists(select(Attachment.id).where(Attachment.finance_entry_id==FinanceEntry.id)))
        if has_attachment is True: query=query.where(proof)
        elif has_attachment is False: query=query.where(~proof)
        return query

    def movement_data(db,payment):
        entry=V.get(db,FinanceEntry,payment.entry_id)
        has_attachment=bool(db.scalar(select(Attachment.id).where(or_(Attachment.payment_id==payment.id,Attachment.finance_entry_id==entry.id)).limit(1)))
        return {**V.data(payment),'description':entry.description,'document':entry.document,'direction':'income' if payment.amount_cents>0 else 'expense','account_name':V.get(db,Account,payment.account_id).name,'category_name':V.get(db,Category,entry.category_id).name,'subcategory_name':V.get(db,Subcategory,entry.subcategory_id).name if entry.subcategory_id else 'Geral','origin':'reversal' if payment.reversal_of else entry.origin,'sale_id':entry.sale_id,'entry_status':entry.status,'has_attachment':has_attachment,'supplier_name':V.get(db,Supplier,entry.supplier_id).name if entry.supplier_id else None}

    def filter_dependency(q:str='',search_field:Literal['history','document']='history',direction:Literal['income','expense']|None=None,account_id:int|None=None,origin:Literal['manual','title','sale','ofx','reversal']|None=None,has_attachment:bool|None=None,start:date|None=None,end:date|None=None,date_field:Literal['posting','competence']='posting'):
        return movement_query(q,search_field,direction,account_id,origin,has_attachment,start,end,date_field)

    @app.get('/api/finance/movements')
    def movements(query=Depends(filter_dependency),page:int=Query(1,ge=1,le=1_000_000),page_size:int=Query(20,ge=1,le=100),db=DB,user=ADMIN):
        result=V.page(db,query,page,page_size,lambda p:movement_data(db,p))
        filtered=query.order_by(None).subquery()
        totals=db.execute(select(func.coalesce(func.sum(case((filtered.c.amount_cents>0,filtered.c.amount_cents),else_=0)),0),func.coalesce(func.sum(case((filtered.c.amount_cents<0,-filtered.c.amount_cents),else_=0)),0)).select_from(filtered)).one()
        result['summary']={'income_cents':totals[0],'expense_cents':totals[1],'net_cents':totals[0]-totals[1],'count':result['total']}
        return result

    @app.post('/api/finance/movements',status_code=201)
    def create_movement(payload:S.MovementInput,db=DB,user=ADMIN):
        values=payload.model_dump(mode='json')
        fingerprint=hashlib.sha256(json.dumps(values,sort_keys=True).encode()).hexdigest()
        previous=db.scalar(select(FinanceEntry).where(FinanceEntry.request_key == payload.request_key))
        if previous:
            if previous.request_hash != fingerprint:
                V.fail('Chave de lançamento já utilizada com outros dados')
            payment=db.scalar(select(Payment).where(Payment.entry_id == previous.id,Payment.reversal_of.is_(None)))
            return movement_data(db,payment)
        account=require_active(db,Account,payload.account_id)
        subcategory=require_active(db,Subcategory,payload.subcategory_id)
        category=require_active(db,Category,subcategory.category_id)
        if category.direction not in ('both',payload.direction):
            V.fail('Categoria incompatível com o tipo do lançamento',422)
        if payload.supplier_id:
            require_active(db,Supplier,payload.supplier_id)
            if payload.direction != 'expense': V.fail('Fornecedor é usado em despesas',422)
        entry=FinanceEntry(description=payload.description,direction=payload.direction,amount_cents=payload.amount_cents,account_id=account.id,category_id=category.id,subcategory_id=subcategory.id,supplier_id=payload.supplier_id,competence_date=payload.competence_date,document=payload.document,origin='manual',user_id=user.id,due_date=payload.posting_date,request_key=payload.request_key,request_hash=fingerprint)
        db.add(entry); db.flush()
        V.settle_entry(db,entry,payload.method,account,user,payload.posting_date)
        V.audit(db,user,'create','movement',entry.id)
        payment=db.scalar(select(Payment).where(Payment.entry_id == entry.id))
        return movement_data(db,payment)


    def save_attachment(db,user,payload,entry=None,payment=None):
        name=payload.filename.replace('\\','/').split('/')[-1]
        name=''.join(ch for ch in name if ch.isprintable()).strip()[:180]
        suffix=name.rsplit('.',1)[-1].lower() if '.' in name else ''
        allowed={
            'pdf':('application/pdf',lambda b:b.startswith(b'%PDF-')),
            'png':('image/png',lambda b:b.startswith(b'\x89PNG\r\n\x1a\n')),
            'jpg':('image/jpeg',lambda b:b.startswith(b'\xff\xd8\xff')),
            'jpeg':('image/jpeg',lambda b:b.startswith(b'\xff\xd8\xff')),
            'webp':('image/webp',lambda b:len(b)>12 and b.startswith(b'RIFF') and b[8:12]==b'WEBP'),
            'gif':('image/gif',lambda b:b.startswith((b'GIF87a',b'GIF89a'))),
            'bmp':('image/bmp',lambda b:b.startswith(b'BM')),
            'doc':('application/msword',lambda b:b.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1')),
            'docx':('application/vnd.openxmlformats-officedocument.wordprocessingml.document',lambda b:b.startswith(b'PK\x03\x04')),
        }
        if suffix not in allowed or payload.content_type.split(';')[0].strip().lower() != allowed.get(suffix,('',None))[0]:
            V.fail('Tipo de arquivo inválido. Use PDF, imagem, DOC ou DOCX.',422)
        try: content=base64.b64decode(payload.content_base64,validate=True)
        except (binascii.Error,ValueError): V.fail('Arquivo codificado inválido',422)
        if not content or len(content)>5*1024*1024 or not allowed[suffix][1](content):
            V.fail('Arquivo excede 5 MB ou não corresponde ao tipo informado',422)
        digest=hashlib.sha256(content).hexdigest()
        scope={'finance_entry_id':entry.id} if entry else {'payment_id':payment.id}
        prior=db.scalar(select(Attachment).filter_by(**scope,sha256=digest))
        if prior: return {k:v for k,v in V.data(prior).items() if k!='content'}
        if db.scalar(select(func.count(Attachment.id)).filter_by(**scope))>=3:
            V.fail('Limite de três comprovantes por título ou pagamento')
        row=Attachment(**scope,original_name=name,media_type=allowed[suffix][0],size_bytes=len(content),sha256=digest,content=content,user_id=user.id)
        db.add(row);db.flush();V.audit(db,user,'attach','finance_entry' if entry else 'payment',entry.id if entry else payment.id)
        return {k:v for k,v in V.data(row).items() if k!='content'}

    @app.post('/api/finance/{identifier}/attachments',status_code=201)
    def add_entry_attachment(identifier:int,payload:S.AttachmentInput,db=DB,user=ADMIN):
        return save_attachment(db,user,payload,entry=V.get(db,FinanceEntry,identifier))

    @app.post('/api/finance/payments/{identifier}/attachments',status_code=201)
    def add_payment_attachment(identifier:int,payload:S.AttachmentInput,db=DB,user=ADMIN):
        return save_attachment(db,user,payload,payment=V.get(db,Payment,identifier))

    @app.get('/api/finance/attachments/{identifier}')
    def download_attachment(identifier:int,db=DB,user=ADMIN):
        row=V.get(db,Attachment,identifier)
        return Response(row.content,media_type=row.media_type,headers={'Content-Disposition':f"attachment; filename*=UTF-8''{quote(row.original_name)}",'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'})

    @app.post('/api/finance/payments/{identifier}/reverse')
    def reverse_title_payment(identifier:int,payload:S.PaymentReversal,db=DB,user=ADMIN):
        payment=V.get(db,Payment,identifier)
        V.reverse_payment(db,payment,user,payload.reason)
        entry=V.get(db,FinanceEntry,payment.entry_id)
        return V.finance_data(db,entry)

    @app.post('/api/finance/movements/{identifier}/reverse')
    def reverse_movement(identifier:int,payload:S.Reason,db=DB,user=ADMIN):
        payment=V.get(db,Payment,identifier)
        entry=V.get(db,FinanceEntry,payment.entry_id)
        if payment.reversal_of or entry.origin != 'manual':
            V.fail('Estorne pelo lançamento ou venda de origem')
        V.cancel_entry(db,entry,user,payload.reason); db.flush()
        return movement_data(db,payment)

    @app.get('/api/finance/movements.csv')
    def csv_movements(query=Depends(filter_dependency),db=DB,user=ADMIN):
        output=io.StringIO(); writer=csv.writer(output,delimiter=';')
        fields=['id','posting_date','competence_date','description','document','account_name','category_name','subcategory_name','origin','amount_cents']
        writer.writerow(['ID','Lançamento','Competência','Histórico','Documento','Conta','Categoria','Subcategoria','Origem','Valor (R$)'])
        for payment in db.scalars(query):
            row=movement_data(db,payment); cells=[]
            for field in fields:
                value=row[field]
                if field == 'amount_cents':
                    sign='-' if value<0 else ''; value=abs(value)
                    cells.append(f'{sign}{value//100},{value%100:02d}')
                else:
                    value=str(value or '')
                    cells.append("'"+value if value.lstrip().startswith(('=','+','-','@','\t','\r')) else value)
            writer.writerow(cells)
        return Response('\ufeff'+output.getvalue(),media_type='text/csv; charset=utf-8',headers={'Content-Disposition':'attachment; filename="livro-caixa.csv"'})


def validate_account(values):
    if values['opening_date'] > V.today():
        V.fail('Referência do saldo inicial não pode estar no futuro',422)
    if values['kind'] == 'cash' and values['opening_cents'] < 0:
        V.fail('Saldo inicial do caixa não pode ser negativo',422)
