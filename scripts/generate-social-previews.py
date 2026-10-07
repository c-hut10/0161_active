"""Generate branded share images from club data and the generated profile pages."""
import json
import subprocess
import tempfile
from pathlib import Path
from html.parser import HTMLParser
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
class ProfileEyebrow(HTMLParser):
    """Read the profile's resolved sport/area label instead of duplicating postcode rules."""
    def __init__(self):
        super().__init__()
        self.in_eyebrow = False
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag == 'p' and 'profile-eyebrow' in dict(attrs).get('class', '').split():
            self.in_eyebrow = True
    def handle_endtag(self, tag):
        if tag == 'p':
            self.in_eyebrow = False
    def handle_data(self, text):
        if self.in_eyebrow:
            self.parts.append(text)

TITLES = {
    'index.html': 'Movement for everyone',
    '404.html': 'Lost your way?',
    'html/about.html': 'About 0161 Active',
    'html/contact.html': 'Contact 0161 Active',
    'html/privacy.html': 'Privacy policy',
    'html/resources.html': 'Resources',
    'html/calendar.html': 'Club calendar',
    'html/register.html': 'Register your club',
    'html/sports/directory.html': 'Sports directory',
    'html/sports/glossary.html': 'Find your sport',
    'html/sports/run-club.html': 'Run Club directory',
}

def font(size):
    return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', size)

def photo_tile(photo):
    """Use the native decoder for AVIF grids unsupported by the bundled Pillow codec."""
    try:
        with Image.open(ROOT / photo) as source:
            return ImageOps.fit(source.convert('RGB'), (400, 470))
    except (OSError, RuntimeError):
        if not photo.lower().endswith('.avif'):
            raise
        with tempfile.TemporaryDirectory(prefix='0161active-share-') as folder:
            decoded = Path(folder) / 'photo.png'
            subprocess.run(['/usr/bin/sips', '-s', 'format', 'png', str(ROOT / photo),
                            '--out', str(decoded)], check=True, capture_output=True)
            with Image.open(decoded) as source:
                return ImageOps.fit(source.convert('RGB'), (400, 470))

def card(path, title, eyebrow, photo):
    image = Image.new('RGB', (1200, 630), '#111211')
    draw = ImageDraw.Draw(image)
    text_width = 680 if photo else 1080
    if photo:
        image.paste(photo_tile(photo), (748, 104))
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

# Image generation never edits HTML or site configuration; the Node generator owns those files.
clubs = {c['profilePath']: c for c in json.loads((ROOT / 'data/clubs.json').read_text())['clubs']}
output = ROOT / 'img/social'
output.mkdir(exist_ok=True)
count = 0
for page in sorted(ROOT.rglob('*.html')):
    relative = page.relative_to(ROOT).as_posix()
    club = clubs.get(relative)
    title = club['name'] if club else TITLES[relative]
    eyebrow = 'Greater Manchester'
    if club:
        profile = ProfileEyebrow()
        profile.feed(page.read_text())
        eyebrow = ''.join(profile.parts).strip()
        if not eyebrow:
            raise ValueError(f'{relative}: rebuild profile pages before generating share images')
    slug = relative[:-5].replace('/', '-')
    image_path = output / f'{slug}.jpg'
    photo = club.get('imagePath') if club else None
    # Prefer the existing JPEG equivalent where available for AVIF sources.
    if photo and photo.endswith('.avif') and (ROOT / photo.replace('.avif', '.jpg')).exists():
        photo = photo.replace('.avif', '.jpg')
    card(image_path, title, eyebrow, photo)
    count += 1
print(f'Generated {count} share images. Run the profile generator to refresh their metadata.')
