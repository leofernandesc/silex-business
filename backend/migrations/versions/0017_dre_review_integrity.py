"""Explicit economic policy snapshots, interval revisions and cancellation evidence.

No historical financial data or policy is inferred/backfilled. Legacy DRE policies
remain available for supervised confirmation; frozen period reviews stay untouched.
"""
from alembic import op
import sqlalchemy as sa
revision='0017'
down_revision='0016'
branch_labels=None
depends_on=None


def upgrade():
    # Nullable REFERENCES use SQLite's additive ALTER TABLE, without rebuilding history.
    op.execute('ALTER TABLE dre_category_mapping_history ADD COLUMN replaces_id INTEGER REFERENCES dre_category_mapping_history(id)')
    op.add_column('dre_category_mapping_history',sa.Column('economic_classification',sa.String(20),nullable=True))
    op.add_column('dre_category_mapping_history',sa.Column('economic_affects_result',sa.Boolean(),nullable=True))
    op.add_column('dre_recognition_decisions',sa.Column('policy_fingerprint',sa.String(64),nullable=True))
    op.create_table('dre_cancellation_reviews',sa.Column('id',sa.Integer(),primary_key=True),
        sa.Column('source_key',sa.String(100),nullable=False),sa.Column('cancellation_fingerprint',sa.String(64),nullable=False),
        sa.Column('source_fingerprint',sa.String(64),nullable=False),sa.Column('original_facts_json',sa.Text(),nullable=False),
        sa.Column('decision',sa.String(20),nullable=False),sa.Column('economic_date',sa.Date(),nullable=False),
        sa.Column('evidence_kind',sa.String(100),nullable=False),sa.Column('reason',sa.String(500),nullable=False),
        sa.Column('reviewed_period_acknowledged',sa.Boolean(),nullable=False),sa.Column('revision',sa.Integer(),nullable=False),
        sa.Column('request_key',sa.String(80),nullable=False,unique=True),sa.Column('request_hash',sa.String(64),nullable=False),
        sa.Column('actor_user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('recorded_at',sa.DateTime(),nullable=False),
        sa.UniqueConstraint('source_key','cancellation_fingerprint','revision'),sa.CheckConstraint("decision IN ('reverse','retain')"))
    op.create_index('ix_dre_cancellation_source','dre_cancellation_reviews',['source_key','cancellation_fingerprint'])


def downgrade():
    op.drop_table('dre_cancellation_reviews')
    op.drop_column('dre_recognition_decisions','policy_fingerprint')
    for name in ('economic_affects_result','economic_classification','replaces_id'):
        op.drop_column('dre_category_mapping_history',name)
