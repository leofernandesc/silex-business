"""Only specification arithmetic. No production DRE engine or approved accounting mapping."""
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import pytest

EXAMPLES = json.loads((Path(__file__).resolve().parents[2]/'specs/financial-stage1/dre-examples.json').read_text())


@pytest.mark.parametrize('example', EXAMPLES, ids=lambda x:x['id'])
def test_proposed_dre_integer_cent_examples(example):
    v = example['input']
    assert all(n is None or type(n) is int for n in v.values())
    if example.get('unavailable'):
        # Missing data is not confirmed zero, even when a shortcut EBITDA algebra cancels DA.
        assert v['da'] is None and v['profit_tax'] is None
        assert set(example['unavailable']) == {'ebit', 'ebitda', 'net_profit'}
        return
    rl = v['gross']-v['deductions']
    lb = rl-v['direct_cost']
    ebit = lb-v['operating_expense']+v['other_income']-v['other_expense']-v['da']
    ebitda = ebit+v['da']
    rf = v['financial_income']-v['financial_expense']
    ll = ebit+rf-v['profit_tax']
    assert dict(net_revenue=rl,gross_profit=lb,ebit=ebit,ebitda=ebitda,financial_result=rf,net_profit=ll) == example['expected']
    assert ebitda == ll+v['profit_tax']-rf+v['da']
    margins = [str((Decimal(n)*100/Decimal(rl)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)) for n in (lb,ebit,ebitda,ll)] if rl>0 else None
    assert margins == example['margins']
