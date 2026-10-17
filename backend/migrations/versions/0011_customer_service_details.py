"""Dados de serviço isolados por cliente e conta, sem alterar customers."""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_service_details",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_address", sa.String(2000), nullable=False, server_default=""),
        sa.Column("end_address", sa.String(2000), nullable=False, server_default=""),
        sa.Column("service_type", sa.String(20), nullable=True),
        sa.UniqueConstraint("customer_id", "user_id"),
        sa.CheckConstraint("service_type IS NULL OR service_type IN ('local', 'interstate')"),
    )


def downgrade():
    op.drop_table("customer_service_details")
