"""Explicit completion/incurrence evidence, without inferring historical dates."""
from alembic import op
import sqlalchemy as sa
revision='0015'
down_revision='0014'
branch_labels=None
depends_on=None


def upgrade():
    # SQLite permits nullable REFERENCES columns through ADD COLUMN, preserving all rows.
    for name,kind in [('completed_on',sa.Date()),('completed_at',sa.DateTime()),('completed_by_id',sa.Integer()),('completion_reason',sa.String(500)),('completion_request_key',sa.String(80)),('completion_request_hash',sa.String(64))]:
        suffix=' REFERENCES users(id)' if name=='completed_by_id' else ''
        op.execute(sa.text('ALTER TABLE service_orders ADD COLUMN '+name+' '+kind.compile(dialect=op.get_bind().dialect)+suffix))
    op.create_index('uq_service_completion_key','service_orders',['completion_request_key'],unique=True)
    for name,kind in [('incurred_on',sa.Date()),('incurred_at',sa.DateTime()),('incurred_by_id',sa.Integer()),('incurrence_reason',sa.String(500))]:
        suffix=' REFERENCES users(id)' if name=='incurred_by_id' else ''
        op.execute(sa.text('ALTER TABLE service_order_costs ADD COLUMN '+name+' '+kind.compile(dialect=op.get_bind().dialect)+suffix))


def downgrade():
    op.drop_index('uq_service_completion_key',table_name='service_orders')
    for name in ('completion_request_hash','completion_request_key','completion_reason','completed_by_id','completed_at','completed_on'):op.drop_column('service_orders',name)
    for name in ('incurrence_reason','incurred_by_id','incurred_at','incurred_on'):op.drop_column('service_order_costs',name)
