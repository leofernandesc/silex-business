"""Coleta e entrega estruturadas; preserva cadastro e textos da revisão 0011."""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

ADDRESS_COLUMNS = (
    ("postal_code", 9), ("street", 180), ("address_number", 30),
    ("complement", 100), ("neighborhood", 100), ("city", 100), ("state", 2),
)


def upgrade():
    for prefix in ("collection", "delivery"):
        for name, length in ADDRESS_COLUMNS:
            op.add_column("customer_service_details", sa.Column(
                f"{prefix}_{name}", sa.String(length), nullable=False, server_default=""))


def downgrade():
    for prefix in ("delivery", "collection"):
        for name, _ in reversed(ADDRESS_COLUMNS):
            op.drop_column("customer_service_details", f"{prefix}_{name}")
