"""Sprint 11: importação e conciliação manual OFX local."""
from alembic import op
import sqlalchemy as sa
revision='0005'
down_revision='0004'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('bank_statement_imports',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('account_id',sa.Integer(),sa.ForeignKey('accounts.id'),nullable=False),sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id'),nullable=False),sa.Column('original_name',sa.String(180),nullable=False),sa.Column('sha256',sa.String(64),nullable=False),sa.Column('status',sa.String(20),nullable=False,server_default='preview'),sa.Column('created_at',sa.DateTime(),nullable=False))
    op.create_table('bank_statement_items',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('import_id',sa.Integer(),sa.ForeignKey('bank_statement_imports.id'),nullable=False),sa.Column('fitid',sa.String(180),nullable=False),sa.Column('posted_date',sa.Date(),nullable=False),sa.Column('amount_cents',sa.Integer(),nullable=False),sa.Column('name',sa.String(180),nullable=False,server_default=''),sa.Column('memo',sa.String(500),nullable=False,server_default=''),sa.Column('status',sa.String(20),nullable=False,server_default='pending'),sa.Column('matched_entry_id',sa.Integer(),sa.ForeignKey('finance_entries.id')),sa.Column('payment_id',sa.Integer(),sa.ForeignKey('payments.id')),sa.Column('duplicate_of_id',sa.Integer(),sa.ForeignKey('bank_statement_items.id')),sa.Column('created_at',sa.DateTime(),nullable=False),sa.UniqueConstraint('import_id','fitid'))
    op.add_column('bank_statement_items',sa.Column('resolution_hash',sa.String(64)))
    op.create_index('ix_statement_match','bank_statement_items',['import_id','status'])

def downgrade():
    raise RuntimeError('Restaure o backup anterior à Sprint 11 para descartar conciliações/importações preservadas.')
