"""Prepare supplied ward polygons and club-postcode assignments offline, without network calls."""
import csv
import io
import json
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BOROUGHS = {'Bolton', 'Bury', 'Manchester', 'Oldham', 'Rochdale', 'Salford',
            'Stockport', 'Tameside', 'Trafford', 'Wigan'}
SOURCE = ROOT / 'archive/geo/wards-may-2026-source.geojson'
CACHE = Path(tempfile.gettempdir()) / '0161-open-postcode-geo.csv.zip'
POSTCODE = re.compile(r'\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b', re.I)

def postcode(session):
    match = POSTCODE.search(session.get('postcode') or session.get('meetingPoint') or '')
    return re.sub(r'\s', '', match.group()).upper() if match else None

def in_ring(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0]) * (y-a[1]) / (b[1]-a[1]) + a[0]:
            inside = not inside
    return inside

def contains(point, geometry):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(in_ring(point, rings[0]) and not any(in_ring(point, hole) for hole in rings[1:])
               for rings in polygons)

# Preserve supplied geometry; remove export metadata that the browser does not need.
wards = []
for feature in json.loads(SOURCE.read_text())['features']:
    props = feature['properties']
    if props['LAD26NM'] in BOROUGHS:
        wards.append({'type': 'Feature', 'properties': {
            'code': props['WD26CD'], 'name': props['WD26NM'], 'borough': props['LAD26NM']},
            'geometry': feature['geometry']})
clubs = json.loads((ROOT / 'data/clubs.json').read_text())['clubs']
postcodes = {code for club in clubs for session in club.get('sessions', [])
             if (code := postcode(session))}
if not CACHE.exists():
    raise SystemExit('Offline postcode cache is missing; no map data written.')
points = {}
with ZipFile(CACHE) as archive:
    with archive.open(next(name for name in archive.namelist() if name.endswith('.csv'))) as raw:
        for row in csv.reader(io.TextIOWrapper(raw, encoding='utf-8-sig')):
            code = re.sub(r'\s', '', row[0]).upper()
            if code in postcodes and row[1] == 'live' and row[5] in ('1', '2', '3', '4', '5'):
                points[code] = (float(row[8]), float(row[7]))
assignments = {}
for code, point in points.items():
    matches = [ward['properties']['code'] for ward in wards if contains(point, ward['geometry'])]
    if len(matches) == 1:
        assignments[code] = matches[0]
result = {'type': 'FeatureCollection', 'features': wards, 'postcodes': assignments,
          'boundarySource': 'User-supplied WD_MAY_2026_UK_BSC GeoJSON. Simplified boundaries; origin and licence not independently verified.',
          'postcodeSource': 'GetTheData Open Postcode Geo, August 2023 ONS Postcode Directory',
          'attribution': 'Contains OS data © Crown copyright and database right',
          'unassignedPostcodes': sorted(postcodes - assignments.keys())}
output = ROOT / 'data/map-wards.json'
output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(f'Prepared {len(wards)} wards; assigned {len(assignments)}/{len(postcodes)} session postcodes; {output.stat().st_size} bytes.')
