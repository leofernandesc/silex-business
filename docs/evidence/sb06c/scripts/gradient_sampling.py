"""Local gradient estimates from DOM line boxes and rendered adjacent pixels."""
from pathlib import Path
import json, math, re
from PIL import Image

E=Path(__file__).resolve().parents[1]
def luminance(c):
 a=[v/255 for v in c]
 return sum(v*w for v,w in zip([v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a],[.2126,.7152,.0722]))
out=[]
for row in json.loads((E/'dashboard-settled-recheck.json').read_text()):
 if row['width']==320:continue
 im=Image.open(E/f"screenshots/{row['variant']}-dashboard-{row['width']}.png").convert('RGB')
 for text in row['gradients']['text']:
  a=luminance([float(v) for v in re.findall(r'[\d.]+',text['foreground'])]);ratios=[]
  for rect in text['rects']:
   y=max(0,math.floor(rect['y'])-1)
   for x in range(math.ceil(rect['x']),math.floor(rect['x']+rect['width'])):
    b=luminance(im.getpixel((x,y)));ratios.append((max(a,b)+.05)/(min(a,b)+.05))
  out.append({'variant':row['variant'],'width':row['width'],'text':text['text'],'minimum_local_estimate':min(ratios),'method':'DOM Range line boxes; rendered background pixels one px above each line, across text columns. Local estimate, not exhaustive pixel/overlay certification.'})
assert all(r['minimum_local_estimate']>=4.5 for r in out if r['variant']=='candidate')
(E/'gradient-sampling.json').write_text(json.dumps(out,indent=2))
print([(r['variant'],r['width'],round(r['minimum_local_estimate'],3)) for r in out])
