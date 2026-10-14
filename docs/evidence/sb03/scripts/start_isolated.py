"""Disposable databases and loopback servers for SB-03; no production imports/data."""
from pathlib import Path
import json, os, shutil, sqlite3, subprocess, sys, time

EVIDENCE = Path(__file__).resolve().parents[1]
config = json.loads((EVIDENCE / "environment.json").read_text())
work = Path(config["work_dir"])
candidate = work / "candidate"
sys.path.insert(0, str(candidate / "backend"))
template = work / "fixture.sqlite3"
os.environ["GESTAO_DATABASE_URL"] = f"sqlite:///{template}"
from app.db import Base, build_engine, session_factory
from app import models
from app.cli import seed
from app.services import today
from sqlalchemy import select

engine = build_engine()
Base.metadata.create_all(engine)
seed()
with session_factory(engine)() as db:
    company = models.CompanySetting(id=1, brand_name="Nome de apresentação ilustrativo", company_name="Empresa Exemplo · Dados fictícios", email="empresa@example.test")
    db.add(company)
    for n in range(31):
        db.add(models.Customer(name=f"Cliente Ilustrativo {n + 1:02}", email=f"cliente{n+1}@example.test", active=n != 30))
    for kind, name in [("supplier", "Fornecedor Ilustrativo"), ("day_worker", "Diarista Ilustrativo"), ("subcontracted_freight", "Frete Ilustrativo")]:
        db.add(models.Supplier(name=name, kind=kind, email="prestador@example.test", pix_key_type="email", pix_key="pix@example.test", pix_holder=name, default_rate_cents=12000 if kind != "supplier" else None))
    category = db.scalar(select(models.Category).where(models.Category.name == "Despesas operacionais"))
    db.add(models.Subcategory(name="Serviços ilustrativos", category_id=category.id))
    customer = db.scalar(select(models.Customer).where(models.Customer.name == "Ana Exemplo"))
    user = db.scalar(select(models.User).where(models.User.username == "demo.admin"))
    db.add(models.ServiceOrder(code="SB03-DEMO", customer_id=customer.id, description="Serviço ilustrativo sem geração de títulos", service_date=today(), negotiated_cents=75000, user_id=user.id))
    db.commit()
engine.dispose()

servers=[]
try:
    for variant, port, source in [("baseline", 18024, "baseline"), ("candidate", 18023, "candidate"), ("functional", 8011, "candidate")]:
        db_path=work/f"{variant}.sqlite3"
        with sqlite3.connect(template) as src, sqlite3.connect(db_path) as target:
            src.backup(target)
        # Functional tests use the seeded fixture too; pagination and real records available.
        env={**os.environ,"PYTHONPATH":str(work/source/"backend"),"GESTAO_DATABASE_URL":f"sqlite:///{db_path}","PYTHONDONTWRITEBYTECODE":"1"}
        log=(EVIDENCE/f"server-{variant}.log").open("w")
        proc=subprocess.Popen([str(candidate/".venv/bin/python"),"-m","uvicorn","app.main:app","--host","127.0.0.1","--port",str(port)],cwd=work/source,env=env,stdout=log,stderr=subprocess.STDOUT)
        servers.append((proc,log))
    (EVIDENCE/"isolated-servers.json").write_text(json.dumps({"pid":os.getpid(),"servers":[{"pid":p.pid} for p,_ in servers],"template":str(template),"databases":[str(work/f"{v}.sqlite3") for v in ["baseline","candidate","functional"]],"persistent_database_used":False},indent=2))
    print("SB-03 disposable servers started: 18024 baseline, 18023 candidate, 8011 functional",flush=True)
    while all(p.poll() is None for p,_ in servers):
        time.sleep(1)
finally:
    for proc, log in servers:
        if proc.poll() is None:
            proc.terminate()
            try: proc.wait(timeout=10)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
        log.close()
