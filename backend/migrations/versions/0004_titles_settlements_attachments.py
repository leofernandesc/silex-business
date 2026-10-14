"""Sprintes 9-10: recorrência, composição dos pagamentos e comprovantes."""
from alembic import op
import sqlalchemy as sa
revision='0004'
down_revision='0003'
branch_labels=None
depends_on=None

def upgrade():
    for column in [sa.Column('recurrence_id',sa.String(36)),sa.Column('recurrence_index',sa.Integer(),nullable=False,server_default='1'),sa.Column('recurrence_count',sa.Integer(),nullable=False,server_default='1')]:
        op.add_column('finance_entries',column)
    for column in [sa.Column('principal_cents',sa.Integer(),nullable=False,server_default='0'),sa.Column('interest_cents',sa.Integer(),nullable=False,server_default='0'),sa.Column('fine_cents',sa.Integer(),nullable=False,server_default='0'),sa.Column('discount_cents',sa.Integer(),nullable=False,server_default='0'),sa.Column('reversal_reason',sa.String(300)),sa.Column('request_key',sa.String(80)),sa.Column('request_hash',sa.String(64))]:
        op.add_column('payments',column)
    op.execute('UPDATE payments SET principal_cents=amount_cents')
    op.create_index('uq_payment_request_key','payments',['request_key'],unique=True)
    op.create_table('attachments',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('finance_entry_id',sa.Integer(),sa.ForeignKey('finance_entries.id')),sa.Column('payment_id',sa.Integer(),sa.ForeignKey('payments.id')),sa.Column('original_name',sa.String(180),nullable=False),sa.Column('media_type',sa.String(80),nullable=False),sa.Column('size_bytes',sa.Integer(),nullable=False),sa.Column('sha256',sa.String(64),nullable=False),sa.Column('content',sa.LargeBinary(),nullable=False),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('created_at',sa.DateTime(),nullable=False),sa.CheckConstraint('(finance_entry_id IS NOT NULL) != (payment_id IS NOT NULL)'))
    op.create_index('ix_attachment_entry','attachments',['finance_entry_id']);op.create_index('ix_attachment_payment','attachments',['payment_id'])

def downgrade():
    raise RuntimeError('Use o backup anterior à Sprint 9 para retornar à revisão 0003 sem perda de pagamentos/anexos.')
