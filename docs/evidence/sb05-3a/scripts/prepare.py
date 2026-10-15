"""Snapshots, recovery copies and disposable demonstration data for SB-05.3A."""
from pathlib import Path
import hashlib, json, os, shutil, sqlite3, subprocess, sys, tempfile

ROOT = Path(__file__).resolve().parents[4]
E = ROOT / 'docs/evidence/sb05-3a'
HEAD = 'b21a11769803eb0dcb86e470f641987bd1c3771a'
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

if sys.argv[1] == 'setup':
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==HEAD
    assert subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()=='feat/sb05-financeiro'
    # Own authored audit scripts may be untracked; existing tracked sources must be clean.
    assert not subprocess.check_output(['git','diff','HEAD','--name-only'],cwd=ROOT,text=True).strip()
    work=Path(tempfile.mkdtemp(prefix='silex-sb053a-'))
    backup=Path.home()/'.local/share/codex-backups/controlmax-inspired/sb05-3a'/work.name
    originals=['frontend/src/financePlanning.tsx','docs/silex-business/PENDENCIAS.md']
    for rel in originals:
        p=backup/'original'/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/rel,p)
    hashes={}
    excluded={'.git','.venv','node_modules','__pycache__','.pytest_cache','.cache','.vite'}
    for base,dirs,files in os.walk(ROOT):
        dirs[:]=[d for d in dirs if d not in excluded and not (Path(base)/d).is_symlink()]
        for f in files:
            p=Path(base)/f;rel=p.relative_to(ROOT).as_posix()
            if rel.startswith(('docs/evidence/sb05-3a/','docs/silex-business/SB-05.3A/')):continue
            if not p.is_symlink():hashes[rel]=digest(p)
    archive=subprocess.check_output(['git','archive',HEAD],cwd=ROOT)
    for variant in ['baseline','candidate']:
        dest=work/variant;dest.mkdir()
        subprocess.run(['tar','-x','-C',str(dest)],input=archive,check=True)
        (dest/'frontend/node_modules').symlink_to(ROOT/'frontend/node_modules',target_is_directory=True)
        (dest/'.venv').symlink_to(ROOT/'.venv',target_is_directory=True)
    env={'work_dir':str(work),'backup':str(backup),'baseline_commit':HEAD,'persistent_database_used':False,'originals':originals}
    (E/'environment.json').write_text(json.dumps(env,indent=2))
    (E/'baseline-sha256.json').write_text(json.dumps(hashes,indent=2))
    manifest={rel:digest(backup/'original'/rel) for rel in originals}
    assert all(manifest[rel]==hashes[rel] for rel in originals)
    (backup/'manifest.json').write_text(json.dumps(manifest,indent=2));(E/'backup-initial.json').write_text(json.dumps({'verified':True,**env,'hashes':manifest},indent=2))
    print(json.dumps({'work_dir':str(work),'snapshot_files':len(hashes),'backup_verified':True}))

elif sys.argv[1] == 'fixture':
    env=json.loads((E/'environment.json').read_text());work=Path(env['work_dir'])
    assert str(work).startswith('/tmp/silex-sb053a-') and env['persistent_database_used'] is False
    # Reuse the approved SB-05.2 demonstration fixture builder without its server launcher.
    source=(ROOT/'docs/evidence/sb05-2/scripts/start_isolated.py').read_text().split('servers=[]')[0]
    source=source.replace('/tmp/silex-sb05-2-','/tmp/silex-sb053a-')
    exec(compile(source,str(E/'scripts/fixture-reuse.py'),'exec'),{'__file__':str(E/'scripts/fixture-reuse.py')})
    sys.path.insert(0,str(work/'candidate/backend'))
    os.environ['GESTAO_DATABASE_URL']=f'sqlite:///{work}/fixture.sqlite3'
    from app.db import build_engine
    from app.api import create_app
    from app.services import today
    from fastapi.testclient import TestClient
    engine=build_engine()
    def ofx(rows):
        items=''.join(f'<STMTTRN>\n<TRNTYPE>{"CREDIT" if cents>0 else "DEBIT"}\n<DTPOSTED>{today().strftime("%Y%m%d")}120000[-4:AMT]\n<TRNAMT>{cents/100:.2f}\n<FITID>{fitid}\n<NAME>{name}\n<MEMO>Dado fictício de revisão SB053A\n</STMTTRN>\n' for fitid,cents,name in rows)
        return ('OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>'+items+'</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>').encode()
    with TestClient(create_app(engine,serve_frontend=False)) as c:
        assert c.post('/api/auth/login',json={'username':'demo.admin','password':'DemoLocal#2026'}).status_code==200
        bank=next(a for a in c.get('/api/accounts').json() if a['active'] and a['kind']=='bank')
        cats=c.get('/api/categories').json();expense=next(a for a in cats if a['name']=='Despesas operacionais');income=next(a for a in cats if a['name']=='Outras receitas')
        sub=next(s for s in c.get('/api/subcategories').json() if s['category_id']==income['id'])
        title=c.post('/api/finance',json={'description':'Título ilustrativo para conciliação SB053A','direction':'expense','amount_cents':10000,'account_id':bank['id'],'category_id':expense['id'],'due_date':today().isoformat()}).json()
        def upload(rows,name):
            r=c.post('/api/finance/ofx/imports?account_id='+str(bank['id']),content=ofx(rows),headers={'Content-Type':'application/x-ofx','X-Statement-Name':name});assert r.status_code==201,r.text;return r.json()
        for n in range(50):upload([(f'SB053A-HISTORY-{n:02}',-100,'Movimento ilustrativo de histórico')],f'historico-ilustrativo-{n:02}.ofx')
        upload([('SB053A-DUPLICATE',-2500,'Movimento repetido ilustrativo')],'anterior-ilustrativo.ofx')
        statement=upload([('SB053A-MATCH',-10000,'Título a conciliar'),('SB053A-POST',1234,'Receita criada manualmente'),('SB053A-IGNORE',-350,'Movimento ignorado'),('SB053A-DUPLICATE',-2500,'Movimento repetido ilustrativo'),('SB053A-LARGE-IN',123456789,'Entrada sintética elevada'),('SB053A-LARGE-OUT',-123456789,'Saída sintética elevada'),('SB053A-SMALL',1,'Entrada sintética pequena')],'Extrato ilustrativo SB053A.ofx')
        for n,body in [(0,{'entry_id':title['id'],'principal_cents':10000}),(1,{'create_title':True,'category_id':income['id'],'subcategory_id':sub['id']}),(2,{'ignore':True,'reason':'Linha fictícia descartada no teste'})]:
            r=c.post(f'/api/finance/ofx/imports/{statement["id"]}/items/{statement["items"][n]["id"]}/confirm',json=body);assert r.status_code==200,r.text
        (E/'fixture.json').write_text(json.dumps({'statement_id':statement['id'],'bank_id':bank['id'],'fictitious':True,'states':['pending','matched','posted','ignored','duplicate']},indent=2))
    engine.dispose()
    for variant in ['baseline','candidate','functional','baseline-functional']:
        with sqlite3.connect(work/'fixture.sqlite3') as src,sqlite3.connect(work/f'{variant}.sqlite3') as target:src.backup(target)
    print('Demonstration databases ready; production database not used.')
