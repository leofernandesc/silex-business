"""Economic DRE read model and supervised policy review. No parallel ledger."""
import csv
import io
import json
from datetime import date
from dataclasses import asdict
from typing import Literal
from fastapi import Depends, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select,func
from . import services as V
from .models import DreMapping,DreDecision,DreAssertion,DrePeriodReview,Subcategory,Category
from .dre_history import active_mappings,mapping_at,validate_mapping,fingerprint
from .dre_policy import BASE_LINES,DEPENDENCIES,RecognizedFact,statement
from .dre_sources import sources


class MappingInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    category_id:int=Field(gt=0)
    subcategory_id:int|None=Field(default=None,gt=0)
    line_code:str
    valid_from:date
    valid_to:date
    expected_revision:int=Field(ge=0)
    supersedes_id:int|None=Field(default=None,gt=0)
    reason:str=Field(min_length=5,max_length=500)
    preview_token:str|None=None


class RecognitionInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    source_key:str=Field(min_length=3,max_length=100)
    decision:Literal['recognize','pending','not_applicable']
    economic_date:date|None=None
    evidence_kind:str=Field(min_length=3,max_length=100)
    line_code:str|None=None
    expected_revision:int=Field(ge=0)
    request_key:str=Field(min_length=16,max_length=80)
    source_fingerprint:str=Field(min_length=64,max_length=64)
    reason:str=Field(min_length=5,max_length=500)


class PeriodInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    start:date
    end:date
    source_fingerprint:str=Field(min_length=64,max_length=64)
    report_fingerprint:str|None=Field(default=None,min_length=64,max_length=64)
    reason:str=Field(min_length=5,max_length=500)


class AssertionInput(PeriodInput):
    line_code:str
    assertion_kind:Literal['complete','not_applicable']='complete'


def window(start,end):
    if start>end or (end-start).days>366*10:V.fail('Informe período válido de até dez anos',422)


