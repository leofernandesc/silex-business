import json
from datetime import date
from pathlib import Path
import pytest
from app.dre_policy import RecognizedFact,statement,BASE_LINES

EXAMPLES=json.loads((Path(__file__).resolve().parents[2]/'specs/financial-stage1/dre-examples.json').read_text())
KEYS=dict(zip(('gross','deductions','direct_cost','operating_expense','other_income','other_expense','da','financial_income','financial_expense','profit_tax'),BASE_LINES))

@pytest.mark.parametrize('example',EXAMPLES,ids=lambda x:x['id'])
def test_engine_matches_independent_specification(example):
    facts=[RecognizedFact('test:'+k,'finance_entry',i+1,'principal',date(2026,11,8),value,KEYS[k],'synthetic') for i,(k,value) in enumerate(example['input'].items()) if value is not None]
    result=statement(facts,[KEYS[k] for k,v in example['input'].items() if v is not None])
    rows={row['code']:row for row in result['lines']}
    if example.get('unavailable'):
        assert all(rows[c]['final_amount_cents'] is None for c in ('EBIT','EBITDA','LL'))
    else:
        for code,key in [('RL','net_revenue'),('LB','gross_profit'),('EBIT','ebit'),('EBITDA','ebitda'),('RF','financial_result'),('LL','net_profit')]:
            assert rows[code]['final_amount_cents']==example['expected'][key]
        assert [result['margins'][c]['value'] for c in ('LB','EBIT','EBITDA','LL')]==(example['margins'] or [None]*4)


def test_unknown_is_not_zero_and_duplicate_is_rejected():
    rows={r['code']:r for r in statement([])['lines']}
    assert rows['LL']['final_amount_cents'] is None
    fact=RecognizedFact('sale:1:principal','sale',1,'principal',date(2026,11,8),100001,'RB','finalized')
    with pytest.raises(ValueError,match='duplicado'):statement([fact,fact])
    assert next(r for r in statement([fact],BASE_LINES,['CD'])['lines'] if r['code']=='LB')['final_amount_cents'] is None


def test_non_applicable_components_are_explicit_not_inferred():
    result=statement([],BASE_LINES,not_applicable_components=['DA'])
    assert next(r for r in result['lines'] if r['code']=='DA')['coverage_status']=='not_applicable'
    assert next(r for r in result['lines'] if r['code']=='EBITDA')['final_amount_cents']==0
    fact=RecognizedFact('manual:1','finance_entry',1,'principal',date(2026,11,8),100,'DA','synthetic')
    with pytest.raises(ValueError,match='não aplicável'):statement([fact],BASE_LINES,not_applicable_components=['DA'])
