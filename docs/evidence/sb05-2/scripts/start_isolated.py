"""Disposable databases and loopback servers for SB-05.2; no production imports/data."""
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

assert config["persistent_database_used"] is False and str(work).startswith("/tmp/silex-sb05-2-")
assert all((work/v/"frontend/dist/index.html").is_file() for v in ["baseline","candidate"]), "Build both isolated copies before starting servers"
if not template.exists():
    engine = build_engine()
    Base.metadata.create_all(engine)
    seed()
    with session_factory(engine)() as db:
        company = models.CompanySetting(id=1, brand_name="Nome de apresentação ilustrativo", company_name="Empresa Privada de Teste · Dados fictícios", email="empresa@example.test")
        db.add(company)
        for n in range(31):
            db.add(models.Customer(name=f"Cliente Ilustrativo {n + 1:02}", email=f"cliente{n+1}@example.test", active=n != 30))
        for kind, name in [("supplier", "Fornecedor Ilustrativo"), ("day_worker", "Diarista Ilustrativo"), ("subcontracted_freight", "Frete Ilustrativo")]:
            db.add(models.Supplier(name=name, kind=kind, email="prestador@example.test", pix_key_type="email", pix_key="pix@example.test", pix_holder=name, default_rate_cents=12000 if kind != "supplier" else None))
        category = db.scalar(select(models.Category).where(models.Category.name == "Despesas operacionais"))
        db.add(models.Subcategory(name="Serviços ilustrativos", category_id=category.id))
        customer = db.scalar(select(models.Customer).where(models.Customer.name == "Ana Exemplo"))
        user = db.scalar(select(models.User).where(models.User.username == "demo.admin"))
        db.add(models.ServiceOrder(code="SB05-DEMO", customer_id=customer.id, description="Serviço ilustrativo sem geração de títulos", service_date=today(), negotiated_cents=75000, user_id=user.id))
        db.commit()
    # Financial fixture uses the unchanged API against this temporary database only.
    from fastapi.testclient import TestClient
    from app.api import create_app
    with session_factory(engine)() as db:
        bank = db.scalar(select(models.Account).where(models.Account.kind == "bank"))
        bank.opening_date = today().replace(day=1)
        bank_id = bank.id
        db.commit()
    with TestClient(create_app(engine)) as client:
        assert client.post("/api/auth/login", json={"username":"demo.admin", "password":"DemoLocal#2026"}).status_code == 200
        subs = client.get("/api/subcategories").json()
        categories_by_id = {x["id"]:x for x in client.get("/api/categories").json()}
        created=[]
        for n in range(31):
            direction = "income" if n % 3 else "expense"
            sub = next(x for x in subs if categories_by_id[x["category_id"]]["direction"] in [direction,"both"])
            iso = today().replace(day=max(1,today().day - n % max(1,today().day))).isoformat()
            response = client.post("/api/finance/movements",json={"description":f"Lançamento ilustrativo SB05 {n+1:02}","direction":direction,"amount_cents":2400+n*11 if direction=="income" else 1100+n*7,"account_id":bank_id,"subcategory_id":sub["id"],"posting_date":iso,"competence_date":today().replace(day=1).isoformat(),"document":f"DOC-SB05-{n+1:02}","method":"pix","request_key":f"sb05-fixture-key-{n+1:03}"})
            assert response.status_code == 201, response.text
            created.append(response.json())
        response=client.post(f"/api/finance/movements/{created[0]['id']}/reverse",json={"reason":"Estorno ilustrativo na fixture de revisão"})
        assert response.status_code == 200, response.text
        # Titles are created with the original API exclusively in this disposable fixture.
        cats = client.get("/api/categories").json()
        vendors = client.get("/api/suppliers?page_size=100").json()["items"]
        customer_id = client.get("/api/customers?active=true&page_size=100").json()["items"][0]["id"]
        from datetime import timedelta
        for direction in ["expense", "income"]:
            category = next(c for c in cats if c["active"] and c["direction"] in [direction,"both"])
            for n in range(26):
                vendor = vendors[n % len(vendors)]
                due = today()+timedelta(days=[-2,0,3,7,8][n%5])
                body = {"description":f"Título ilustrativo SB052 {direction} {n+1:02}","direction":direction,"amount_cents":10000+n*100,"account_id":bank_id,"category_id":category["id"],"due_date":due.isoformat(),"competence_date":today().replace(day=1).isoformat(),"document":f"SB052-{direction}-{n+1:02}","supplier_id":vendor["id"] if direction=="expense" else None,"customer_id":customer_id if direction=="income" else None}
                response=client.post("/api/finance",json=body);assert response.status_code==201,response.text
                title=response.json()
                if n in [0,1,2]:
                    response=client.post(f"/api/finance/{title['id']}/settle",json={"method":"pix","account_id":bank_id,"principal_cents":title["amount_cents"] if n==0 else 2500,"request_key":f"sb052-fixture-{direction}-{n}"});assert response.status_code==200,response.text
                if n==2:
                    response=client.post(f"/api/finance/{title['id']}/cancel",json={"reason":"Cancelamento ilustrativo da fixture"});assert response.status_code==200,response.text
        client.post("/api/auth/logout")
    engine.dispose()

servers=[]
try:
    for variant, port, source in [("baseline", 18035, "baseline"), ("candidate", 18036, "candidate"), ("functional", 8011, "candidate")]:
        db_path=work/f"{variant}.sqlite3"
        with sqlite3.connect(template) as src, sqlite3.connect(db_path) as target:
            src.backup(target)
        # Functional tests use the seeded fixture too; pagination and real records available.
        env={**os.environ,"PYTHONPATH":str(work/source/"backend"),"GESTAO_DATABASE_URL":f"sqlite:///{db_path}","PYTHONDONTWRITEBYTECODE":"1"}
        log=(EVIDENCE/f"server-{variant}.log").open("w")
        proc=subprocess.Popen([str(candidate/".venv/bin/python"),"-m","uvicorn","app.main:app","--host","127.0.0.1","--port",str(port)],cwd=work/source,env=env,stdout=log,stderr=subprocess.STDOUT)
        servers.append((proc,log))
    (EVIDENCE/"isolated-servers.json").write_text(json.dumps({"pid":os.getpid(),"servers":[{"pid":p.pid} for p,_ in servers],"template":str(template),"databases":[str(work/f"{v}.sqlite3") for v in ["baseline","candidate","functional"]],"persistent_database_used":False},indent=2))
    print("SB-05.2 disposable servers started: 18035 baseline, 18036 candidate, 8011 functional",flush=True)
    while all(p.poll() is None for p,_ in servers):
        time.sleep(1)
finally:
    for proc, log in servers:
        if proc.poll() is None:
            proc.terminate()
            try: proc.wait(timeout=10)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
        log.close()