def report(db,user,start,end,mapping_version=None,decision_version=None):
    window(start,end)
    source_rows,restricted=sources(db,user)
    mappings=active_mappings(db,mapping_version)
    decisions=list(db.scalars(select(DreDecision).order_by(DreDecision.id)))
    if decision_version is not None:decisions=[d for d in decisions if d.id<=decision_version]
    decisions={d.source_key:d for d in decisions}
    subs={s.id:s for s in db.scalars(select(Subcategory))}
    categories={c.id:c for c in db.scalars(select(Category))}
    facts=[];issues=[];excluded=[];reconciliation=[];relevant_sources=[];mapping_ids=set()
    for src in source_rows:
        if src.get('canceled_on') and start<=src['canceled_on']<=end:
            issues.append({'key':src['key'],'codes':['economic_cancellation_review_required']})
            relevant_sources.append(src)
        decision=decisions.get(src['key'])
        current=decision is not None and decision.source_fingerprint==src['fingerprint']
        when=decision.economic_date if current and decision.decision!='pending' and decision.economic_date else src['economic_date'] or src['candidate_date']
        if when is None or not start<=when<=end:continue
        if src not in relevant_sources:relevant_sources.append(src)
        issues_for=list(src['issues'])
        fatal={'duplicate_documents','sale_values_unreconciled','sale_title_mismatch','service_title_mismatch','missing_operational_cost','titles_required','cost_title_required','service_not_completed','cost_title_mismatch','supplier_kind_mismatch'} & set(issues_for)
        if decision and not current:issues_for.append('source_changed_since_review')
        recognized=(current and decision.decision=='recognize') or (src['automatic'] and decision is None)
        if current and decision.decision=='not_applicable' and not fatal:
            excluded.append({'key':src['key'],'reason':decision.reason});continue
        mapping=mapping_at(mappings,src['category_id'],src['subcategory_id'],when)
        if mapping:mapping_ids.add(mapping.id)
        line=decision.line_code if current and src['source_type']=='payment' else mapping.line_code if mapping else None
        if not mapping and src['source_type']!='payment':issues_for.append('unclassified')
        if src['source_type']!='payment' and line in BASE_LINES:
            allowed=('RB','OR','FI') if src['direction']=='income' else ('DED','CD','DO','OD','DA','FE','TL')
            if line not in allowed:
                issues_for.append('direction_mapping_conflict');fatal.add('direction_mapping_conflict')
        sub=subs.get(src['subcategory_id'])
        if sub and not sub.affects_result and line!='outside_dre':issues_for.append('affects_result_conflict');fatal.add('affects_result_conflict')
        if categories.get(src['category_id']) and categories[src['category_id']].classification!='operating' and not current:
            issues_for.append('economic_nature_confirmation_required');recognized=False
        if src['source_type']!='payment' and categories.get(src['category_id']) and categories[src['category_id']].classification in ('investment','financing') and line!='outside_dre':
            issues_for.append('principal_outside_result_required');fatal.add('principal_outside_result_required')
        if line=='outside_dre' and recognized and not fatal:
            excluded.append({'key':src['key'],'mapping_revision':mapping.id,'reason':mapping.reason});continue
        if not recognized:issues_for.append('recognition_required')
        if line not in BASE_LINES:issues_for.append('classification_required')
        if fatal or not recognized or line not in BASE_LINES:
            issues.append({'key':src['key'],'source_type':src['source_type'],'source_id':src['source_id'],'codes':sorted(set(issues_for)),
                           'amount_cents':src['amount_cents'],'source_fingerprint':src['fingerprint'],'recognition_revision':decision.revision if decision else 0,'entry_ids':src['entry_ids']})
            continue
        amount=src['amount_cents']
        # Commercial discount is separate from financial settlement discounts.
        if src['source_type']=='sale' and line=='RB':amount+=src['commercial_discount_cents']
        fact=RecognizedFact(src['key'],src['source_type'],src['source_id'],src['component'],when,amount,line,decision.evidence_kind if current else 'verified_finalization',mapping.id if mapping else None,decision.id if current else None,src['entry_ids'][0] if src['entry_ids'] else None)
        facts.append(fact)
        if src['source_type']=='sale' and line=='RB' and src['commercial_discount_cents']:
            facts.append(RecognizedFact(src['key']+':commercial_discount','sale',src['source_id'],'commercial_discount',when,src['commercial_discount_cents'],'DED','verified_sale_discount',mapping.id if mapping else None))
        reconciliation.append({'key':src['key'],'recognized_principal_cents':src['amount_cents'],'entry_ids':src['entry_ids']})
    digest=fingerprint({'sources':relevant_sources,'restricted':restricted,'mapping_version':mapping_version,'decision_version':decision_version,
                        'mappings':[V.data(m) for m in mappings if m.id in mapping_ids],'decisions':[V.data(d) for d in decisions.values() if any(src['key']==d.source_key for src in relevant_sources)]})
    assertions=list(db.scalars(select(DreAssertion).where(DreAssertion.start==start,DreAssertion.end==end,DreAssertion.source_fingerprint==digest).order_by(DreAssertion.id)))
    assertions=list({a.line_code:a for a in assertions}.values())
    confirmed=[a.line_code for a in assertions]
    incomplete=BASE_LINES if issues or restricted else ()
    result=statement(facts,confirmed,incomplete,[a.line_code for a in assertions if a.assertion_kind=='not_applicable'])
    if restricted:issues.append({'codes':['restricted_sources'],'message':'Há fontes não disponíveis para esta identidade; demonstrativo incompleto.'})
    result.update(start=start,end=end,as_of=V.now(),mapping_version=max((m.id for m in mappings),default=0),decision_version=max((d.id for d in decisions.values()),default=0),
                  source_fingerprint=digest,facts=[asdict(f) for f in facts],issues=issues,excluded=excluded,reconciliation=reconciliation,
                  coverage_note='Componentes só são completos após revisão documentada do período. Ausência de dados não confirma zero.')
    result['report_fingerprint']=fingerprint({k:v for k,v in result.items() if k!='as_of'})
    return result


