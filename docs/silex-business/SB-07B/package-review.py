"""Build a small, secret-screened SB-07B review archive from local evidence."""
from pathlib import Path
import hashlib
import html
import json
import os
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "docs/silex-business/SB-07B"
EVIDENCE = ROOT / "docs/evidence/sb07b"
SCREENSHOTS = EVIDENCE / "screenshots"
EVIDENCE.mkdir(parents=True, exist_ok=True)
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

figures = [("Preparo Firefox pt-BR · 375 px", "services-date-pt-BR-375.png")]
index = (
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    "<title>SB-07B — evidências</title>"
    "<style>body{font:16px system-ui;max-width:1000px;margin:auto;padding:24px;color:#102d5c}"
    "img{display:block;max-width:100%;max-height:900px;object-fit:contain}"
    "figure{margin:24px 0;padding:16px;background:#f4f7fb;border-radius:12px}</style>"
    "<h1>SB-07B — preparo da homologação</h1>"
    "<p>Captura automatizada em Firefox pt-BR com dados fictícios. Não contém resultado humano.</p>"
)
for title, name in figures:
    index += (
        f"<figure><figcaption>{html.escape(title)}</figcaption>"
        f'<a href="screenshots/{html.escape(name)}">'
        f'<img src="screenshots/{html.escape(name)}" alt="{html.escape(title)}"></a></figure>'
    )
index += "</html>"
(EVIDENCE / "index.html").write_text(index)

paths = [
    DOCS / "RELATORIO.md",
    DOCS / "ROTEIRO-USUARIO.md",
    DOCS / "FORMULARIO-OBSERVADOR.md",
    DOCS / "RESULTADOS-HUMANOS.md",
    DOCS / "MATRIZ-DATAS.md",
    DOCS / "start-homologation.sh",
    DOCS / "package-review.py",
    ROOT / "docs/silex-business/PENDENCIAS.md",
    ROOT / "frontend/tests/sb07b-date-homologation.spec.ts",
    ROOT / "frontend/playwright.sb07b.config.ts",
    EVIDENCE / "environment.json",
    EVIDENCE / "preparation.json",
    EVIDENCE / "results.json",
    EVIDENCE / "approved-p05-results.json",
    EVIDENCE / "browser-availability.json",
    EVIDENCE / "git-summary.txt",
    EVIDENCE / "test-summary.json",
    EVIDENCE / "index.html",
    SCREENSHOTS / "services-date-pt-BR-375.png",
    EVIDENCE / "logs/build.log",
    EVIDENCE / "logs/types.log",
    EVIDENCE / "logs/unit-tests.log",
    EVIDENCE / "logs/preparation-e2e.log",
    EVIDENCE / "logs/approved-p05-e2e.log",
]
missing = [str(p) for p in paths if not p.is_file()]
if missing:
    raise SystemExit("Evidence missing: " + ", ".join(missing))

password = os.environ.get("SILEX_TEST_PASSWORD", "")
content = {}
for path in paths:
    relative = str(path.relative_to(ROOT))
    if path.stat().st_size > 2_000_000:
        raise SystemExit(f"Unexpectedly large evidence file: {relative}")
    if any(part in {".git", "node_modules", "dist", "data", "__pycache__"} for part in path.parts):
        raise SystemExit(f"Forbidden path: {relative}")
    raw = path.read_bytes()
    if password and password.encode() in raw:
        raise SystemExit(f"Test credential found in package input: {relative}")
    content[relative] = raw

status = subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True)
if status.strip():
    raise SystemExit("Commit reviewed materials before packaging; Git is not clean")

manifest = "".join(
    hashlib.sha256(raw).hexdigest() + "  " + name + "\n"
    for name, raw in sorted(content.items())
)
content["SB-07B/MANIFEST.sha256"] = manifest.encode()
archive = EVIDENCE / "SB-07B-review.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=8) as output:
    for name, raw in content.items():
        if name == "SB-07B/MANIFEST.sha256":
            continue
        output.writestr("SB-07B/" + name.removeprefix("docs/silex-business/SB-07B/").removeprefix("docs/evidence/sb07b/"), raw)
        if name.startswith("frontend/") or name == "docs/silex-business/PENDENCIAS.md":
            output.writestr("SB-07B/source/" + name, raw)
    output.writestr("SB-07B/MANIFEST.sha256", manifest.encode())

with zipfile.ZipFile(archive) as source:
    if source.testzip() is not None:
        raise SystemExit("ZIP CRC check failed")
    for entry, raw in content.items():
        if entry == "SB-07B/MANIFEST.sha256":
            continue
        stored = "SB-07B/" + entry.removeprefix("docs/silex-business/SB-07B/").removeprefix("docs/evidence/sb07b/")
        if hashlib.sha256(source.read(stored)).digest() != hashlib.sha256(raw).digest():
            raise SystemExit("Manifest verification failed: " + entry)
    assert source.read("SB-07B/MANIFEST.sha256").decode() == manifest

digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(EVIDENCE / "SB-07B-review.zip.sha256").write_text(digest + "  SB-07B-review.zip\n")
(EVIDENCE / "package-verification.json").write_text(json.dumps({
    "entries": len(content),
    "zip_bytes": archive.stat().st_size,
    "sha256": digest,
    "crc_and_manifest_verified": True,
    "human_results": "not performed",
}, indent=2))
print(f"Package: {archive} ({archive.stat().st_size} bytes), SHA-256 {digest}")
