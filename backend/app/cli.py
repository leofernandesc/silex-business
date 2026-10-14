import argparse
import getpass
import os
import sqlite3
import csv
import hashlib
import io
import tempfile
import zipfile
from datetime import timedelta
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import func, select, text

from .api import passwords
from .db import ROOT, build_engine, session_factory
from .models import Account, Customer, FinanceEntry, Product, Sale, User
from .schemas import Finalize, ItemInput, SaleInput
from .services import active_cash, create_sale, default_records, finalize_sale, move_stock, today


def migrate():
    config = Config(str(ROOT / "backend" / "alembic.ini"))
    command.upgrade(config, "head")
    with session_factory(build_engine())() as db:
        default_records(db)
        db.commit()


def create_admin():
    username = input("Usuário administrador: ").strip().lower()
    name = input("Nome: ").strip()
    password = getpass.getpass("Senha (mínimo 10 caracteres): ")
    confirmation = getpass.getpass("Repita a senha: ")
    from .schemas import UserInput
    values = UserInput(username=username, name=name, password=password, role="admin")
    if password != confirmation:
        raise SystemExit("As senhas não coincidem")
    with session_factory(build_engine())() as db:
        db.add(User(name=values.name, username=values.username.lower(), password_hash=passwords.hash(password), role="admin"))
        db.commit()
    print("Administrador criado. Senha não gravada em arquivos.")


def seed():
    from .models import CashSession, Category
    with session_factory(build_engine())() as db:
        db.execute(text("BEGIN IMMEDIATE"))
        if db.scalar(select(Product).where(Product.code == "DEMO-001")):
            print("Demonstração já carregada; nenhuma alteração.")
            return
        if db.scalar(select(func.count(Product.id))) or db.scalar(select(func.count(Customer.id))) or db.scalar(select(func.count(Sale.id))):
            raise SystemExit("Use um banco vazio para carregar a demonstração fictícia.")
        default_records(db)
        demo = db.scalar(select(User).where(User.username == "demo.admin"))
        if not demo:
            demo = User(username="demo.admin", name="Administrador Demo", password_hash=passwords.hash("DemoLocal#2026"), role="admin")
            db.add(demo)
        if not db.scalar(select(User).where(User.username == "demo.operador")):
            db.add(User(username="demo.operador", name="Operador Demo", password_hash=passwords.hash("DemoLocal#2026"), role="operator"))
        db.flush()
        customers = [Customer(name="Ana Exemplo", email="ana@example.test", phone="(92) 0000-0000", address="Rua Fictícia, 10"), Customer(name="Oficina Horizonte Demo", email="oficina@example.test")]
        db.add_all(customers)
        db.flush()
        records = [("DEMO-001", "Caderno pontilhado A5", "product", "UN", 2890, 32000), ("DEMO-002", "Caneta azul 0,7 mm", "product", "UN", 590, 80000), ("DEMO-003", "Papel kraft", "product", "KG", 1890, 3500), ("DEMO-004", "Organização de documentos", "service", "HR", 6500, 0), ("DEMO-005", "Pasta com elástico", "product", "UN", 1290, 4000)]
        products = []
        for code, description, kind, unit, price, qty in records:
            product = Product(code=code, description=description, kind=kind, unit=unit, price_cents=price)
            db.add(product)
            db.flush()
            if kind == "product":
                move_stock(db, product, qty, "opening", "Saldo fictício de demonstração", demo)
            products.append(product)
        db.add(CashSession(user_id=demo.id, opening_cents=15000))
        db.flush()
        for idx, qty, method, customer in [(0, 2000, "pix", None), (1, 3000, "cash", None), (3, 1000, "credit", customers[0].id)]:
            product = products[idx]
            sale = create_sale(db, SaleInput(customer_id=customer, items=[ItemInput(product_id=product.id, quantity_milli=qty, unit_price_cents=product.price_cents)]), demo)
            finalize_sale(db, sale, Finalize(method=method, due_date=today() + timedelta(days=7) if method == "credit" else None), demo)
        account = db.scalar(select(Account).where(Account.kind == "bank"))
        expense_category = db.scalar(select(Category).where(Category.name == "Despesas operacionais"))
        sales_category = db.scalar(select(Category).where(Category.name == "Vendas"))
        db.add_all([FinanceEntry(description="Internet — demonstração", direction="expense", amount_cents=9900, status="open", account_id=account.id, category_id=expense_category.id, user_id=demo.id, due_date=today() + timedelta(days=3)), FinanceEntry(description="Recebível fictício anterior", direction="income", amount_cents=12500, status="open", account_id=account.id, category_id=sales_category.id, user_id=demo.id, customer_id=customers[1].id, due_date=today() - timedelta(days=2))])
        db.commit()
    print("Dados fictícios carregados. Contas: demo.admin e demo.operador. Senha demo: DemoLocal#2026")


