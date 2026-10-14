"""Sprint 8: cadastros e livro caixa; preserva IDs, valores e referências."""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    for table, columns in {
        'accounts': [sa.Column('opening_cents', sa.Integer(), nullable=False, server_default='0'), sa.Column('opening_date', sa.Date(), nullable=False, server_default='2000-01-01'), *[sa.Column(n, sa.String(size), nullable=False, server_default='') for n, size in [('bank',100),('branch',40),('number',60),('notes',500)]], sa.Column('interest_bps', sa.Integer(), nullable=False, server_default='0'), sa.Column('fine_bps', sa.Integer(), nullable=False, server_default='0'), sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true())],
        'categories': [sa.Column('direction',sa.String(20),nullable=False,server_default='both'),sa.Column('classification',sa.String(20),nullable=False,server_default='operating'),sa.Column('result_group',sa.String(100),nullable=False,server_default=''),sa.Column('active',sa.Boolean(),nullable=False,server_default=sa.true())],
    }.items():
        for column in columns:
            op.add_column(table, column)
    op.create_table('suppliers', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('name',sa.String(150),nullable=False),sa.Column('document',sa.String(20),unique=True),*[sa.Column(n,sa.String(size),nullable=False,server_default='') for n,size in [('email',180),('phone',40),('address',300)]],sa.Column('active',sa.Boolean(),nullable=False,server_default=sa.true()))
    op.create_table('subcategories',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('name',sa.String(100),nullable=False),sa.Column('category_id',sa.Integer(),sa.ForeignKey('categories.id'),nullable=False),sa.Column('affects_result',sa.Boolean(),nullable=False,server_default=sa.true()),sa.Column('active',sa.Boolean(),nullable=False,server_default=sa.true()),sa.UniqueConstraint('category_id','name'))
    # SQLite admite REFERENCES no ADD COLUMN quando o valor inicial é NULL.
    op.execute('ALTER TABLE finance_entries ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id)')
    op.execute('ALTER TABLE finance_entries ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)')
    for column in [sa.Column('competence_date',sa.Date(),nullable=False,server_default='2000-01-01'),sa.Column('document',sa.String(100),nullable=False,server_default=''),sa.Column('origin',sa.String(20),nullable=False,server_default='title'),sa.Column('request_key',sa.String(80)),sa.Column('request_hash',sa.String(64))]:
        op.add_column('finance_entries',column)
    op.create_index('uq_finance_request_key','finance_entries',['request_key'],unique=True)
    for name in ('posting_date','competence_date'):
        op.add_column('payments',sa.Column(name,sa.Date(),nullable=False,server_default='2000-01-01'))
    op.execute("INSERT INTO subcategories (name,category_id) SELECT 'Geral',id FROM categories")
    op.execute("UPDATE finance_entries SET competence_date=date(created_at,'-4 hours'), subcategory_id=(SELECT id FROM subcategories WHERE category_id=finance_entries.category_id), origin=CASE WHEN sale_id IS NULL THEN 'title' ELSE 'sale' END")
    op.execute("UPDATE payments SET posting_date=date(created_at,'-4 hours'), competence_date=(SELECT competence_date FROM finance_entries WHERE id=payments.entry_id)")
    # Referência anterior a todo movimento legado; saldo inicial legado é zero.
    op.execute("UPDATE accounts SET opening_date=coalesce((SELECT min(posting_date) FROM payments WHERE account_id=accounts.id), date('now','-4 hours'))")
    op.create_index('ix_payment_posting','payments',['posting_date'])
    op.create_index('ix_payment_competence','payments',['competence_date'])


def downgrade():
    raise RuntimeError('Restaure o backup anterior à Sprint 8 para retornar à revisão 0002 sem perder cadastros ou lançamentos.')
