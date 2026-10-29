"""Three standalone looping previews using the site's geographic ward artwork."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path.cwd(); OUT=ROOT/'tmp/map-animation-previews'
d=json.loads((ROOT/'data/map-wards.json').read_text())
features=d['features']; active=set(d['postcodes'].values())
W,H=960,720
allpts=[p for f in features for ring in f['geometry']['coordinates'] for p in ring]
x0=min(p[0] for p in allpts); x1=max(p[0] for p in allpts)
y0=min(p[1] for p in allpts); y1=max(p[1] for p in allpts)
# Correct longitude aspect at Manchester's latitude before fitting the artwork.
ratio=math.cos(math.radians(53.5)); scale=min(840/((x1-x0)*ratio),500/(y1-y0))
ox=(W-(x1-x0)*ratio*scale)/2; oy=130+(500-(y1-y0)*scale)/2
polys=[]
for f in features:
 rings=[[(ox+(p[0]-x0)*ratio*scale,oy+(y1-p[1])*scale) for p in ring] for ring in f['geometry']['coordinates']]
 polys.append((f['properties']['code'],rings))
def inside(x,y,ring):
 hit=False
 for a,b in zip(ring,ring[1:]+ring[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
cell=15; tiles={}
for y in range(125,635,cell):
 for x in range(45,915,cell):
  for code,rings in polys:
   if inside(x+cell/2,y+cell/2,rings[0]) and not any(inside(x+cell/2,y+cell/2,r) for r in rings[1:]):
    tiles[x,y]=code in active;break
fontpath='/System/Library/Fonts/Helvetica.ttc'
try:
 titlefont=ImageFont.truetype(fontpath,32); small=ImageFont.truetype(fontpath,13)
except OSError: titlefont=ImageFont.load_default();small=titlefont
base=Image.new('RGB',(W,H),'#111211');draw=ImageDraw.Draw(base)
for (x,y),green in tiles.items():
 draw.rectangle((x+1,y+1,x+cell-2,y+cell-2),fill='#466414' if green else '#202820',outline='#719f22' if green else '#354035')
# Pick long horizontal corridors within the active square grid.
runs=[]
for y in sorted(set(y for x,y in tiles)):
 xs=sorted(x for (x,yy),green in tiles.items() if yy==y and green)
 start=prev=None
 for x in xs+[10000]:
  if start is not None and x>prev+cell:
   if prev-start>=cell*4:runs.append((start+4,prev+cell-4,y+cell/2))
   start=None
  if x!=10000:
   if start is None:start=x
   prev=x
runs.sort(key=lambda r:r[1]-r[0],reverse=True)
chosen=[]
for route in runs:
 if all(abs(route[2]-r[2])>56 for r in chosen):chosen.append(route)
 if len(chosen)==3:break
if not chosen:raise RuntimeError('No usable active zone corridors')
INK=(246,255,222,255); LIME=(223,252,58,255)
def stroke(dr,pts,width=3,fill=INK):dr.line(pts,fill=fill,width=width,joint='curve')
def runner(dr,x,y,phase):
 s=math.sin(phase);c=math.cos(phase); y+=abs(c)*1.5
 dr.ellipse((x-3,y-27,x+4,y-20),fill=INK)
 hip=(x-1,y-7); shoulder=(x+2,y-18)
 stroke(dr,[shoulder,hip]);stroke(dr,[shoulder,(x-5,y-14),(x-10,y-17-3*s)])
 stroke(dr,[shoulder,(x+8,y-13),(x+12,y-17+3*s)])
 for v in [-1,1]:stroke(dr,[hip,(x+v*8*s,y-1),(x+v*13*s,y+7)])
def cyclist(dr,x,y,phase):
 for cx in [x-14,x+14]:
  dr.ellipse((cx-9,y-8,cx+9,y+10),outline=INK,width=2)
  stroke(dr,[(cx-8*math.cos(phase),y+1-8*math.sin(phase)),(cx+8*math.cos(phase),y+1+8*math.sin(phase))],1, LIME)
 a=(x-14,y+1);b=(x+1,y+1);c=(x-6,y-12);e=(x+9,y-12);f=(x+14,y+1)
 stroke(dr,[a,b,c,a,e,b,f,e,(x+8,y-18),(x+13,y-18)],2,LIME)
 dr.ellipse((x+3,y-31,x+10,y-24),fill=INK)
 stroke(dr,[(x+5,y-23),(x-4,y-19),(x-6,y-12)])
 stroke(dr,[(x+3,y-22),(x+9,y-18),(x+12,y-18)],2)
 pedal=(x+1+6*math.cos(phase),y+1+6*math.sin(phase))
 stroke(dr,[(x-5,y-14),(x+5,y-8),pedal],3)
def swimmer(dr,x,y,phase):
 dr.ellipse((x+10,y-8,x+17,y-1),fill=INK)
 stroke(dr,[(x+10,y-2),(x-12,y+1),(x-24,y-1)],3)
 stroke(dr,[(x+5,y-2),(x+1+12*math.cos(phase),y-7-10*abs(math.sin(phase))),(x+16*math.cos(phase),y-5-7*abs(math.sin(phase)))],3)
 stroke(dr,[(x-12,y+2),(x-23,y+5+3*math.sin(phase))],2)
 for yy in [y+8,y+13]:
  stroke(dr,[(x-28+i*5,yy+math.sin(i*1.6+phase)*1.8) for i in range(11)],1,LIME)
funcs={'running':runner,'cycling':cyclist,'swimming':swimmer}
# Shared palette avoids per-frame colour flashing and keeps the files small.
palette=Image.new('RGB',(256,1));pd=ImageDraw.Draw(palette)
for i in range(256):pd.point((i,0),fill=(i,i,i))
colours=[(17,18,17),(32,40,32),(53,64,53),(70,100,20),(113,159,34),(223,252,58),(246,255,222)]
for i,col in enumerate(colours):pd.point((i,0),fill=col)
for sport,func in funcs.items():
 bg=base.copy();dr=ImageDraw.Draw(bg)
 dr.text((48,37),'THE 0161 MAP',font=titlefont,fill='#dffc3a')
 dr.text((48,83),f'{sport.upper()} / THREE-SECOND LOOP PREVIEW',font=small,fill='#a5aaa2')
 dr.line((48,112,912,112),fill='#454945')
 dr.text((48,666),'SQUARE ZONE STUDY',font=small,fill='#a5aaa2')
 dr.text((600,666),'0161 ACTIVE / DESIGN PREVIEW',font=small,fill='#a5aaa2')
 frames=[]
 for frame in range(60):
  t=frame/60;im=bg.convert('RGBA')
  for k,(left,right,y) in enumerate(chosen):
   # Whole figure enters/exits through a short fade so the wrap remains seamless.
   u=(t+k*.31)%1; x=left+u*(right-left)
   opacity=min(1,u/.1,(1-u)/.1)
   layer=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(layer)
   func(ld,x,y+3,t*math.tau*4+k)
   layer.putalpha(layer.getchannel('A').point(lambda a:round(a*opacity)))
   im=Image.alpha_composite(im,layer)
  frames.append(im.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE))
 frames[0].save(OUT/f'{sport}.gif',save_all=True,append_images=frames[1:],duration=50,loop=0,optimize=True,disposal=1)
 frames[15].convert('RGB').save(OUT/f'{sport}-poster.png')
 print(sport,(OUT/f'{sport}.gif').stat().st_size)
