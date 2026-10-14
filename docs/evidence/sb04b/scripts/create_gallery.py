"""Compose actual screenshots and approved prototype, with labels; no asset redesign."""
from pathlib import Path
import html,json,shutil
from PIL import Image,ImageOps,ImageDraw
R=Path('/home/leofernandesc/controlmax-inspired');E=Path(__file__).resolve().parents[1]
for width,label in [(1440,'desktop'),(768,'tablet'),(375,'mobile')]:
 proto=R/f'docs/silex-business/SB-01/renders/c-inicial-{label}.png';shutil.copy2(proto,E/f'screenshots/prototype-c-{width}.png')
 a=Image.open(proto).convert('RGB');b=Image.open(E/f'screenshots/candidate-admin-home-{width}.png').convert('RGB');target=720 if width==1440 else width
 a.resize((target,round(a.height*target/a.width)))
 images=[im.resize((target,round(im.height*target/im.width))) for im in [a,b]]
 canvas=Image.new('RGB',(2*target+24,max(im.height for im in images)+50),'#f4f6fa');draw=ImageDraw.Draw(canvas);draw.text((10,15),'SB-01 - PROTOTIPO C (DADOS FICTICIOS)',fill='#102d5c');draw.text((target+34,15),'SB-04B - IMPLEMENTACAO (FIXTURE ISOLADA)',fill='#102d5c')
 canvas.paste(images[0],(0,50));canvas.paste(images[1],(target+24,50));canvas.save(E/f'comparativo-c-{width}.png')
sections=[]
for width in [1440,768,375]:
 sections.append(f'<h2>{width} px — Inicial autenticada</h2><div class="pair"><figure><img src="screenshots/prototype-c-{width}.png" alt="Protótipo C aprovado em {width} pixels"><figcaption>SB-01 · protótipo C estático</figcaption></figure><figure><img src="screenshots/candidate-admin-home-{width}.png" alt="Página Inicial implementada, administrador, em {width} pixels"><figcaption>SB-04B · administrador · banco fictício isolado</figcaption></figure></div><p><a href="screenshots/candidate-operator-home-{width}.png">Operador</a> · <a href="screenshots/candidate-admin-home-text-200-{width}.png">Texto ampliado 200%, administrador</a> · <a href="screenshots/candidate-operator-home-text-200-{width}.png">Texto ampliado 200%, operador</a></p>')
 for id,label in [('public','Página pública'),('login','Login'),('dashboard','Visão Geral'),('customers','Clientes'),('sales','Vendas'),('stock','Estoque'),('finance','Lançamentos financeiros')]:
  sections.append(f'<details><summary>{label} — antes/depois · {width} px</summary><div class="pair"><figure><img loading="lazy" src="screenshots/baseline-admin-{id}-{width}.png" alt="{label} antes do incremento"><figcaption>SB-04A baseline</figcaption></figure><figure><img loading="lazy" src="screenshots/candidate-admin-{id}-{width}.png" alt="{label} após o incremento"><figcaption>SB-04B</figcaption></figure></div></details>')
 if width<=900:sections.append(f'<p><a href="screenshots/candidate-admin-home-menu-{width}.png">Menu móvel aberto por teclado · {width} px</a></p>')
(E/'galeria.html').write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão Silex Business SB-04B</title><style>body{font:16px system-ui;background:#f4f6fa;color:#172b45;max-width:1480px;margin:24px auto;padding:0 16px}h1,h2{color:#102d5c}a{color:#102d5c}a:focus-visible,summary:focus-visible{outline:2px solid #1769e8;outline-offset:3px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0;background:white;padding:12px;border:1px solid #dce4f0;border-radius:12px}img{display:block;max-width:100%;height:auto}figcaption{padding-top:8px}details{margin:20px 0}summary{cursor:pointer;padding:12px;background:white} @media(max-width:650px){.pair{grid-template-columns:1fr}}</style><h1>Silex Business — revisão SB-04B</h1><p>Capturas reais de ambiente local isolado com dados fictícios. A coluna SB-01 é um estudo estático, não a aplicação implementada.</p><p><a href="../../silex-business/SB-04B/RELATORIO.md">Relatório técnico</a> · <a href="tests-summary.json">Resultados</a> · <a href="preservation-test.json">Preservação</a> · <a href="backup-manifest.json">Backup</a></p>'+''.join(sections)+'</html>')
print('Gallery and three comparisons generated')