def register(app,get_db,admin):
    DB=Depends(get_db,scope='function');ADMIN=Depends(admin)

    @app.get('/api/finance/dre')
    def summary(start:date,end:date,response:Response,mapping_version:int|None=Query(None,ge=0),decision_version:int|None=Query(None,ge=0),db=DB,user=ADMIN):
        response.headers['Cache-Control']='no-store'
        return report(db,user,start,end,mapping_version,decision_version)

    @app.get('/api/finance/dre/items')
    def items(start:date,end:date,line:str|None=None,page:int=Query(1,ge=1,le=1000000),page_size:int=Query(20,ge=1,le=100),db=DB,user=ADMIN):
        if line and line not in (*BASE_LINES,'RL','LB','EBIT','EBITDA','RF','LL'):V.fail('Rubrica inválida',422)
        rows=report(db,user,start,end)['facts']
        if line:
            def leaves(code):
                return {code} if code in BASE_LINES else set().union(*(leaves(d) for d in DEPENDENCIES[code]))
            components=leaves(line)
            rows=[r for r in rows if r['dre_line_code'] in components]
        return {'items':rows[(page-1)*page_size:page*page_size],'total':len(rows),'page':page,'page_size':page_size}

    @app.get('/api/finance/dre/issues')
    def issues(start:date,end:date,db=DB,user=ADMIN):return report(db,user,start,end)['issues']

    @app.get('/api/finance/dre/reconciliation')
    def reconciliation(start:date,end:date,db=DB,user=ADMIN):
        result=report(db,user,start,end)
        return {k:result[k] for k in ('reconciliation','excluded','issues','source_fingerprint')}

    @app.get('/api/finance/dre.csv')
    def export(start:date,end:date,mapping_version:int|None=Query(None,ge=0),decision_version:int|None=Query(None,ge=0),db=DB,user=ADMIN):
        result=report(db,user,start,end,mapping_version,decision_version);output=io.StringIO();writer=csv.writer(output,delimiter=';')
        writer.writerow(['DRE gerencial','Competência econômica',start.isoformat(),end.isoformat()])
        writer.writerow(['Rubrica','Cobertura','Valor conhecido em centavos','Valor final em centavos'])
        for row in result['lines']:writer.writerow([row['code'],row['coverage_status'],row['known_amount_cents'],row['final_amount_cents']])
        writer.writerow(['Pendências',len(result['issues'])]);writer.writerow(['Origem','Rubrica','Data econômica','Centavos'])
        for f in result['facts']:writer.writerow([f['key'],f['dre_line_code'],f['economic_date'],f['amount_cents']])
        return Response('\ufeff'+output.getvalue(),media_type='text/csv; charset=utf-8',headers={'Cache-Control':'no-store','Content-Disposition':'attachment; filename="dre.csv"'})

    @app.get('/api/finance/dre/mappings')
    def mappings(version:int|None=Query(None,ge=0),db=DB,user=ADMIN):return [V.data(r) for r in active_mappings(db,version)]

    def preview(payload,db,user):
        values=payload.model_dump();target,revision,prior=validate_mapping(db,values)
        rows,restricted=sources(db,user)
        affected=[s for s in rows if s['category_id']==payload.category_id and (payload.subcategory_id is None or s['subcategory_id']==payload.subcategory_id) and payload.valid_from<=s['candidate_date']<=payload.valid_to]
        # Bind the confirmation to the full current source state, user and requested change.
        token=fingerprint({'values':{k:v for k,v in values.items() if k!='preview_token'},'sources':rows,'actor':user.id,'restricted':restricted})
        return {'preview_token':token,'affected_sources':len(affected),'affected_principal_cents':sum(s['amount_cents'] for s in affected if s['source_type']!='payment'),
                'periods':sorted({s['candidate_date'].strftime('%Y-%m') for s in affected}),'previous':V.data(prior) if prior else None,'proposed':{k:v for k,v in values.items() if k!='preview_token'},'restricted_sources':restricted},target,revision

    @app.post('/api/finance/dre/mappings/preview')
    def mapping_preview(payload:MappingInput,db=DB,user=ADMIN):return preview(payload,db,user)[0]

    @app.post('/api/finance/dre/mappings',status_code=201)
    def save_mapping(payload:MappingInput,db=DB,user=ADMIN):
        impact,target,revision=preview(payload,db,user)
        if payload.preview_token!=impact['preview_token']:V.fail('Prévia ausente ou desatualizada; revise o impacto antes de confirmar',409)
        if impact['restricted_sources'] and payload.valid_from<=V.today():V.fail('Reclassificação retroativa exige revisão das fontes restritas',403)
        values=payload.model_dump(exclude={'expected_revision','preview_token'})
        row=DreMapping(**values,target=target,revision=revision,actor_user_id=user.id)
        db.add(row);db.flush();V.audit(db,user,'dre_mapping','dre_mapping',row.id)
        return V.data(row)

    @app.post('/api/finance/dre/recognition-review',status_code=201)
    def recognize(payload:RecognitionInput,db=DB,user=ADMIN):
        rows,_=sources(db,user);source=next((s for s in rows if s['key']==payload.source_key),None)
        if source is None:V.fail('Fonte não disponível para esta identidade',404)
        prior=db.scalar(select(DreDecision).where(DreDecision.request_key==payload.request_key))
        if prior:
            if any(getattr(prior,k)!=v for k,v in payload.model_dump(exclude={'expected_revision'}).items()):V.fail('Chave utilizada com outra decisão',409)
            return V.data(prior)
        revision=db.scalar(select(func.max(DreDecision.revision)).where(DreDecision.source_key==payload.source_key)) or 0
        if revision!=payload.expected_revision or payload.source_fingerprint!=source['fingerprint']:V.fail('Fonte ou revisão mudou; revise novamente',409)
        if payload.decision!='pending' and (payload.economic_date is None or payload.economic_date>V.today()):V.fail('Informe data econômica comprovada, não futura',422)
        if payload.line_code is not None and payload.line_code not in BASE_LINES:V.fail('Rubrica inválida',422)
        if source['source_type']=='payment' and payload.decision=='recognize' and not payload.line_code:V.fail('Confirme a natureza econômica do encargo',422)
        row=DreDecision(**payload.model_dump(exclude={'expected_revision'}),revision=revision+1,actor_user_id=user.id)
        db.add(row);db.flush();V.audit(db,user,'dre_recognition','dre_decision',row.id)
        return V.data(row)

    @app.post('/api/finance/dre/component-assertions',status_code=201)
    def assert_component(payload:AssertionInput,db=DB,user=ADMIN):
        current=report(db,user,payload.start,payload.end)
        if payload.line_code not in BASE_LINES:V.fail('Rubrica inválida',422)
        if payload.source_fingerprint!=current['source_fingerprint'] or current['issues']:V.fail('Resolva as pendências e revise a versão atual antes de confirmar cobertura',409)
        if payload.assertion_kind=='not_applicable' and any(f['dre_line_code']==payload.line_code for f in current['facts']):V.fail('A rubrica possui fatos; não pode ser declarada não aplicável',409)
        row=DreAssertion(**payload.model_dump(exclude={'report_fingerprint'}),actor_user_id=user.id)
        db.add(row);db.flush();V.audit(db,user,'dre_component','dre_assertion',row.id);return V.data(row)

    @app.get('/api/finance/dre/period-reviews')
    def period_reviews(start:date,end:date,db=DB,user=ADMIN):
        window(start,end)
        return [{'id':r.id,'recorded_at':r.recorded_at,'reason':r.reason,'mapping_version':r.mapping_version,'decision_version':r.decision_version} for r in db.scalars(select(DrePeriodReview).where(DrePeriodReview.actor_user_id==user.id,DrePeriodReview.start==start,DrePeriodReview.end==end).order_by(DrePeriodReview.id.desc()))]

    @app.post('/api/finance/dre/period-reviews',status_code=201)
    def review_period(payload:PeriodInput,db=DB,user=ADMIN):
        current=report(db,user,payload.start,payload.end)
        if current['source_fingerprint']!=payload.source_fingerprint or current['report_fingerprint']!=payload.report_fingerprint:V.fail('Demonstrativo mudou; revise novamente',409)
        row=DrePeriodReview(**payload.model_dump(exclude={'report_fingerprint'}),actor_user_id=user.id,mapping_version=current['mapping_version'],decision_version=current['decision_version'],report_json=json.dumps(current,default=str,sort_keys=True))
        db.add(row);db.flush();V.audit(db,user,'dre_period_review','dre_review',row.id);return {'id':row.id,'source_fingerprint':row.source_fingerprint}

    @app.get('/api/finance/dre/period-reviews/{identifier}')
    def reviewed_period(identifier:int,db=DB,user=ADMIN):
        row=V.get(db,DrePeriodReview,identifier)
        if row.actor_user_id!=user.id:V.fail('Revisão pertence a outra identidade',403)
        current=report(db,user,row.start,row.end)
        if any('restricted_sources' in i['codes'] for i in current['issues']):V.fail('Fontes não disponíveis para esta identidade',403)
        return {'snapshot':json.loads(row.report_json),'source_changed':json.loads(row.report_json)['report_fingerprint']!=current['report_fingerprint']}
