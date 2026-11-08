"""Explicit non-applicability and indexes for economic policy reads."""
from alembic import op
import sqlalchemy as sa
revision='0016'
down_revision='0015'
branch_labels=None
depends_on=None


def upgrade():
    op.add_column('dre_component_assertions',sa.Column('assertion_kind',sa.String(30),nullable=False,server_default='complete'))
    op.create_index('ix_dre_assertion_period','dre_component_assertions',['start','end'])
    op.create_index('ix_dre_review_period_actor','dre_period_reviews',['start','end','actor_user_id'])
    op.create_index('ix_dre_mapping_period','dre_category_mapping_history',['category_id','subcategory_id','valid_from','valid_to'])


def downgrade():
    op.drop_index('ix_dre_mapping_period',table_name='dre_category_mapping_history')
    op.drop_index('ix_dre_review_period_actor',table_name='dre_period_reviews')
    op.drop_index('ix_dre_assertion_period',table_name='dre_component_assertions')
    op.drop_column('dre_component_assertions','assertion_kind')
