/* Generate crawlable profiles, titles and indexing files from shared club data. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function build() {
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const origin = new URL(config.publicUrl);
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash
  || origin.username || origin.password) throw new Error('publicUrl must be an HTTPS origin without credentials');
const base = origin.origin;
const dataPath = path.join(root, 'data/clubs.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const { escapeHtml: escape, displaySportName, canonicalArea } = await import(pathToFileURL(path.join(root, 'js/club-formatting.mjs')).href);
const { verificationDate } = await import(pathToFileURL(path.join(root, 'js/club-verification.mjs')).href);
/* Validate record identities, output paths and dates before writing generated pages. */
const clubIds = new Set();
const profilePaths = new Set();
for (const club of data.clubs) {
  if (typeof club.id !== 'string' || !club.id.trim() || clubIds.has(club.id)) {
    throw new Error(`Missing or duplicate club id: ${club.id}`);
  }
  if (!/^html\/[a-z0-9-]+\/[a-zA-Z0-9_-]+\.html$/.test(club.profilePath || '') || /\/index\.html$/i.test(club.profilePath)) {
    throw new Error(`Profile path must be html/<sport>/<club>.html without an index page: ${club.id}`);
  }
  if (profilePaths.has(club.profilePath)) throw new Error(`Duplicate profile path: ${club.profilePath}`);
  clubIds.add(club.id);
  profilePaths.add(club.profilePath);
  const { status, lastConfirmed } = club.verification || {};
  if (!['verified', 'unverified'].includes(status)) throw new Error(`Invalid verification status for ${club.id}`);
  if (lastConfirmed && !verificationDate(lastConfirmed)) throw new Error(`Invalid confirmation date for ${club.id}`);
  if ((status === 'verified') !== Boolean(lastConfirmed)) throw new Error(`Verification status/date mismatch for ${club.id}`);
}
/* Sector lookup: generate the small browser module from the owner's approved naming table. */
const rulebook = fs.readFileSync(path.join(root, 'docs/postcode-area-rulebook.md'), 'utf8');
const postcodeAreas = {};
for (const line of rulebook.split('\n')) {
  const entry = line.match(/^\| (M\d{1,2} \d) \| ([^|]+) \|/);
  if (!entry) continue;
  if (Object.hasOwn(postcodeAreas, entry[1])) throw new Error(`Duplicate postcode sector: ${entry[1]}`);
  postcodeAreas[entry[1]] = entry[2].trim();
}
if (!Object.keys(postcodeAreas).length) throw new Error('The postcode rulebook has no approved sector labels.');
writeGeneratedFile(path.join(root, 'js/postcode-areas.mjs'),
  '/* Generated from docs/postcode-area-rulebook.md. Edit that table and rebuild to update labels. */\n'
  + `export const POSTCODE_AREAS = Object.freeze(${JSON.stringify(postcodeAreas, null, 2)});\n`);
const { resolveClubAreas } = await import(pathToFileURL(path.join(root, 'js/club-areas.mjs')).href);
data.clubs = data.clubs.map(resolveClubAreas);
const { renderClubProfile } = await import(pathToFileURL(path.join(root, 'js/club-profile-renderer.mjs')).href);
const profileTemplate = fs.readFileSync(path.join(root, 'templates/club-profile.inc'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'templates/site-footer.inc'), 'utf8').trim();

/* Generated files: create missing sport folders and skip writing unchanged output. */
function writeGeneratedFile(file, source) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === source) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source);
}

/* Profile metadata: describe the same club record used for the visible page. */
function clubDescription(club) {
  const sport = displaySportName(club.sport, { titleCase: true, fallback: 'Sport' });
  const location = club.area ? ` in ${canonicalArea(club.area)}` : ' on 0161 Active';
  const details = club.description?.trim() || 'View club details, session information and available contact links.';
  return `Explore ${club.name}: ${sport}${location}. ${details}`.replace(/\s+/g, ' ').trim();
}

/* Metadata tags: one writer owns canonical URLs and social tags for every page. */
function metaTags(tags) {
  return Object.entries(tags).map(([key, value]) =>
    `  <meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`
  ).join('\n');
}
function imageTags(imagePath, alt) {
  const imageUrl = new URL(imagePath, `${base}/`).href;
  return metaTags({
    'og:image': imageUrl, 'og:image:type': 'image/jpeg',
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': alt,
    'twitter:image': imageUrl, 'twitter:image:alt': alt
  });
}

/* Share images: use a club card when available, with a directory card for new records. */
function socialImageTags(club) {
  const clubCard = `img/social/${club.profilePath.slice(0, -5).replaceAll('/', '-')}.jpg`;
  const imagePath = fs.existsSync(path.join(root, clubCard)) ? clubCard : 'img/social/html-sports-directory.jpg';
  if (!fs.existsSync(path.join(root, imagePath))) return '';
  const sportArea = [displaySportName(club.sport, { titleCase: true }), club.area && canonicalArea(club.area)].filter(Boolean).join(' / ');
  const alt = imagePath === clubCard
    ? `${club.name} — ${sportArea}. 0161 Active.${club.imagePath ? ' Club photograph on the right.' : ''}`
    : '0161 Active — sports clubs in Greater Manchester.';
  return imageTags(imagePath, alt);
}

