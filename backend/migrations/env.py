from alembic import context
from app.db import Base, build_engine
from app import models

target_metadata = Base.metadata

if context.is_offline_mode():
    import os
    from app.db import DEFAULT_DB
    context.configure(url=os.environ.get("GESTAO_DATABASE_URL", f"sqlite:///{DEFAULT_DB}"), target_metadata=target_metadata, literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = build_engine()
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()