def backup(destination):
    engine = build_engine()
    database = engine.url.database
    if not database or database == ":memory:":
        raise SystemExit("Backup exige um banco SQLite em arquivo")
    output = Path(destination).resolve()
    if output.exists() or output == Path(database).resolve():
        raise SystemExit("Escolha um arquivo de destino novo")
    output.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with sqlite3.connect(f"file:{Path(database).resolve()}?mode=ro", uri=True) as source, sqlite3.connect(output) as target:
            source.backup(target)
            assert target.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        print(f"Backup consistente: {output}")
    except Exception:
        output.unlink(missing_ok=True)
        raise


def backup_bundle(destination):
    """Create a consistent SQLite snapshot plus a separately browsable file archive."""
    engine = build_engine()
    database = engine.url.database
    if not database or database == ":memory:":
        raise SystemExit("Backup exige um banco SQLite em arquivo")
    output = Path(destination).resolve()
    if output.exists() or output == Path(database).resolve():
        raise SystemExit("Escolha um arquivo de destino novo")
    output.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with tempfile.TemporaryDirectory(prefix="gestao-backup-") as temp_dir:
            snapshot = Path(temp_dir) / "gestao.sqlite3"
            with sqlite3.connect(f"file:{Path(database).resolve()}?mode=ro", uri=True) as source, sqlite3.connect(snapshot) as target:
                source.backup(target)
                if target.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise RuntimeError("Integridade do snapshot SQLite falhou")
                has_attachments = target.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='attachments'").fetchone()
                attachments = target.execute("SELECT id, original_name, media_type, size_bytes, sha256, content FROM attachments ORDER BY id").fetchall() if has_attachments else []
            manifest = io.StringIO(newline="")
            writer = csv.writer(manifest, delimiter=";")
            writer.writerow(["id", "nome_original", "tipo_mime", "bytes", "sha256", "arquivo_no_zip"])
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.write(snapshot, "gestao.sqlite3")
                for identifier, name, media_type, size_bytes, digest, content in attachments:
                    safe_name = str(name).replace("\\", "/").split("/")[-1]
                    safe_name = "".join(ch for ch in safe_name if ch.isprintable()).strip()[:180] or "comprovante"
                    archive_name = f"attachments/{identifier:08d}-{safe_name}"
                    if len(content) != size_bytes or hashlib.sha256(content).hexdigest() != digest:
                        raise RuntimeError(f"Comprovante {identifier} não passou na verificação de integridade")
                    archive.writestr(archive_name, content)
                    writer.writerow([identifier, safe_name, media_type, size_bytes, digest, archive_name])
                archive.writestr("attachments-manifest.csv", "\ufeff" + manifest.getvalue())
        print(f"Pacote de backup consistente: {output}")
    except Exception:
        output.unlink(missing_ok=True)
        raise


def main():
    parser = argparse.ArgumentParser(description="Gestão Local")
    parser.add_argument("command", choices=["init", "create-admin", "seed-demo", "backup", "backup-bundle"])
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.command == "init":
        migrate()
        print("Migrações aplicadas.")
    elif args.command == "create-admin":
        create_admin()
    elif args.command == "seed-demo":
        seed()
    elif args.command == "backup-bundle":
        output = args.output or str(ROOT / "backups" / f"gestao-completo-{__import__('datetime').datetime.now().strftime('%Y%m%d-%H%M%S')}.zip")
        backup_bundle(output)
    else:
        output = args.output or str(ROOT / "backups" / f"gestao-{__import__('datetime').datetime.now().strftime('%Y%m%d-%H%M%S')}.sqlite3")
        backup(output)


if __name__ == "__main__":
    main()
