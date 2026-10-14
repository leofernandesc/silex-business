"""Configuração de identidade da empresa, sem valores empresariais inventados."""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "company_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand_name", sa.String(50), nullable=False, server_default="Gestão"),
        sa.Column("company_name", sa.String(150), nullable=False, server_default=""),
        sa.Column("company_document", sa.String(20), nullable=False, server_default=""),
        sa.Column("phone", sa.String(40), nullable=False, server_default=""),
        sa.Column("email", sa.String(180), nullable=False, server_default=""),
        sa.Column("address", sa.String(300), nullable=False, server_default=""),
    )


def downgrade():
    op.drop_table("company_settings")
