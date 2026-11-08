"""Explicit module opt-in; existing identities and business data are untouched."""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("transport_operations", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column("users", "transport_operations")
