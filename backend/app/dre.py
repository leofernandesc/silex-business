"""Economic DRE read model and supervised policy review. No parallel ledger."""
from collections import defaultdict
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
from .models import DreMapping,DreDecision,DreAssertion,DrePeriodReview,Subcategory,Category,FinanceEntry,Payment,DreCancellationReview
from .dre_history import active_mappings,mapping_at,validate_mapping,fingerprint,mapping_data,mapping_policy_data,economic_policy,policy_fingerprint
from .dre_policy import BASE_LINES,DEPENDENCIES,RecognizedFact,statement
from .dre_sources import sources


class MappingInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    category_id:int=Field(gt=0)
    subcategory_id:int|None=Field(default=None,gt=0)
    line_code:str
    economic_classification:Literal['operating','investment','financing']|None=None
    economic_affects_result:bool|None=None
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
    policy_fingerprint:str|None=Field(default=None,min_length=64,max_length=64)
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


def economic_day(source,decision):
    if decision is not None and decision.decision!='pending' and decision.economic_date:
        return decision.economic_date
    return source['economic_date'] or source['candidate_date']


def resolve_source(src,decision,mappings):
    """The same resolver powers reporting, recognition and cancellation previews."""
    when=economic_day(src,decision)
    mapping=mapping_at(mappings,src['category_id'],src['subcategory_id'],when) if when else None
    policy=economic_policy(src,mapping)
    current=decision is not None and decision.source_fingerprint==src['fingerprint'] and decision.policy_fingerprint==fingerprint(policy)
    problems=list(src['issues'])
    fatal={'duplicate_documents','sale_values_unreconciled','sale_title_mismatch','service_title_mismatch','missing_operational_cost','titles_required','cost_title_required','service_not_completed','cost_title_mismatch','supplier_kind_mismatch'} & set(problems)
    if decision and not current:problems.append('source_or_policy_changed_since_review')
    if mapping and (mapping.economic_classification is None or mapping.economic_affects_result is None):
        problems.append('mapping_policy_confirmation_required');fatal.add('mapping_policy_confirmation_required')
    recognized=(current and decision.decision=='recognize') or (src['automatic'] and decision is None)
    if current and decision.decision=='not_applicable' and not fatal:
        return [],None,{'key':src['key'],'amount_cents':src['amount_cents'],'entry_ids':src['entry_ids'],'origin':src['origin'],'reason':decision.reason},mapping
    line=decision.line_code if current and src['source_type']=='payment' else mapping.line_code if mapping else None
    if not mapping and src['source_type']!='payment':problems.append('unclassified')
    if src['source_type']!='payment' and line in BASE_LINES:
        allowed=('RB','OR','FI') if src['direction']=='income' else ('DED','CD','DO','OD','DA','FE','TL')
        if line not in allowed:problems.append('direction_mapping_conflict');fatal.add('direction_mapping_conflict')
    if not policy['affects_result'] and line!='outside_dre':problems.append('affects_result_conflict');fatal.add('affects_result_conflict')
    if policy['classification'] not in ('operating',None) and not current:
        problems.append('economic_nature_confirmation_required');recognized=False
    if src['source_type']!='payment' and policy['classification'] in ('investment','financing') and line!='outside_dre':
        problems.append('principal_outside_result_required');fatal.add('principal_outside_result_required')
    if line=='outside_dre' and recognized and not fatal:
        return [],None,{'key':src['key'],'amount_cents':src['amount_cents'],'entry_ids':src['entry_ids'],'origin':src['origin'],'mapping_revision':mapping.id,'reason':mapping.reason},mapping
    if not recognized:problems.append('recognition_required')
    if line not in BASE_LINES:problems.append('classification_required')
    if fatal or not recognized or line not in BASE_LINES:
        issue={'key':src['key'],'source_type':src['source_type'],'source_id':src['source_id'],'codes':sorted(set(problems)),
               'amount_cents':src['amount_cents'],'source_fingerprint':src['fingerprint'],'policy_fingerprint':fingerprint(policy),
               'recognition_revision':decision.revision if decision else 0,'entry_ids':src['entry_ids'],'origin':src['origin'],'category_id':src['category_id'],'subcategory_id':src['subcategory_id']}
        return [],issue,None,mapping
    amount=src['amount_cents']+(src['commercial_discount_cents'] if src['source_type']=='sale' and line=='RB' else 0)
    facts=[RecognizedFact(src['key'],src['source_type'],src['source_id'],src['component'],when,amount,line,decision.evidence_kind if current else 'verified_finalization',mapping.id if mapping else None,decision.id if current else None,src['entry_ids'][0] if src['entry_ids'] else None)]
    if src['source_type']=='sale' and line=='RB' and src['commercial_discount_cents']:
        facts.append(RecognizedFact(src['key']+':commercial_discount','sale',src['source_id'],'commercial_discount',when,src['commercial_discount_cents'],'DED','verified_sale_discount',mapping.id if mapping else None))
    return facts,None,None,mapping


