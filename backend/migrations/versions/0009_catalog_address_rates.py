"""Endereços estruturados, grupos de catálogo e valores padrão sugeridos."""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


ADDRESS_COLUMNS = (
    ("contact_name", sa.String(120)),
    ("postal_code", sa.String(9)),
    ("street", sa.String(180)),
    ("address_number", sa.String(30)),
    ("complement", sa.String(100)),
    ("neighborhood", sa.String(100)),
    ("city", sa.String(100)),
    ("state", sa.String(2)),
)


def upgrade():
    for table in ("customers", "suppliers"):
        for name, kind in ADDRESS_COLUMNS:
            op.add_column(table, sa.Column(name, kind, nullable=False, server_default=""))
    op.add_column("products", sa.Column("group_name", sa.String(100), nullable=False, server_default=""))
    op.add_column("suppliers", sa.Column("default_rate_cents", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("suppliers", "default_rate_cents")
    op.drop_column("products", "group_name")
    for table in ("customers", "suppliers"):
        for name, _ in reversed(ADDRESS_COLUMNS):
            op.drop_column(table, name)
