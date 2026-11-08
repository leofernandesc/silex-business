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
    with engine.begin() as connection:
        # SQLite's legacy driver does not BEGIN for DDL. Start a real transaction
        # before any migration so schema and alembic_version roll back together.
        connection.exec_driver_sql("BEGIN IMMEDIATE")
        context.configure(connection=connection, target_metadata=target_metadata,
                          render_as_batch=True, transactional_ddl=True)
        with context.begin_transaction():
            context.run_migrations()