/* Full-page template: every new JSON record can create its own complete profile HTML. */
for (const club of data.clubs) {
  const pageUrl = new URL(club.profilePath, `${base}/`).href;
  const rendered = renderClubProfile(club, data.metadata?.sampleDataNotice || '', pageUrl);
  const file = path.join(root, club.profilePath);
  const imageTags = socialImageTags(club);
  const values = {
    title: escape(rendered.title), description: escape(clubDescription(club)),
    pageUrl: escape(pageUrl), clubId: escape(club.id), profileHtml: rendered.html,
    footer, socialImageTags: imageTags, twitterCard: imageTags ? 'summary_large_image' : 'summary'
  };
  const source = profileTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown profile template field: ${key}`);
    return values[key];
  });
  writeGeneratedFile(file, source.replace(/[ \t]+$/gm, ''));
}
const titles = {
  'index.html': '0161 Active | Sports clubs in Greater Manchester',
  'html/about.html': 'About | 0161 Active',
  'html/contact.html': 'Contact us | 0161 Active',
  'html/resources.html': 'Resources | 0161 Active',
  'html/sports/glossary.html': 'Find sports clubs | 0161 Active'
};
const excluded = new Set(['404.html', 'html/about.html', 'html/privacy.html', 'html/resources.html', 'html/sports/run-club.html']);

/* Hand-authored pages: retain their title/description and generate matching social metadata. */
function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity.startsWith('#')) return String.fromCodePoint(entity[1].toLowerCase() === 'x'
      ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity.toLowerCase()];
  });
}
function pageMetadata(source, relative) {
  const title = decodeHtml(source.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '0161 Active');
  const description = decodeHtml(source.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/)?.[1] || '');
  if (!description) throw new Error(`Missing page description: ${relative}`);
  const pageUrl = new URL(relative === 'index.html' ? '' : relative, `${base}/`).href;
  const cardPath = `img/social/${relative.slice(0, -5).replaceAll('/', '-')}.jpg`;
  const cardExists = fs.existsSync(path.join(root, cardPath));
  const tags = metaTags({
    'og:type': 'website', 'og:site_name': '0161 Active', 'og:locale': 'en_GB',
    'og:title': title, 'og:description': description, 'og:url': pageUrl,
    'twitter:card': cardExists ? 'summary_large_image' : 'summary',
    'twitter:title': title, 'twitter:description': description
  });
  source = source.replace(/\s*<link\b[^>]*rel="canonical"[^>]*>/g, '')
    .replace(/\s*<!-- Social preview -->[\s\S]*?<!-- \/Social preview -->/g, '');
  const images = cardExists ? `\n${imageTags(cardPath, `${title} — Greater Manchester. 0161 Active.`)}` : '';
  return source.replace('</head>', `  <link rel="canonical" href="${escape(pageUrl)}">\n`
    + `  <!-- Social preview -->\n${tags}${images}\n  <!-- /Social preview -->\n</head>`);
}
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}
const urls = [];
for (const file of htmlFiles(root)) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/src="(?:\.\.\/|\/)?(?:\.\.\/)?js\/site-nav\.js(?:\?[^"]*)?"/g, 'src="/js/site-nav.js?v=20261007-cleanup"');
  source = source.replace(/href="(?:\.\.\/|\/)?(?:\.\.\/)?css\/site-nav\.css(?:\?[^"]*)?"/g, 'href="/css/site-nav.css?v=20261007-cleanup"');
  if (/<footer\b/.test(source)) {
    source = source.replace(/<footer\b[\s\S]*?<\/footer>/, () => footer);
  } else {
    source = source.replace('</body>', `${footer}\n</body>`);
  }
  const sharedAssets = [
    ['href="/css/site-footer.css"', '<link rel="stylesheet" href="/css/site-footer.css">'],
    ['href="/css/cookie-settings.css"', '<link rel="stylesheet" href="/css/cookie-settings.css">'],
    ['src="/js/cookie-settings.js"', '<script defer src="/js/cookie-settings.js"></script>'],
    ['href="/css/club-verification.css"', '<link rel="stylesheet" href="/css/club-verification.css">'],
    ['href="/css/accessibility.css"', '<link rel="stylesheet" href="/css/accessibility.css">'],
    ['src="/js/accessibility.js"', '<script defer src="/js/accessibility.js"></script>']
  ];
  for (const [reference, tag] of sharedAssets) {
    if (!source.includes(reference)) source = source.replace('</head>', `  ${tag}\n</head>`);
  }
  const main = source.match(/<main\b[^>]*>/);
  if (main) {
    const existingId = main[0].match(/\bid="([^"]+)"/);
    const mainId = existingId ? existingId[1] : 'main-content';
    let mainTag = main[0];
    if (!existingId) mainTag = mainTag.replace('>', ` id="${mainId}">`);
    if (!/\btabindex=/.test(mainTag)) mainTag = mainTag.replace('>', ' tabindex="-1">');
    source = source.replace(main[0], mainTag);
    if (!source.includes('class="skip-link"')) {
      source = source.replace(/<body\b[^>]*>/, tag => `${tag}\n<a class="skip-link" href="#${mainId}">Skip to main content</a>`);
    }
  }
  if (titles[relative]) source = source.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(titles[relative])}</title>`);
  if (!profilePaths.has(relative)) source = pageMetadata(source, relative);
  if (excluded.has(relative)) {
    source = source.replace(/\s*<meta\b[^>]*name="robots"[^>]*>/g, '');
    source = source.replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
  } else {
    if (relative === 'html/contact.html') source = source.replace(/\s*<meta\b[^>]*name="robots"[^>]*>/g, '');
    const publicPath = relative === 'index.html' ? '' : relative;
    urls.push(`${base}/${publicPath}`);
  }
  writeGeneratedFile(file, source);
}
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.sort().map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n') + '\n</urlset>\n';
writeGeneratedFile(path.join(root, 'sitemap.xml'), sitemap);
writeGeneratedFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
console.log(`Generated ${data.clubs.length} static profiles and ${urls.length} sitemap entries. Verification status:`, data.clubs.reduce((counts, c) => { counts[c.verification.status] = (counts[c.verification.status] || 0) + 1; return counts; }, {}));

}
build().catch(error => { console.error(error); process.exitCode = 1; });
