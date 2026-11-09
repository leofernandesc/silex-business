"""Explicit, append-only economic decisions. This module never mutates money tables."""
from dataclasses import asdict
from datetime import date
import json
from typing import Literal
from fastapi import Depends
from pydantic import BaseModel,ConfigDict,Field
from sqlalchemy import select,func
from . import services as V
from .dre import resolve_source
from .dre_history import active_mappings,fingerprint
from .dre_sources import sources
from .models import DreDecision,DreCancellationReview,DrePeriodReview


class CancellationInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    source_key:str=Field(min_length=3,max_length=100)
    source_fingerprint:str=Field(min_length=64,max_length=64)
    cancellation_fingerprint:str=Field(min_length=64,max_length=64)
    expected_revision:int=Field(ge=0)
    decision:Literal['reverse','retain']
    economic_date:date
    evidence_kind:str=Field(min_length=3,max_length=100)
    reason:str=Field(min_length=5,max_length=500)
    reviewed_period_acknowledged:bool=False
    request_key:str=Field(min_length=16,max_length=80)
    preview_token:str|None=None


def register(app,get_db,admin):
    DB=Depends(get_db,scope='function');ADMIN=Depends(admin)

    def source_for(payload,db,user):
        rows,_=sources(db,user)
        source=next((s for s in rows if s['key']==payload.source_key),None)
        if source is None:V.fail('Fonte não disponível para esta identidade',404)
        return source

    def preview(payload,db,user,source):
        if not source.get('cancellation_fingerprint') or source['cancellation_fingerprint']!=payload.cancellation_fingerprint or source['fingerprint']!=payload.source_fingerprint:
            V.fail('Cancelamento ou fonte mudou; atualize a consulta antes de revisar',409)
        revision=db.scalar(select(func.max(DreCancellationReview.revision)).where(DreCancellationReview.source_key==payload.source_key,DreCancellationReview.cancellation_fingerprint==payload.cancellation_fingerprint)) or 0
        if revision!=payload.expected_revision:V.fail('Revisão de cancelamento mudou; atualize a consulta',409)
        decisions=list(db.scalars(select(DreDecision).where(DreDecision.source_key==payload.source_key).order_by(DreDecision.id)))
        original,issue,excluded,mapping=resolve_source(source,decisions[-1] if decisions else None,active_mappings(db))
        if payload.economic_date>V.today():V.fail('A data econômica do ajuste não pode ser futura',422)
        if original and payload.economic_date<min(f.economic_date for f in original):V.fail('O ajuste não pode preceder o fato econômico original',422)
        if payload.decision=='reverse' and not original:V.fail('Confirme primeiro o reconhecimento e a classificação do fato original; não há valor econômico comprovado para reverter',409)
        originals=[asdict(f) for f in original]
        dates=[f.economic_date for f in original]+[payload.economic_date]
        reviewed=any(r.start<=d<=r.end for r in db.scalars(select(DrePeriodReview)) for d in dates)
        values=payload.model_dump(exclude={'preview_token'})
        token=fingerprint({'actor':user.id,'values':values,'source':source,'original_facts':originals,'reviewed_period':reviewed,'revision':revision})
        return {'preview_token':token,'original_facts':originals,'adjustment_facts':[{**f,'amount_cents':-f['amount_cents'],'economic_date':payload.economic_date} for f in originals] if payload.decision=='reverse' else [],'reviewed_period':reviewed,'economic_date':payload.economic_date,'decision':payload.decision,'revision':revision},originals

    @app.post('/api/finance/dre/cancellation-review/preview')
    def cancellation_preview(payload:CancellationInput,db=DB,user=ADMIN):
        return preview(payload,db,user,source_for(payload,db,user))[0]

    @app.post('/api/finance/dre/cancellation-review',status_code=201)
    def cancellation_review(payload:CancellationInput,db=DB,user=ADMIN):
        source=source_for(payload,db,user)
        digest=fingerprint(payload.model_dump(exclude={'preview_token'}))
        prior=db.scalar(select(DreCancellationReview).where(DreCancellationReview.request_key==payload.request_key))
        if prior:
            if prior.request_hash!=digest:V.fail('Chave já utilizada com outra revisão econômica',409)
            return {k:v for k,v in V.data(prior).items() if k!='original_facts_json'}
        impact,originals=preview(payload,db,user,source)
        if payload.preview_token!=impact['preview_token']:V.fail('Prévia ausente ou desatualizada; confira o ajuste antes de confirmar',409)
        if impact['reviewed_period'] and not payload.reviewed_period_acknowledged:V.fail('Há competência revisada: confirme explicitamente a preservação da revisão histórica',409)
        values=payload.model_dump(exclude={'preview_token','expected_revision'})
        row=DreCancellationReview(**values,original_facts_json=json.dumps(originals,default=str,sort_keys=True),revision=impact['revision']+1,request_hash=digest,actor_user_id=user.id)
        db.add(row);db.flush();V.audit(db,user,'dre_cancellation_review','dre_cancellation_review',row.id)
        # Do not return the opaque snapshot text as a second editable ledger.
        return {k:v for k,v in V.data(row).items() if k!='original_facts_json'}
