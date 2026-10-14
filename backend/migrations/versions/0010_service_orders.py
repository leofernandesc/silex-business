"""Ordens de serviço, custos contratados e geração idempotente de títulos."""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "service_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("description", sa.String(300), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("negotiated_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("notes", sa.String(500), nullable=False, server_default=""),
        sa.Column("cancel_reason", sa.String(300), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("negotiated_cents > 0"),
        sa.CheckConstraint("status IN ('draft', 'scheduled', 'in_progress', 'completed', 'canceled')"),
    )
    op.create_index("ix_service_order_status_date", "service_orders", ["status", "service_date"])
    op.create_table(
        "service_order_costs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("service_order_id", sa.Integer(), sa.ForeignKey("service_orders.id"), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("quantity_milli", sa.Integer(), nullable=True),
        sa.Column("agreed_amount_cents", sa.Integer(), nullable=False),
        sa.Column("details", sa.String(300), nullable=False, server_default=""),
        sa.CheckConstraint("kind IN ('day_worker', 'subcontracted_freight')"),
        sa.CheckConstraint("agreed_amount_cents > 0"),
        sa.CheckConstraint("(kind = 'day_worker' AND quantity_milli > 0) OR (kind = 'subcontracted_freight' AND quantity_milli IS NULL)"),
    )
    op.create_index("ix_service_order_cost_order", "service_order_costs", ["service_order_id"])
    op.create_table(
        "service_order_title_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("service_order_id", sa.Integer(), sa.ForeignKey("service_orders.id"), nullable=False, unique=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("competence_date", sa.Date(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    # SQLite não permite adicionar FKs a uma tabela já referenciada sem copiá-la.
    # Mantemos os vínculos opcionais com validação pela API para preservar os
    # pagamentos, anexos e conciliações que referenciam finance_entries.
    op.add_column("finance_entries", sa.Column("service_order_id", sa.Integer(), nullable=True))
    op.add_column("finance_entries", sa.Column("service_order_cost_id", sa.Integer(), nullable=True))
    op.create_index("ix_finance_service_order", "finance_entries", ["service_order_id"])
    op.create_index("uq_finance_service_order_cost", "finance_entries", ["service_order_cost_id"], unique=True)


def downgrade():
    op.drop_index("uq_finance_service_order_cost", table_name="finance_entries")
    op.drop_index("ix_finance_service_order", table_name="finance_entries")
    op.drop_column("finance_entries", "service_order_cost_id")
    op.drop_column("finance_entries", "service_order_id")
    op.drop_table("service_order_title_runs")
    op.drop_index("ix_service_order_cost_order", table_name="service_order_costs")
    op.drop_table("service_order_costs")
    op.drop_index("ix_service_order_status_date", table_name="service_orders")
    op.drop_table("service_orders")
