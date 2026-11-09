from datetime import date
import pytest
from fastapi import HTTPException
from app.dre_history import active_mappings,mapping_at,validate_mapping
from app.models import Category,DreMapping,Subcategory,User
from sqlalchemy import select


def test_mapping_history_precedence_replay_and_conflicts(env):
    app,*_=env
    with app.state.sessions() as db:
        category=db.scalar(select(Category)); actor=db.scalar(select(User).where(User.role=='admin'))
        sub=Subcategory(name='Fictícia DRE',category_id=category.id);db.add(sub);db.flush()
        values=dict(category_id=category.id,subcategory_id=None,line_code='RB',valid_from=date(2026,1,1),valid_to=date(2026,12,31),expected_revision=0,supersedes_id=None)
        target,revision,_=validate_mapping(db,values)
        first=DreMapping(target=target,category_id=category.id,line_code='RB',valid_from=values['valid_from'],valid_to=values['valid_to'],revision=revision,actor_user_id=actor.id,reason='Classificação fictícia')
        db.add(first);db.flush()
        with pytest.raises(HTTPException):validate_mapping(db,values)
        changed={**values,'line_code':'DO','expected_revision':1,'supersedes_id':first.id}
        target,revision,_=validate_mapping(db,changed)
        second=DreMapping(target=target,category_id=category.id,line_code='DO',valid_from=first.valid_from,valid_to=first.valid_to,revision=revision,supersedes_id=first.id,actor_user_id=actor.id,reason='Revisão fictícia')
        db.add(second);db.flush()
        assert mapping_at(active_mappings(db),category.id,None,date(2026,11,8)).id==second.id
        assert mapping_at(active_mappings(db,first.id),category.id,None,date(2026,11,8)).id==first.id
        db.add(DreMapping(target=f'category:{category.id}:subcategory:{sub.id}',category_id=category.id,subcategory_id=sub.id,line_code='CD',valid_from=first.valid_from,valid_to=first.valid_to,revision=1,actor_user_id=actor.id,reason='Regra específica'))
        db.flush()
        assert mapping_at(active_mappings(db),category.id,sub.id,date(2026,11,8)).line_code=='CD'
        db.commit()
    with app.state.sessions() as db:
        assert len(list(db.scalars(select(DreMapping))))==3
