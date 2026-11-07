"""Interactive, explicitly invoked provisioning. Never called during startup/seed."""
import getpass
import os
import sys
import warnings
from pathlib import Path

from sqlalchemy import func, or_, select, text
from sqlalchemy.engine import make_url

from .api import passwords
from .db import Base, build_engine, session_factory
from .models import Session, User
from .schemas import UserInput
from .services import audit


def provision_sammya(existing_user_id=None, reset_password=False):
    if not sys.stdin.isatty():
        raise SystemExit("Use um terminal interativo; senhas não são aceitas por argumento, ambiente ou pipe.")
    url = make_url(os.environ.get("GESTAO_DATABASE_URL", "sqlite://"))
    if url.get_backend_name() != "sqlite" or not url.database or not Path(url.database).is_absolute() or not Path(url.database).is_file():
        raise SystemExit("Configure GESTAO_DATABASE_URL explicitamente para um SQLite existente, migrado e com backup verificado.")
    engine = build_engine()
    try:
        with session_factory(engine)() as db:
            target = db.get(User, existing_user_id) if existing_user_id is not None else db.scalar(select(User).where(User.username == "sammya"))
            if existing_user_id is not None and target is None:
                raise SystemExit("Identidade anterior não encontrada; nenhuma conta foi criada.")
            if target and target.username == "demo.restricted.admin":
                raise SystemExit("A conta Demo deve permanecer intacta e genérica; não pode ser usada neste provisionamento.")
            conflict = db.scalar(select(User).where(User.username == "sammya"))
            if conflict and target and conflict.id != target.id:
                raise SystemExit("O username sammya já pertence a outra identidade. Revise os vínculos antes de prosseguir.")
            candidates = list(db.scalars(select(User.id).where(or_(User.username.ilike("%sammya%"), User.name.ilike("%sammya%")))))
            if existing_user_id is None and any(identifier != (target.id if target else None) for identifier in candidates):
                raise SystemExit("Há possíveis identidades anteriores. Verifique os IDs e use --existing-user-id; não recrie a conta.")
            snapshot = (target.id, target.username, target.name, target.password_hash, target.role, target.active, target.transport_operations) if target else None
            if target:
                links = {table.name: db.scalar(select(func.count()).select_from(table).where(table.c.user_id == target.id))
                         for table in Base.metadata.sorted_tables if "user_id" in table.c}
                print(f"Identidade existente ID {target.id}; vínculos preservados: {links}")
            else:
                print("Nenhuma identidade anterior correspondente encontrada. Será criada uma conta nova.")
        if input("Confirme o backup e a identidade; digite sammya para prosseguir: ").strip() != "sammya":
            raise SystemExit("Provisionamento cancelado.")
        password_hash = None
        if snapshot is None or reset_password:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", getpass.GetPassWarning)
                    password = getpass.getpass("Senha exclusiva (mínimo 10 caracteres): ")
                    confirmation = getpass.getpass("Repita a senha: ")
            except getpass.GetPassWarning:
                raise SystemExit("O terminal não oferece entrada protegida; nenhuma senha será lida com eco.") from None
            if password != confirmation:
                raise SystemExit("As senhas não coincidem.")
            # Reuse the current account validation and hashing, without printing input.
            try:
                UserInput(username="sammya", name="Sammya", password=password, role="admin")
            except ValueError:
                raise SystemExit("Senha inválida; use entre 10 e 200 caracteres.") from None
            password_hash = passwords.hash(password)
            del password, confirmation
        with session_factory(engine)() as db:
            db.execute(text("BEGIN IMMEDIATE"))
            if snapshot:
                target = db.get(User, snapshot[0])
                current = (target.id, target.username, target.name, target.password_hash, target.role, target.active, target.transport_operations) if target else None
                if current != snapshot:
                    raise SystemExit("A identidade mudou durante a confirmação. Repita a verificação.")
                conflict = db.scalar(select(User).where(User.username == "sammya", User.id != target.id))
                if conflict:
                    raise SystemExit("Username ocupado; nenhuma alteração realizada.")
            else:
                if db.scalar(select(User.id).where(or_(User.username.ilike("%sammya%"), User.name.ilike("%sammya%")))):
                    raise SystemExit("Identidade criada durante a confirmação; repita a verificação.")
                target = User(username="sammya", name="Sammya", password_hash=password_hash, role="admin")
                db.add(target)
            target.username = "sammya"
            target.role = "admin"
            target.active = True
            target.transport_operations = True
            if password_hash is not None:
                target.password_hash = password_hash
            db.flush()
            # Privilege/identity changes require a fresh login for this account only.
            db.query(Session).filter(Session.user_id == target.id).delete()
            audit(db, None, "grant_transport_operations", "user", target.id)
            db.commit()
            print(f"Conta habilitada: ID {target.id}. Nenhuma senha foi exibida ou transferida entre contas.")
    finally:
        engine.dispose()