def fact_signature(facts):
    return fingerprint([asdict(f) if isinstance(f,RecognizedFact) else f for f in facts])


def report(db,user,start,end,mapping_version=None,decision_version=None,cancellation_version=None):
    window(start,end)
    source_rows,restricted=sources(db,user)
    mappings=active_mappings(db,mapping_version)
    decisions=list(db.scalars(select(DreDecision).order_by(DreDecision.id)))
    if decision_version is not None:decisions=[d for d in decisions if d.id<=decision_version]
    decisions={d.source_key:d for d in decisions}
    visible_keys={src['key'] for src in source_rows}
    cancellation_rows=[r for r in db.scalars(select(DreCancellationReview).order_by(DreCancellationReview.id)) if r.source_key in visible_keys]
    if cancellation_version is not None:cancellation_rows=[r for r in cancellation_rows if r.id<=cancellation_version]
    cancellations={(r.source_key,r.cancellation_fingerprint):r for r in cancellation_rows}
    by_source=defaultdict(list)
    for r in cancellations.values():by_source[r.source_key].append(r)
    facts=[];issues=[];excluded=[];reconciliation=[];relevant_sources=[];relevant_keys=set();applicable={};events=[];adjustment_origins={}
    for src in source_rows:
        decision=decisions.get(src['key']);when=economic_day(src,decision)
        original_in_period=when is not None and start<=when<=end
        cancel_in_period=src.get('canceled_on') is not None and start<=src['canceled_on']<=end
        resolutions=by_source[src['key']]
        adjustment_in_period=any(start<=r.economic_date<=end for r in resolutions)
        if not(original_in_period or cancel_in_period or adjustment_in_period):continue
        resolved,issue,exclusion,mapping=resolve_source(src,decision,mappings)
        if original_in_period:
            relevant_sources.append({k:v for k,v in src.items() if k not in ('canceled_on','cancellation_fingerprint')});relevant_keys.add(src['key'])
            facts.extend(resolved)
            if issue:issues.append(issue)
            if exclusion:excluded.append(exclusion)
            if mapping:applicable[mapping.id]=mapping_policy_data(mapping)
            if resolved and src['source_type']!='payment':reconciliation.append({'key':src['key'],'direction':src['direction'],'recognized_principal_cents':src['amount_cents'],'entry_ids':src['entry_ids']})
        event=src.get('cancellation_fingerprint')
        latest=cancellations.get((src['key'],event))
        def cancellation_issue(code):
            return {'key':src['key'],'codes':[code],'source_fingerprint':src['fingerprint'],'origin':src['origin'],
                    'amount_cents':src['amount_cents'],'cancellation_fingerprint':event,'canceled_on':src.get('canceled_on'),
                    'cancellation_revision':latest.revision if latest else 0,'economic_date':latest.economic_date if latest else src.get('canceled_on')}
        if cancel_in_period:
            events.append({'source':src['key'],'cancellation':event,'source_state':src['fingerprint'],'recognized_facts':fact_signature(resolved)})
            if latest is None:issues.append(cancellation_issue('economic_cancellation_review_required'))
        for resolution in resolutions:
            relevant=start<=resolution.economic_date<=end
            original=json.loads(resolution.original_facts_json)
            valid=resolution.source_fingerprint==src['fingerprint'] and fact_signature(resolved)==fact_signature(original)
            if relevant:
                events.append({'review':V.data(resolution),'source_state':src['fingerprint'],'recognized_facts':fact_signature(resolved)});relevant_keys.add(src['key'])
                if resolution.decision=='reverse':
                    for index,f in enumerate(original):
                        key=f'economic_adjustment:{resolution.id}:{index}'
                        facts.append(RecognizedFact(key,'economic_adjustment',resolution.id,'cancellation',resolution.economic_date,-f['amount_cents'],f['dre_line_code'],resolution.evidence_kind,f['mapping_revision'],f['recognition_revision'],f['linked_finance_entry_id']))
                        adjustment_origins[key]={'origin':src['origin'],'original_source_key':src['key']}
            if not valid and (relevant or (cancel_in_period and resolution==latest) or original_in_period):
                pending=cancellation_issue('cancellation_source_changed_since_review');pending['cancellation_revision']=resolution.revision;issues.append(pending)
    digest=fingerprint({'sources':relevant_sources,'events':events,'restricted':restricted,'mapping_version':mapping_version,'decision_version':decision_version,'cancellation_version':cancellation_version,
                        'mappings':list(applicable.values()),'decisions':[V.data(d) for d in decisions.values() if d.source_key in relevant_keys]})
    assertions=list(db.scalars(select(DreAssertion).where(DreAssertion.start==start,DreAssertion.end==end,DreAssertion.source_fingerprint==digest).order_by(DreAssertion.id)))
    assertions=list({a.line_code:a for a in assertions}.values())
    confirmed=set(a.line_code for a in assertions)|({f.dre_line_code for f in facts}&{'RB','DO','OR','OD','FI','FE'})
    result=statement(facts,confirmed,BASE_LINES if issues or restricted else (),[a.line_code for a in assertions if a.assertion_kind=='not_applicable'])
    if restricted:issues.append({'codes':['restricted_sources'],'message':'Há fontes não disponíveis para esta identidade; demonstrativo incompleto.'})
    origin_by_key={s['key']:s['origin'] for s in source_rows}
    fact_rows=[{**asdict(f),**adjustment_origins.get(f.key,{'origin':origin_by_key.get(f.key) or origin_by_key.get(f.key.removesuffix(':commercial_discount'))})} for f in facts]
    result.update(start=start,end=end,as_of=V.now(),mapping_version=max((m.id for m in mappings),default=0),decision_version=max((d.id for d in decisions.values()),default=0),cancellation_version=max((r.id for r in cancellations.values()),default=0),
                  source_fingerprint=digest,facts=fact_rows,issues=issues,excluded=excluded,reconciliation=reconciliation,
                  recognized_adjustments=[{**asdict(f),**adjustment_origins.get(f.key,{})} for f in facts if f.source_type in ('payment','economic_adjustment')],
                  coverage_note='Fontes reconhecidas confirmam rubricas classificadas. Deduções/tributos, custos e DA exigem cobertura documentada. Ausência de dados não confirma zero.')
    result['report_fingerprint']=fingerprint({k:v for k,v in result.items() if k not in ('as_of','mapping_version','decision_version','cancellation_version')})
    return result


