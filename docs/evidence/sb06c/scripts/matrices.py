"""Condense rendered measurements; raw audit logs remain local."""
from pathlib import Path
from collections import defaultdict
import json, re

R=Path(__file__).resolve().parents[4]
E=R/'docs/evidence/sb06c'
versions={v:json.loads((E/(v+'-audit.json')).read_text()) for v in ['baseline','candidate']}
recheck=E/'dashboard-settled-recheck.json'
if recheck.exists():
 for r in json.loads(recheck.read_text()):
  versions[r['variant']]['results']=[x for x in versions[r['variant']]['results'] if not (x['route']=='dashboard' and x['width']==r['width'] and x['state']=='default')]+[r]
for v in versions:
 initial=E/(v+'-initial-audit.json')
 if initial.exists():
  versions[v]['results'] += [r for r in json.loads(initial.read_text())['results'] if r['state'] in ['hover','focus']]
contrast=defaultdict(lambda:{'routes':set(),'affected_routes':set(),'widths':set(),'baseline':[],'candidate':[]})
targets={v:defaultdict(list) for v in versions}
fields={v:[] for v in versions}
placeholders={v:[] for v in versions}
icons={v:[] for v in versions}
def placeholder_ratio(p,background):
 a=[float(x) for x in re.findall(r'[\d.]+',p['color'])];scale=255 if p['color'].startswith('color(srgb ') else 1
 alpha=(a[3] if len(a)>3 else 1)*float(p['opacity'])
 fg=[a[i]*scale*alpha+background[i]*(1-alpha) for i in range(3)]
 def lum(c):
  a=[v/255 for v in c];return sum(v*w for v,w in zip([v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a],[.2126,.7152,.0722]))
 x,y=lum(fg),lum(background);return (max(x,y)+.05)/(min(x,y)+.05)
for v,j in versions.items():
 for r in j['results']:
  for t in r['texts']:
   if t['uncertain'] or t['disabled']:continue
   key=(t['selector'],r['state'])
   contrast[key]['routes'].add(r['route']);contrast[key]['widths'].add(r['width']);contrast[key][v].append(t['ratio'])
   if v=='baseline' and t['fail']:contrast[key]['affected_routes'].add(r['route'])
  if r['state'] not in ['default','dialog']:continue
  for c in r['controls']:
   targets[v][(r['route'],r['width'],r['state'],c['selector'])].append(c)
   if c['iconRatio'] is not None and not c['disabled']:icons[v].append({'route':r['route'],'width':r['width'],'selector':c['selector'],'name':c['name'],'ratio':c['iconRatio'],'uncertain':c['uncertain']})
   if c['placeholder'] and not c['disabled']:placeholders[v].append({'route':r['route'],'width':r['width'],'selector':c['selector'],'ratio':placeholder_ratio(c['placeholder'],c['background'])})
   if not c['disabled'] and c.get('type') in ['text','password','number','date','month','select-one','textarea']:
    if float(c['borderWidth'].removesuffix('px'))>0:fields[v].append({'route':r['route'],'width':r['width'],'selector':c['selector'],'ratio':c['borderRatio']})
    if c['wrapper']:fields[v].append({'route':r['route'],'width':r['width'],'selector':c['wrapper']['selector'],'ratio':c['wrapper']['borderRatio']})
rows=[]
for (selector,state),d in contrast.items():
 rows.append({'selector':selector,'state':state,'routes':sorted(d['routes']),'affected_baseline_routes':sorted(d['affected_routes']),'widths':sorted(d['widths']),'baseline_min':min(d['baseline']) if d['baseline'] else None,'candidate_min':min(d['candidate']) if d['candidate'] else None,'baseline_samples':len(d['baseline']),'candidate_samples':len(d['candidate'])})
