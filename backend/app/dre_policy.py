"""Economic DRE contracts. Monetary arithmetic is integer-only; unknown is never zero."""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal

Coverage = Literal['complete', 'partial', 'unavailable', 'not_applicable']
BASE_LINES = ('RB','DED','CD','DO','OR','OD','DA','FI','FE','TL')
DEPENDENCIES = {
    'RL': ('RB','DED'), 'LB': ('RL','CD'),
    'EBIT': ('LB','DO','OR','OD','DA'), 'EBITDA': ('EBIT','DA'),
    'RF': ('FI','FE'), 'LL': ('EBIT','RF','TL'),
}
SIGNS = {'RL': (1,-1), 'LB': (1,-1), 'EBIT': (1,-1,1,-1,-1),
         'EBITDA': (1,1), 'RF': (1,-1), 'LL': (1,1,-1)}


@dataclass(frozen=True)
class RecognizedFact:
    key: str
    source_type: str
    source_id: int
    component: str
    economic_date: date
    amount_cents: int
    dre_line_code: str
    recognition_basis: str
    mapping_revision: int | None = None
    recognition_revision: int | None = None
    linked_finance_entry_id: int | None = None

    def __post_init__(self):
        if type(self.amount_cents) is not int or self.dre_line_code not in BASE_LINES:
            raise ValueError('Fato econômico inválido')
        if type(self.economic_date) is not date or self.source_id < 1:
            raise ValueError('Origem ou data econômica inválida')


def statement(facts, confirmed_components=(), incomplete_components=()):
    """Coverage assertions attest completeness, including confirmed absence, per period.

    Incomplete source/classification overrides any declaration of completeness.
    Derived totals propagate unknown dependencies even if algebra cancels them.
    """
    seen=set(); amounts={code:0 for code in BASE_LINES};counts={code:0 for code in BASE_LINES}
    for fact in facts:
        if fact.key in seen: raise ValueError('Fato econômico duplicado: '+fact.key)
        seen.add(fact.key);amounts[fact.dre_line_code]+=fact.amount_cents;counts[fact.dre_line_code]+=1
    complete=set(confirmed_components); incomplete=set(incomplete_components)
    if (complete|incomplete)-set(BASE_LINES):raise ValueError('Componente desconhecido')
    rows={}
    for code in BASE_LINES:
        status='complete' if code in complete and code not in incomplete else 'partial' if counts[code] else 'unavailable'
        rows[code]={'code':code,'known_amount_cents':amounts[code] if counts[code] or status=='complete' else None,
                    'final_amount_cents':amounts[code] if status=='complete' else None,
                    'coverage_status':status,'contributing_facts':counts[code]}
    for code,deps in DEPENDENCIES.items():
        valid=all(rows[d]['coverage_status']=='complete' for d in deps)
        available=all(rows[d]['known_amount_cents'] is not None for d in deps)
        known=sum(rows[d]['known_amount_cents']*sign for d,sign in zip(deps,SIGNS[code])) if available else None
        rows[code]={'code':code,'known_amount_cents':known,'final_amount_cents':known if valid else None,
                    'coverage_status':'complete' if valid else 'partial' if available else 'unavailable',
                    'missing_components':[d for d in deps if rows[d]['coverage_status']!='complete']}
    margins={}
    revenue=rows['RL']['final_amount_cents']
    for key in ('LB','EBIT','EBITDA','LL'):
        value=rows[key]['final_amount_cents']
        margins[key]={'value':str((Decimal(value)*100/Decimal(revenue)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)) if value is not None and revenue is not None and revenue>0 else None,
                      'reason':None if value is not None and revenue is not None and revenue>0 else 'Resultado incompleto ou receita líquida não positiva'}
    return {'lines':list(rows.values()),'margins':margins,'regime':'economic_accrual','policy_version':1}
