"""Add immutable DRE policy history; no recognition or reclassification backfill."""
from alembic import op
import sqlalchemy as sa
revision='0014'
down_revision='0013'
branch_labels=None
depends_on=None


def audit_columns():
    return [sa.Column('reason',sa.String(500),nullable=False),sa.Column('actor_user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('recorded_at',sa.DateTime(),nullable=False)]


def upgrade():
    op.create_table('dre_category_mapping_history',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('target',sa.String(60),nullable=False),sa.Column('category_id',sa.Integer(),sa.ForeignKey('categories.id'),nullable=False),sa.Column('subcategory_id',sa.Integer(),sa.ForeignKey('subcategories.id')),sa.Column('line_code',sa.String(20),nullable=False),sa.Column('valid_from',sa.Date(),nullable=False),sa.Column('valid_to',sa.Date(),nullable=False),sa.Column('revision',sa.Integer(),nullable=False),sa.Column('supersedes_id',sa.Integer(),sa.ForeignKey('dre_category_mapping_history.id'),unique=True),*audit_columns(),sa.UniqueConstraint('target','revision'),sa.CheckConstraint('valid_from <= valid_to'))
    op.create_table('dre_recognition_decisions',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('source_key',sa.String(100),nullable=False),sa.Column('decision',sa.String(30),nullable=False),sa.Column('economic_date',sa.Date()),sa.Column('source_fingerprint',sa.String(64),nullable=False),sa.Column('evidence_kind',sa.String(100),nullable=False),sa.Column('line_code',sa.String(20)),sa.Column('revision',sa.Integer(),nullable=False),sa.Column('request_key',sa.String(80),nullable=False,unique=True),*audit_columns(),sa.UniqueConstraint('source_key','revision'),sa.CheckConstraint("decision IN ('recognize','pending','not_applicable')"))
    op.create_table('dre_component_assertions',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('line_code',sa.String(20),nullable=False),sa.Column('start',sa.Date(),nullable=False),sa.Column('end',sa.Date(),nullable=False),sa.Column('source_fingerprint',sa.String(64),nullable=False),*audit_columns())
    op.create_table('dre_period_reviews',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('start',sa.Date(),nullable=False),sa.Column('end',sa.Date(),nullable=False),sa.Column('mapping_version',sa.Integer(),nullable=False),sa.Column('decision_version',sa.Integer(),nullable=False),sa.Column('source_fingerprint',sa.String(64),nullable=False),sa.Column('report_json',sa.Text(),nullable=False),*audit_columns())


def downgrade():
    # Only explicit laboratory downgrade; application startup never invokes it.
    for name in ('dre_period_reviews','dre_component_assertions','dre_recognition_decisions','dre_category_mapping_history'):
        op.drop_table(name)
