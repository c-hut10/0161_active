"""Trace internal shapes offline from the supplied borough cutouts; names remain unconfirmed."""
import json
from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]

def trace(mask):
    h, w = mask.shape
    edges = {}
    def edge(a, b):
        edges.setdefault(a, []).append(b)
    for y, x in zip(*np.where(mask)):
        x, y = int(x), int(y)
        if y == 0 or not mask[y-1, x]: edge((x,y), (x+1,y))
        if x == w-1 or not mask[y, x+1]: edge((x+1,y), (x+1,y+1))
        if y == h-1 or not mask[y+1, x]: edge((x+1,y+1), (x,y+1))
        if x == 0 or not mask[y, x-1]: edge((x,y+1), (x,y))
    rings = []
    while edges:
        start = next(iter(edges))
        point, ring = start, []
        while True:
            ring.append(point)
            options = edges[point]
            following = options.pop()
            if not options: del edges[point]
            point = following
            if point == start: break
        corners = [p for i,p in enumerate(ring)
                   if (p[0]-ring[i-1][0])*(ring[(i+1)%len(ring)][1]-p[1])
                   != (p[1]-ring[i-1][1])*(ring[(i+1)%len(ring)][0]-p[0])]
        if corners:
            rings.append('M'+'L'.join(f'{x} {y}' for x,y in corners)+'Z')
    return ''.join(rings)

# Each source is already cropped to its borough outline. Dark boundary lines separate interiors.
regions = {}
for source in sorted((ROOT/'archive/artwork/borough-source-cutouts').glob('*.png')):
    if '-' not in source.stem or not source.stem.split('-',1)[0].isdigit(): continue
    slug = source.stem.split('-',1)[1].lower()
    label_file = source.parent/f'{slug}-ward-labels.json'
    area_labels = json.loads(label_file.read_text())['areas'] if label_file.exists() else {}
    # Newer references may supply a labelled partition when ward boundaries changed.
    partition = source.parent/f'{slug}-ward-partition.png'
    if partition.exists():
        labels = np.asarray(Image.open(partition).convert('L'), dtype=np.int32).copy()
        area_count = int(labels.max())
    else:
        image = Image.open(source).convert('RGBA')
        image.thumbnail((360,360), Image.Resampling.NEAREST)
        pixels = np.asarray(image)
        available = (pixels[:,:,3] > 200) & (pixels[:,:,:3].max(2) > 110)
        h,w = available.shape
        labels = np.zeros((h,w), dtype=np.int32)
        area_count = 0
        for sy,sx in zip(*np.where(available)):
            if not available[sy,sx]: continue
            queue = deque([(int(sy),int(sx))])
            available[sy,sx] = False
            component = []
            while queue:
                y,x = queue.popleft()
                component.append((y,x))
                for yy,xx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
                    if 0 <= yy < h and 0 <= xx < w and available[yy,xx]:
                        available[yy,xx] = False
                        queue.append((yy,xx))
            if len(component) < 30: continue
            area_count += 1
            ys,xs = zip(*component)
            labels[ys,xs] = area_count
    # Partition the approved outer silhouette, filling former black-line gaps with the nearest area.
    outer_image = Image.open(ROOT/f'archive/artwork/manchester-regions/masks/{slug}.png').convert('L')
    outer_image = outer_image.resize((400,300), Image.Resampling.NEAREST).resize((1200,900), Image.Resampling.NEAREST)
    outer_image = outer_image.crop(outer_image.getbbox())
    outer = np.asarray(outer_image) > 128
    labels = np.asarray(Image.fromarray(labels).resize(outer_image.size, Image.Resampling.NEAREST)).copy()
    labels[~outer] = 0
    h,w = labels.shape
    queue = deque((int(y),int(x)) for y,x in zip(*np.where(labels)))
    while queue:
        y,x = queue.popleft()
        for yy,xx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
            if 0 <= yy < h and 0 <= xx < w and outer[yy,xx] and labels[yy,xx] == 0:
                labels[yy,xx] = labels[y,x]
                queue.append((yy,xx))
    shapes = [{'name':area_labels.get(str(number), {}).get('name', 'Area to confirm'),
               'confirmedName':str(number) in area_labels,
               'wardNumber':area_labels.get(str(number), {}).get('number'),
               'path':trace(labels == number)}
              for number in range(1,area_count+1) if np.any(labels == number)]
    # Draw shared dividing edges once. Edges adjoining empty space belong to the outer outline only.
    borders = []
    for y,x in zip(*np.where(labels)):
        y,x = int(y),int(x)
        if x+1 < w and labels[y,x+1] and labels[y,x] != labels[y,x+1]:
            borders.append(f'M{x+1} {y}v1')
        if y+1 < h and labels[y+1,x] and labels[y,x] != labels[y+1,x]:
            borders.append(f'M{x} {y+1}h1')
    regions[slug] = {'viewBox':f'-16 -16 {w+32} {h+32}', 'areas':shapes,
                     'borders':''.join(borders), 'outline':trace(outer)}
    print(f'{slug}: {len(shapes)} shapes, {sum(shape["confirmedName"] for shape in shapes)} named from reference')
(ROOT/'js/home-region-shapes.mjs').write_text(
    '/* Generated offline by scripts/build-region-details.py. Area labels require confirmation. */\n'
    +'export const regionShapes = '+json.dumps(regions,separators=(',',':'))+';\n')
