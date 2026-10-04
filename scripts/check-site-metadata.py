"""Validate generated HTML, sitemap exclusions, share assets and verification labels."""
import json
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
BASE = json.loads((ROOT / 'data/site.json').read_text())['publicUrl'].rstrip('/')
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonicals = []
        self.ids = []
        self.text = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
        if tag == 'meta':
            key = a.get('property', a.get('name', ''))
            if key.startswith(('og:', 'twitter:')):
                assert key not in self.meta, f'duplicate {key}'
            self.meta[key] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonicals.append(a['href'])
        if tag == 'img':
            assert 'alt' in a, 'image missing alt text'
        if tag == 'a':
            self.links.append(a.get('href', ''))
    def handle_data(self, text):
        self.text.append(text)

urls = [e.text for e in ET.parse(ROOT / 'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(urls) == len(set(urls)), 'duplicate sitemap URL'
pages = {}
indexable = set()
footer = (ROOT / 'templates/site-footer.inc').read_text().strip()
for file in ROOT.rglob('*.html'):
    relative = file.relative_to(ROOT).as_posix()
    if relative == 'html/nav.html':
        continue
    p = Page()
    source = file.read_text()
    for script in re.finditer(r'<script\b([^>]*)>', source):
        src = re.search(r'\bsrc="([^"]+)"', script[1])
        if not src or urlsplit(src[1]).netloc:
            continue
        script_path = urlsplit(src[1]).path
        local_script = ROOT / script_path.lstrip('/') if script_path.startswith('/') else file.parent / script_path
        if local_script.is_file() and re.search(r'^\s*import\s', local_script.read_text(), re.M):
            assert re.search(r'\btype="module"', script[1]), f'{relative}: module script loaded as classic: {src[1]}'
    assert source.count('data-site-footer') == 1 and footer in source, f'{relative}: missing or inconsistent footer'
    assert 'href="/css/site-footer.css"' in source, f'{relative}: missing footer stylesheet'
    assert source.count('src="/js/cookie-settings.js"') == 1, f'{relative}: missing or duplicate cookie script'
    assert source.count('href="/css/cookie-settings.css"') == 1, f'{relative}: missing or duplicate cookie stylesheet'
    assert source.count('src="/js/accessibility.js"') == 1, f'{relative}: missing or duplicate accessibility script'
    assert source.count('href="/css/accessibility.css"') == 1, f'{relative}: missing or duplicate accessibility stylesheet'
    p.feed(source)
    assert len(p.ids) == len(set(p.ids)), f'duplicate ids: {relative}'
    for key in ('description', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image'):
        assert p.meta.get(key), f'{relative}: missing {key}'
    assert p.meta['og:description'] == p.meta['description'], relative
    assert p.meta['twitter:image'] == p.meta['og:image'], relative
    assert p.canonicals == [p.meta['og:url']], relative
    assert p.meta['og:url'].startswith(BASE + '/'), relative
    image = urlsplit(p.meta['og:image'])
    assert image.scheme == 'https' and image.netloc == urlsplit(BASE).netloc, relative
    assert (ROOT / unquote(image.path.lstrip('/'))).is_file(), relative
    assert not re.search(r'<title>(Club profile|Image 2 Page)', source), relative
    assert not any(re.search(r'(?:^|/)index\.html$', link) for link in p.links if not urlsplit(link).netloc or urlsplit(link).netloc == urlsplit(BASE).netloc), relative
    if 'noindex' not in p.meta.get('robots', ''):
        indexable.add(p.meta['og:url'])
    pages[relative] = p
assert set(urls) == indexable, 'sitemap does not match indexing policy'
assert pages['index.html'].meta['og:url'] == BASE + '/'
assert f'Sitemap: {BASE}/sitemap.xml' in (ROOT / 'robots.txt').read_text()
clubs = json.loads((ROOT / 'data/clubs.json').read_text())['clubs']
for club in clubs:
    p = pages[club['profilePath']]
    assert 'profile-title' in p.ids, club['id']
    assert club['name'] in ''.join(p.text), club['id']
    v = club['verification']
    assert v['lastSourceCheck'] == club.get('research', {}).get('checkedAt'), club['id']
    assert 'Information last checked:' in ''.join(p.text), club['id']
    if not club.get('confirmed'):
        assert 'Unverified · Information last checked:' in ''.join(p.text), club['id']
    assert 'profile-verification' not in (ROOT / club['profilePath']).read_text(), club['id']
print(f'Checked {len(pages)} pages, {len(clubs)} static profiles and {len(urls)} sitemap URLs.')