def register(app,get_db,admin):
    DB=Depends(get_db,scope='function');ADMIN=Depends(admin)
    def no_store(response:Response):response.headers['Cache-Control']='no-store'
    def private_get(path):return app.get(path,dependencies=[Depends(no_store)])

    @private_get('/api/finance/dre')
    def summary(start:date,end:date,response:Response,mapping_version:int|None=Query(None,ge=0),decision_version:int|None=Query(None,ge=0),cancellation_version:int|None=Query(None,ge=0),db=DB,user=ADMIN):
        response.headers['Cache-Control']='no-store'
        return report(db,user,start,end,mapping_version,decision_version,cancellation_version)

    @private_get('/api/finance/dre/items')
    def items(start:date,end:date,line:str|None=None,page:int=Query(1,ge=1,le=1000000),page_size:int=Query(20,ge=1,le=100),db=DB,user=ADMIN):
        if line and line not in (*BASE_LINES,'RL','LB','EBIT','EBITDA','RF','LL'):V.fail('Rubrica inválida',422)
        rows=report(db,user,start,end)['facts']
        if line:
            def leaves(code):
                return {code} if code in BASE_LINES else set().union(*(leaves(d) for d in DEPENDENCIES[code]))
            components=leaves(line)
            rows=[r for r in rows if r['dre_line_code'] in components]
        return {'items':rows[(page-1)*page_size:page*page_size],'total':len(rows),'page':page,'page_size':page_size}

    @private_get('/api/finance/dre/source-entry/{identifier}')
    def source_entry(identifier:int,db=DB,user=ADMIN):
        rows,_=sources(db,user)
        if not any(identifier in row['entry_ids'] for row in rows):V.fail('Fonte não disponível para esta identidade',404)
        return V.finance_data(db,V.get(db,FinanceEntry,identifier))

    @private_get('/api/finance/dre/issues')
    def issues(start:date,end:date,db=DB,user=ADMIN):return report(db,user,start,end)['issues']

    @private_get('/api/finance/dre/reconciliation')
    def reconciliation(start:date,end:date,db=DB,user=ADMIN):
        result=report(db,user,start,end)
        payment_rows=defaultdict(list)
        for row in db.scalars(select(Payment)):payment_rows[row.entry_id].append(row)
        amounts=dict(db.execute(select(FinanceEntry.id,FinanceEntry.amount_cents)).all())
        outstanding={entry.id:amount for entry,amount in V.open_title_principal(db)}
        for row in result['reconciliation']:
            payments=[p for identifier in row['entry_ids'] for p in payment_rows[identifier]]
            row['title_principal_cents']=sum(amounts[i] for i in row['entry_ids'])
            row['outstanding_principal_cents']=sum(outstanding.get(i,0) for i in row['entry_ids'])
            row['cash_amount_cents_lifetime']=sum(p.amount_cents for p in payments)
            row['cash_amount_cents_in_period']=sum(p.amount_cents for p in payments if start<=p.posting_date<=end)
            for component in ('principal','interest','fine','discount'):
                row['cash_'+component+'_signed_cents_lifetime']=sum(getattr(p,component+'_cents') for p in payments)
        return {k:result[k] for k in ('reconciliation','recognized_adjustments','excluded','issues','source_fingerprint')}

    @private_get('/api/finance/dre.csv')
    def export(start:date,end:date,mapping_version:int|None=Query(None,ge=0),decision_version:int|None=Query(None,ge=0),cancellation_version:int|None=Query(None,ge=0),db=DB,user=ADMIN):
        result=report(db,user,start,end,mapping_version,decision_version,cancellation_version);output=io.StringIO();writer=csv.writer(output,delimiter=';')
        writer.writerow(['DRE gerencial','Competência econômica',start.isoformat(),end.isoformat()])
        writer.writerow(['Rubrica','Cobertura','Valor conhecido em centavos','Valor final em centavos'])
        for row in result['lines']:writer.writerow([row['code'],row['coverage_status'],row['known_amount_cents'],row['final_amount_cents']])
        writer.writerow(['Versão de mapeamento',result['mapping_version'],'Versão de reconhecimento',result['decision_version']])
        writer.writerow(['Versão de ajuste econômico',result['cancellation_version']])
        writer.writerow(['Margem','Percentual','Critério'])
        for code,margin in result['margins'].items():writer.writerow([code,margin['value'].replace('.',',') if margin['value'] is not None else '',margin['reason'] or 'Componentes completos'])
        writer.writerow(['Fatos fora da DRE','Centavos','Política'])
        for excluded in result['excluded']:writer.writerow([excluded['key'],excluded['amount_cents'],'outside_dre'])
        writer.writerow(['Pendências',len(result['issues'])])
        for issue in result['issues']:writer.writerow([issue.get('key',''),','.join(issue['codes'])])
        writer.writerow(['Origem','Rubrica','Data econômica','Centavos'])
        for f in result['facts']:writer.writerow([f['key'],f['dre_line_code'],f['economic_date'],f['amount_cents']])
        return Response('\ufeff'+output.getvalue(),media_type='text/csv; charset=utf-8',headers={'Cache-Control':'no-store','Content-Disposition':'attachment; filename="dre.csv"'})

    @private_get('/api/finance/dre/mappings')
    def mappings(version:int|None=Query(None,ge=0),db=DB,user=ADMIN):return [mapping_data(r) for r in active_mappings(db,version)]

    def preview(payload,db,user):
        values=payload.model_dump();target,revision,prior=validate_mapping(db,values)
        category=V.get(db,Category,payload.category_id)
        sub=V.get(db,Subcategory,payload.subcategory_id) if payload.subcategory_id else None
        values['economic_classification']=payload.economic_classification or (prior.economic_classification if prior else None) or category.classification
        values['economic_affects_result']=payload.economic_affects_result if payload.economic_affects_result is not None else (prior.economic_affects_result if prior and prior.economic_affects_result is not None else sub.affects_result if sub else True)
        if sub is None and not values['economic_affects_result']:V.fail('A incidência específica deve ser versionada no mapeamento da subcategoria',422)
        rows,restricted=sources(db,user)
        decision_rows=list(db.scalars(select(DreDecision).order_by(DreDecision.id)))
        latest={d.source_key:d for d in decision_rows}
        affected=[(s,economic_day(s,latest.get(s['key']))) for s in rows if s['category_id']==payload.category_id and (payload.subcategory_id is None or s['subcategory_id']==payload.subcategory_id)]
        affected=[(s,when) for s,when in affected if when is not None and payload.valid_from<=when<=payload.valid_to]
        # Recognition can move the economic period without changing a title or payment.
        # Confirmations must attest the same policies as well as the same source rows.
        token=fingerprint({'values':{k:v for k,v in values.items() if k!='preview_token'},'sources':rows,'decisions':[V.data(d) for d in decision_rows],'mappings':[mapping_data(m) for m in active_mappings(db)],'actor':user.id,'restricted':restricted})
        return {'preview_token':token,'affected_sources':len(affected),'affected_principal_cents':sum(s['amount_cents'] for s,_ in affected if s['source_type']!='payment'),
                'periods':sorted({when.strftime('%Y-%m') for _,when in affected}),'retained_intervals':[{'start':r.valid_from,'end':min(r.valid_to,payload.valid_from-date.resolution)} for r in active_mappings(db) if prior and r.id==prior.id and r.valid_from<payload.valid_from]+[{'start':max(r.valid_from,payload.valid_to+date.resolution),'end':r.valid_to} for r in active_mappings(db) if prior and r.id==prior.id and r.valid_to>payload.valid_to],'previous':V.data(prior) if prior else None,'proposed':{k:v for k,v in values.items() if k!='preview_token'},'restricted_sources':restricted},target,revision

    @app.post('/api/finance/dre/mappings/preview')
    def mapping_preview(payload:MappingInput,db=DB,user=ADMIN):return preview(payload,db,user)[0]

    @app.post('/api/finance/dre/mappings',status_code=201)
    def save_mapping(payload:MappingInput,db=DB,user=ADMIN):
        impact,target,revision=preview(payload,db,user)
        if payload.preview_token!=impact['preview_token']:V.fail('Prévia ausente ou desatualizada; revise o impacto antes de confirmar',409)
        if impact['restricted_sources'] and payload.valid_from<=V.today():V.fail('Reclassificação retroativa exige revisão das fontes restritas',403)
        values={k:v for k,v in impact['proposed'].items() if k not in ('expected_revision','preview_token','supersedes_id')}
        row=DreMapping(**values,replaces_id=payload.supersedes_id,target=target,revision=revision,actor_user_id=user.id)
        db.add(row);db.flush();V.audit(db,user,'dre_mapping','dre_mapping',row.id)
        return mapping_data(row)

    @private_get('/api/finance/dre/recognition-policy')
    def recognition_policy(source_key:str,economic_date:date,db=DB,user=ADMIN):
        rows,_=sources(db,user);source=next((s for s in rows if s['key']==source_key),None)
        if source is None:V.fail('Fonte não disponível para esta identidade',404)
        mapping=mapping_at(active_mappings(db),source['category_id'],source['subcategory_id'],economic_date)
        return {'policy_fingerprint':policy_fingerprint(source,mapping),'economic_policy':economic_policy(source,mapping)}

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
        mapping=mapping_at(active_mappings(db),source['category_id'],source['subcategory_id'],payload.economic_date or source['economic_date'] or source['candidate_date'])
        if mapping and (mapping.economic_classification is None or mapping.economic_affects_result is None):V.fail('Confirme primeiro a política do mapeamento anterior no Plano financeiro',409)
        if payload.policy_fingerprint!=policy_fingerprint(source,mapping):V.fail('Política econômica mudou; atualize a revisão antes de confirmar',409)
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

    def can_read_review(snapshot,visible_keys):
        recorded={(r.get('original_source_key') or r['key']).removesuffix(':commercial_discount') for name in ('facts','issues','excluded') for r in snapshot.get(name,[]) if r.get('key')}
        return recorded<=visible_keys

    @private_get('/api/finance/dre/period-reviews')
    def period_reviews(start:date,end:date,db=DB,user=ADMIN):
        window(start,end)
        visible,_=sources(db,user);keys={r['key'] for r in visible}
        return [{'id':r.id,'recorded_at':r.recorded_at,'reason':r.reason,'mapping_version':r.mapping_version,'decision_version':r.decision_version} for r in db.scalars(select(DrePeriodReview).where(DrePeriodReview.actor_user_id==user.id,DrePeriodReview.start==start,DrePeriodReview.end==end).order_by(DrePeriodReview.id.desc())) if can_read_review(json.loads(r.report_json),keys)]

    @app.post('/api/finance/dre/period-reviews',status_code=201)
    def review_period(payload:PeriodInput,db=DB,user=ADMIN):
        current=report(db,user,payload.start,payload.end)
        if current['source_fingerprint']!=payload.source_fingerprint or current['report_fingerprint']!=payload.report_fingerprint:V.fail('Demonstrativo mudou; revise novamente',409)
        row=DrePeriodReview(**payload.model_dump(exclude={'report_fingerprint'}),actor_user_id=user.id,mapping_version=current['mapping_version'],decision_version=current['decision_version'],report_json=json.dumps(current,default=str,sort_keys=True))
        db.add(row);db.flush();V.audit(db,user,'dre_period_review','dre_review',row.id);return {'id':row.id,'source_fingerprint':row.source_fingerprint}

    @private_get('/api/finance/dre/period-reviews/{identifier}')
    def reviewed_period(identifier:int,db=DB,user=ADMIN):
        row=V.get(db,DrePeriodReview,identifier)
        if row.actor_user_id!=user.id:V.fail('Revisão pertence a outra identidade',403)
        current=report(db,user,row.start,row.end)
        visible,_=sources(db,user)
        if not can_read_review(json.loads(row.report_json),{r['key'] for r in visible}):V.fail('Fontes não disponíveis para esta identidade',403)
        return {'snapshot':json.loads(row.report_json),'source_changed':json.loads(row.report_json)['report_fingerprint']!=current['report_fingerprint']}

    from .dre_cancellations import register as register_cancellations
    register_cancellations(app,get_db,admin)
