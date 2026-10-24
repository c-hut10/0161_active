"""Build a compact, offline sector-centre lookup from licensed public postcode data."""
import csv
import io
import json
import math
from pathlib import Path
import tempfile
from urllib.request import urlretrieve
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://download.getthedata.com/downloads/open_postcode_geo.csv.zip'
CACHE = Path(tempfile.gettempdir()) / '0161-open-postcode-geo.csv.zip'
if not CACHE.exists():
    print('Downloading public postcode data for offline preparation...', flush=True)
    partial = CACHE.with_suffix('.download')
    urlretrieve(SOURCE, partial)
    partial.replace(CACHE)
sums = {}
with ZipFile(CACHE) as archive:
    name = next(name for name in archive.namelist() if name.endswith('.csv'))
    with archive.open(name) as raw:
        # Source CSV has no header; columns follow the published Open Postcode Geo schema.
        for row in csv.reader(io.TextIOWrapper(raw, encoding='utf-8-sig')):
            if len(row) < 17 or row[1] != 'live' or row[2] != 'small':
                continue
            try:
                quality = int(row[5])
                lat, lon = float(row[7]), float(row[8])
            except (ValueError, TypeError):
                continue
            if quality not in (1, 2, 3, 4, 5) or not (math.isfinite(lat) and math.isfinite(lon)):
                continue
            sector = row[14].strip().upper()
            point = sums.setdefault(sector, [0., 0., 0])
            point[0] += lat
            point[1] += lon
            point[2] += 1
if len(sums) < 1000:
    raise SystemExit('Source columns or coverage look unexpected; no lookup written.')
result = {
    'source': 'https://www.getthedata.com/open-postcode-geo',
    'sourceVersion': 'August 2023 ONS Postcode Directory',
    'method': 'Unweighted mean of live small-user postcode coordinates, quality 1–5, within each sector. Sector centres are estimates, not boundary centroids.',
    'attribution': 'Contains OS data © Crown copyright and database right 2023; contains Royal Mail data © Royal Mail copyright and database right 2023; contains National Statistics data © Crown copyright and database right 2023. Sector data derived from GetTheData Open Postcode Geo.',
    'sectors': {sector: [round(lat / count, 5), round(lon / count, 5)] for sector, (lat, lon, count) in sorted(sums.items())}
}
(ROOT / 'data/postcode-sectors.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(f'Prepared {len(sums)} sector centres.', flush=True)
