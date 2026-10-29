"""Rebuild changed Trafford and Stockport ward partitions offline from archived references."""
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from pathlib import Path
from collections import deque
import numpy as np
import xml.etree.ElementTree as ET
import re
import pdfplumber
root=Path(__file__).resolve().parents[1]
archive=root/'archive/artwork/borough-source-cutouts'
# Read the 21 actual ward polygons from the supplied Trafford vector map.
r=ET.parse(archive/'trafford-ward-reference.svg').getroot()
paths=[p for p in r.iter('{http://www.w3.org/2000/svg}path') if 'fill: #CCE3AA' in p.get('style','')]
im=Image.new('L',(1008,1008));d=ImageDraw.Draw(im)
for i,p in enumerate(paths,1):
 for ring in re.findall(r'M([^M]+)',p.get('d')):
  nums=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',ring)))
  d.polygon([(nums[j]*2,nums[j+1]*2) for j in range(0,len(nums),2)],fill=i)
im=im.crop(im.getbbox());im.save(archive/'trafford-ward-partition.png')
# Extract only the red ward lines and green perimeter from the Stockport PDF.
with pdfplumber.open(archive/'stockport-ward-reference.pdf') as doc:
 p=doc.pages[0];im=Image.new('L',(int(p.width*2),int(p.height*2)),255);d=ImageDraw.Draw(im)
 for c in p.curves:
  if c.get('stroking_color') in [(1.,0.,0.),(0.,.5,0.)]:
   pts=[(x*2,y*2) for x,y in c['pts']]
   if len(pts)>1:d.line(pts,fill=0,width=3)
# Close subpixel gaps, separate the closed interiors and discard the page exterior.
im=im.filter(ImageFilter.MinFilter(3))
a=np.asarray(im).copy()>128;h,w=a.shape
components=[]
for sy,sx in zip(*np.where(a)):
 if not a[sy,sx]:continue
 q=deque([(int(sy),int(sx))]);a[sy,sx]=False;pixels=[]
 while q:
  y,x=q.popleft();pixels.append((y,x))
  for yy,xx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
   if 0<=yy<h and 0<=xx<w and a[yy,xx]:a[yy,xx]=False;q.append((yy,xx))
 if len(pixels)>500 and all(y not in [0,h-1] and x not in [0,w-1] for y,x in pixels):components.append(pixels)
print('Stockport enclosed components:',len(components))
out=np.zeros((h,w),dtype=np.uint8)
for i,c in enumerate(components,1):
 ys,xs=zip(*c);out[ys,xs]=i
im=Image.fromarray(out).rotate(270,expand=True);im=im.crop(im.getbbox());im.save(archive/'stockport-ward-partition.png')
