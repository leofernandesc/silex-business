"""Sprint 13: orçamento mensal por categoria/subcategoria."""
from alembic import op
import sqlalchemy as sa
revision='0006'
down_revision='0005'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('monthly_budgets',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('year',sa.Integer(),nullable=False),sa.Column('month',sa.Integer(),nullable=False),sa.Column('category_id',sa.Integer(),sa.ForeignKey('categories.id'),nullable=False),sa.Column('subcategory_id',sa.Integer(),sa.ForeignKey('subcategories.id')),sa.Column('target_cents',sa.Integer(),nullable=False),sa.Column('notes',sa.String(300),nullable=False,server_default=''),sa.Column('active',sa.Boolean(),nullable=False,server_default=sa.true()),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('created_at',sa.DateTime(),nullable=False),sa.CheckConstraint('month BETWEEN 1 AND 12'),sa.CheckConstraint('target_cents > 0'))
    op.create_index('ix_budget_month','monthly_budgets',['year','month','active'])

def downgrade():
    raise RuntimeError('Restaure o backup anterior à Sprint 13 para recuperar orçamentos.')
