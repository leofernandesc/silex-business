"""Diaristas, frete subcontratado e dados PIX dos beneficiários."""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    # Acrescenta campos sem reconstruir a tabela referenciada pelos títulos.
    for name, length, default in (
        ('kind', 30, 'supplier'), ('pix_key_type', 10, ''),
        ('pix_key', 77, ''), ('pix_holder', 150, ''), ('notes', 500, ''),
    ):
        op.add_column('suppliers', sa.Column(name, sa.String(length), nullable=False, server_default=default))
    op.create_index('ix_supplier_kind_active', 'suppliers', ['kind', 'active'])


def downgrade():
    raise RuntimeError('Restaure o backup anterior à revisão 0007 para preservar os dados PIX.')
