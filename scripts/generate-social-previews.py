"""Generate static share metadata and branded cards. Pass the public site URL."""
import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import quote, urlsplit
from html.parser import HTMLParser
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.description = ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name') == 'description':
            self.description = attrs.get('content', '')

TITLES = {
    'index.html': 'Movement for everyone',
    '404.html': 'Lost your way?',
    'html/about.html': 'About 0161 Active',
    'html/contact.html': 'Contact 0161 Active',
    'html/privacy.html': 'Privacy policy',
    'html/resources.html': 'Resources',
    'html/random.html': 'Not A Running Club image page',
    'html/Test.html': 'Neon cursor demonstration',
    'html/calendar.html': 'Club calendar',
    'html/register.html': 'Register your club',
    'html/sports/directory.html': 'Sports directory',
    'html/sports/glossary.html': 'Find your sport',
    'html/sports/running.html': 'Run Club directory',
}

def font(size):
    return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', size)

def card(path, title, eyebrow, photo):
    image = Image.new('RGB', (1200, 630), '#111211')
    draw = ImageDraw.Draw(image)
    text_width = 680 if photo else 1080
    if photo:
        with Image.open(ROOT / photo) as source:
            image.paste(ImageOps.fit(source.convert('RGB'), (400, 470)), (748, 104))
    draw.text((56, 44), '0161 ACTIVE', font=font(28), fill='#dffc3a')
    draw.line((56, 88, 1144, 88), fill='#454945', width=2)
    draw.text((56, 126), eyebrow.upper(), font=font(18), fill='#dffc3a')
    for size in range(76, 31, -2):
        face = font(size)
        lines = []
        for word in title.split():
            if lines and draw.textlength(lines[-1] + ' ' + word, font=face) <= text_width:
                lines[-1] += ' ' + word
            else:
                lines.append(word)
        if len(lines) <= 4 and all(draw.textlength(line, font=face) <= text_width for line in lines):
            break
    for i, line in enumerate(lines):
        draw.text((52, 190 + i * (size + 8)), line, font=face, fill='#faecd2')
    draw.line((56, 534, 700 if photo else 1144, 534), fill='#454945', width=2)
    draw.text((56, 560), 'SPORTS CLUBS / GREATER MANCHESTER', font=font(18), fill='#a5aaa2')
    image.save(path, quality=90)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--site-url', help='Public HTTPS origin; defaults to data/site.json')
parser.add_argument('--images-only', action='store_true')
args = parser.parse_args()
config_path = ROOT / 'data/site.json'
config = json.loads(config_path.read_text())
args.site_url = args.site_url or config['publicUrl']
if not args.images_only:
    origin = urlsplit(args.site_url or '')
    if origin.scheme != 'https' or not origin.netloc or origin.path not in ('', '/') or origin.query or origin.fragment or origin.username or origin.password:
        parser.error('--site-url must be a public HTTPS origin without a path, query or credentials')
    base = args.site_url.rstrip('/')
    config['publicUrl'] = base
    config_path.write_text(json.dumps(config, indent=2) + '\n')
clubs = {c['profilePath']: c for c in json.loads((ROOT / 'data/clubs.json').read_text())['clubs']}
output = ROOT / 'img/social'
output.mkdir(exist_ok=True)
count = 0
for page in sorted(ROOT.rglob('*.html')):
    relative = page.relative_to(ROOT).as_posix()
    if relative == 'html/nav.html':
        continue
    club = clubs.get(relative)
    title = club['name'] if club else TITLES[relative]
    eyebrow = f"{club['sport']} / {club.get('area') or 'Greater Manchester'}" if club else 'Greater Manchester'
    slug = relative[:-5].replace('/', '-')
    image_path = output / f'{slug}.jpg'
    photo = club.get('imagePath') if club else None
    # Prefer the existing JPEG equivalent where available for AVIF sources.
    if photo and photo.endswith('.avif') and (ROOT / photo.replace('.avif', '.jpg')).exists():
        photo = photo.replace('.avif', '.jpg')
    card(image_path, title, eyebrow, photo)
    count += 1
    if args.images_only:
        continue
    source = page.read_text()
    metadata = Metadata()
    metadata.feed(source)
    assert metadata.description, relative
    public_path = '' if relative == 'index.html' else relative
    page_url = base + '/' + quote(public_path)
    image_url = base + '/' + image_path.relative_to(ROOT).as_posix()
    alt = f"{title} — {eyebrow}. 0161 Active." + (' Club photograph on the right.' if photo else '')
    tags = {
        'og:type': 'website', 'og:site_name': '0161 Active', 'og:locale': 'en_GB',
        'og:title': title + ' | 0161 Active', 'og:description': metadata.description,
        'og:url': page_url, 'og:image': image_url, 'og:image:type': 'image/jpeg',
        'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': alt,
        'twitter:card': 'summary_large_image', 'twitter:title': title + ' | 0161 Active',
        'twitter:description': metadata.description, 'twitter:image': image_url, 'twitter:image:alt': alt,
    }
    source = re.sub(r'\n\s*<!-- Social preview -->.*?<!-- /Social preview -->', '', source, flags=re.S)
    source = re.sub(r'\n\s*<link\b[^>]*rel="canonical"[^>]*>', '', source)
    source = source.replace('</head>', f'  <link rel="canonical" href="{html.escape(page_url, quote=True)}">\n</head>', 1)
    block = '\n  <!-- Social preview -->\n' + '\n'.join(
        f'  <meta {"property" if key.startswith("og:") else "name"}="{key}" content="{html.escape(value, quote=True)}">'
        for key, value in tags.items()
    ) + '\n  <!-- /Social preview -->\n'
    source = source.replace('</head>', block + '</head>', 1)
    page.write_text(source)
print(f'Generated {count} share images' + ('.' if args.images_only else ' and updated static social tags.'))