(E/'contrast-matrix.json').write_text(json.dumps({'text':rows,'control_boundaries':fields,'placeholders':placeholders,'control_icons':icons,'note':'Ratios are unrounded for evaluation. Threshold per text sample in raw audit; disabled/gradients excluded from automatic pass. Color4 placeholders recomputed from raw colors. Icons measured against composed control background; redundant inner decorations are not independently classified as essential controls.'},indent=2))
inventory=[]
for v,groups in targets.items():
 for (route,width,state,selector),cs in groups.items():
  inventory.append({'variant':v,'route':route,'viewport':width,'state':state,'selector':selector,'count':len(cs),'minimum_width':min(c['rect']['width'] for c in cs),'minimum_height':min(c['rect']['height'] for c in cs),'below_24':sum(c['below24'] for c in cs),'small_with_neighbor_collision':sum(c['below24'] and bool(c['spacingCollisions']) for c in cs),'disabled':sum(c['disabled'] for c in cs),'names':sorted(set(c['name'] for c in cs))})
(E/'target-inventory.json').write_text(json.dumps(inventory,indent=2,ensure_ascii=False))
summary={v:{'states':len(j['results']),'default_screen_width_combinations':sum(r['state']=='default' for r in j['results']),'page_errors':j['errors'],'text_samples':sum(len(r['texts']) for r in j['results']),'failing_text_samples':sum(t['fail'] for r in j['results'] for t in r['texts']),'uncertain_text_samples':sum(t['uncertain'] and not t['disabled'] for r in j['results'] for t in r['texts']),'field_boundary_min':min(x['ratio'] for x in fields[v]),'field_boundaries_below_3':sum(x['ratio']<3 for x in fields[v]),'target_collisions_below_24':sum(r['small_with_neighbor_collision'] for r in inventory if r['variant']==v)} for v,j in versions.items()}
for v in summary:
 summary[v]['placeholder_min']=min(x['ratio'] for x in placeholders[v])
 summary[v]['placeholders_below_4_5']=sum(x['ratio']<4.5 for x in placeholders[v])
 summary[v]['control_icon_min']=min(x['ratio'] for x in icons[v] if not x['uncertain'])
 summary[v]['control_icons_below_3']=sum(x['ratio']<3 for x in icons[v] if not x['uncertain'])
(E/'audit-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
D=R/'docs/silex-business/SB-06C';D.mkdir(exist_ok=True)
lines=['# Matriz de contraste — SB-06C','','Razões mínimas por família e estado, medidas no navegador. Amostras repetem instâncias/estados; não representam quantidade de defeitos únicos. Dados completos em contrast-matrix.json, screen-matrix.json e audit-summary.json. Gradientes, desabilitados e exceções são discutidos separadamente.','','| Seletor | Estado | Antes | Depois | Telas |','| --- | --- | --- | --- | --- |']
for row in rows:
 if row['affected_baseline_routes']:
  after=f"{row['candidate_min']:.3f}" if row['candidate_min'] is not None else 'não pareado'
  lines.append(f"| `{row['selector']}` | {row['state']} | {row['baseline_min']:.3f} | {after} | {', '.join(row['affected_baseline_routes'])} |")
lines+=['','## Campos e placeholders','','| Medição | Antes | Depois | Limiar |','| --- | --- | --- | --- |',f"| Borda relevante de campo, mínimo | {summary['baseline']['field_boundary_min']:.3f} | {summary['candidate']['field_boundary_min']:.3f} | 3:1 |",f"| Placeholder, mínimo composto | {summary['baseline']['placeholder_min']:.3f} | {summary['candidate']['placeholder_min']:.3f} | 4,5:1 |",'','## Limites','', 'A borda de campo é conferida contra a superfície adjacente; não se exige 3:1 das bordas decorativas de tabelas/cartões nem de cada contorno de botão com texto/ícone suficiente. Placeholders são medidos com a opacidade computada. Feedbacks e variantes de badges também possuem teste sintético de CSS, sem criar registros operacionais. O banner da Visão Geral tem gradiente: a composição por ancestrais não mede seus pixels e não autoriza uma declaração global de conformidade. O parágrafo foi corrigido para branco; gradient-sampling.json conserva a estimativa local após a correção e gradient-sampling-before-fix.json a evidência anterior.']
(D/'CONTRASTES.md').write_text('\n'.join(lines)+'\n')
