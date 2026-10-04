"""One-time, cached Nominatim lookup of public club locations. No browser geocoding."""
import csv
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/club-map-locations.json'
CACHE = ROOT / 'data/geocoding-cache.json'
URL = 'https://nominatim.openstreetmap.org/search'
HEADERS = {'User-Agent': '0161Active-ClubMap/1.0 (https://0161active.co.uk; contact.0161active@gmail.com)'}
clubs = json.loads((ROOT / 'data/clubs.json').read_text())['clubs']
data = json.loads(DATA.read_text())
cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
last_request = 0
rows = []

def save():
    CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + '\n')
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

def lookup(query):
    global last_request
    if query in cache:
        return cache[query]
    time.sleep(max(0, 1.1 - (time.monotonic() - last_request)))
    params = {'q': query + ', United Kingdom', 'format': 'jsonv2', 'limit': 1,
              'countrycodes': 'gb', 'viewbox': '-2.85,53.85,-1.9,53.25', 'bounded': 1}
    last_request = time.monotonic()
    try:
        with urlopen(Request(URL + '?' + urlencode(params), headers=HEADERS), timeout=25) as response:
            result = json.load(response)
    except HTTPError as error:
        if error.code in (403, 429):
            save()
            raise SystemExit(f'Nominatim returned {error.code}; stopped without retrying.')
        print(f'HTTP error for {query}: {error.code}', flush=True)
        return []
    except Exception as error:
        print(f'Lookup failed for {query}: {error}', flush=True)
        return []
    cache[query] = result
    save()
    return result

def address_for(club):
    raw = club.get('location') or club.get('research', {}).get('fields', {}).get('Address / meeting point')
    if not raw or raw.strip().lower() in ('manchester', 'unknown', 'not listed'):
        return None
    value = re.sub(r'\([^)]*\)', '', raw)
    # Repair spaces introduced within UK postcodes in the imported research.
    value = re.sub(r'\b([A-Z]{1,2})\s*(\d{1,2})\s*(\d)\s*([A-Z])\s*([A-Z])\b', r'\1\2 \3\4\5', value)
    value = re.sub(r'\s+', ' ', value).strip(' ,')
    return value

def area_for(club):
    area = (club.get('area') or 'Manchester').split('/')[0].strip()
    if area == 'City Centre': return 'Manchester city centre'
    if area in ('Seedfield', 'Redvales'): return area + ', Bury'
    if area == 'Markland Hill': return area + ', Bolton'
    if area == 'Spotland': return area + ', Rochdale'
    return area + ', Greater Manchester'

for club in clubs:
    if club.get('coordinates'):
        continue
    existing = data['locations'].get(club['id'])
    if existing and not (existing.get('matchType') == 'road' and existing.get('precision') == 'venue'):
        rows.append({'club_id': club['id'], 'club': club['name'], 'address': existing.get('query',''), 'latitude': existing['lat'], 'longitude': existing['lon'], 'match_type': existing.get('matchType',''), 'precision': existing['precision'], 'matched_address': existing.get('matchedAddress','')})
        continue
    address = address_for(club)
    query = address
    results = lookup(query) if query else []
    if results and results[0].get('addresstype') == 'road':
        results = []  # A road centroid is not a match for the requested club venue.
    precision = 'venue'
    if not results:
        query = area_for(club)
        results = lookup(query)
        precision = 'area'
    if results:
        match = results[0]
        point = {'lat': float(match['lat']), 'lon': float(match['lon']), 'precision': precision,
                 'confirmed': False, 'query': query, 'matchedAddress': match.get('display_name',''),
                 'matchType': match.get('addresstype',''), 'source': URL,
                 'sourceId': f"{match.get('osm_type','')}/{match.get('osm_id','')}", 'geocodedAt': '2026-10-04'}
        # A settlement result is an area approximation even when queried by address.
        if point['matchType'] in ('city','town','village','suburb','quarter','neighbourhood','borough'):
            point['precision'] = 'area'
        data['locations'][club['id']] = point
        rows.append({'club_id':club['id'],'club':club['name'],'address':query,'latitude':point['lat'],'longitude':point['lon'],'match_type':point['matchType'],'precision':point['precision'],'matched_address':point['matchedAddress']})
        print(f"{club['name']}: {point['precision']} match", flush=True)
    else:
        rows.append({'club_id':club['id'],'club':club['name'],'address':query,'latitude':'','longitude':'','match_type':'NOT FOUND','precision':'','matched_address':''})
        print(f"{club['name']}: NOT FOUND", flush=True)
    save()
output = ROOT / 'outputs/geocoded-clubs.csv'
output.parent.mkdir(exist_ok=True)
with output.open('w',newline='') as file:
    writer = csv.DictWriter(file, fieldnames=['club_id','club','address','latitude','longitude','match_type','precision','matched_address'])
    writer.writeheader(); writer.writerows(rows)
print(f"Done: {len(rows)} clubs processed, {sum(r['match_type']=='NOT FOUND' for r in rows)} not found. Saved {output}.", flush=True)
