/* Generate crawlable profiles, titles and indexing files from shared club data. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function build() {
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const origin = new URL(config.publicUrl);
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('publicUrl must be an HTTPS origin');
const base = origin.origin;
const dataPath = path.join(root, 'data/clubs.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const { verificationDate } = await import(pathToFileURL(path.join(root, 'js/club-verification.mjs')).href);
for (const club of data.clubs) {
  club.confirmed = club.confirmed === true;
  const checked = club.research?.checkedAt;
  const confirmed = club.verification?.lastConfirmedByClub || null;
  const trainingConfirmed = club.verification?.trainingTimesConfirmedAt || null;
  if (trainingConfirmed && !verificationDate(trainingConfirmed)) throw new Error(`Invalid training confirmation date for ${club.id}`);
  if (checked && !verificationDate(checked)) throw new Error(`Invalid research date for ${club.id}`);
  if (confirmed && !verificationDate(confirmed)) throw new Error(`Invalid club confirmation date for ${club.id}`);
  club.verification = {
    status: confirmed ? 'club-confirmed' : checked ? 'public-sources-reviewed' : 'unverified',
    lastSourceCheck: checked || null,
    lastConfirmedByClub: confirmed,
    trainingTimesConfirmedAt: trainingConfirmed
  };
}
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
const { renderClubProfile } = await import(pathToFileURL(path.join(root, 'js/club-profile-renderer.mjs')).href);
for (const club of data.clubs) {
  const rendered = renderClubProfile(club, data.metadata?.sampleDataNotice || '', `${base}/${club.profilePath}`);
  const file = path.join(root, club.profilePath);
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes('id="club-profile-root"')) throw new Error(`Missing profile mount: ${club.profilePath}`);
  source = source.replace(/(<main\b[^>]*id="club-profile-root"[^>]*>)[\s\S]*?(<\/main>)/, (_, start, end) => `${start}\n    ${rendered.html}\n  ${end}`);
  source = source.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(rendered.title)}</title>`);
  fs.writeFileSync(file, source.replace(/[ \t]+$/gm, ''));
}
const titles = {
  'index.html': '0161 Active | Sports clubs in Greater Manchester',
  'html/about.html': 'About | 0161 Active',
  'html/contact.html': 'Contact us | 0161 Active',
  'html/resources.html': 'Resources | 0161 Active',
  'html/random.html': 'Not A Running Club image page | 0161 Active',
  'html/Test.html': 'Neon cursor demonstration | 0161 Active',
  'html/sports/glossary.html': 'Find sports clubs | 0161 Active'
};
const excluded = new Set(['404.html', 'html/nav.html', 'html/Test.html', 'html/random.html', 'html/about.html', 'html/privacy.html', 'html/resources.html', 'html/sports/running.html']);
const footer = fs.readFileSync(path.join(root, 'templates/site-footer.inc'), 'utf8').trim();
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
  if (relative === 'html/nav.html') continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/src="(?:\.\.\/|\/)?(?:\.\.\/)?js\/site-nav\.js(?:\?[^"]*)?"/g, 'src="/js/site-nav.js?v=20261004-contact"');
  source = source.replace(/href="(?:\.\.\/|\/)?(?:\.\.\/)?css\/site-nav\.css(?:\?[^"]*)?"/g, 'href="/css/site-nav.css?v=20261004-contact"');
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
  if (excluded.has(relative)) {
    source = source.replace(/\s*<meta\b[^>]*name="robots"[^>]*>/g, '');
    source = source.replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
  } else {
    if (relative === 'html/contact.html') source = source.replace(/\s*<meta\b[^>]*name="robots"[^>]*>/g, '');
    const publicPath = relative === 'index.html' ? '' : relative;
    urls.push(`${base}/${publicPath}`);
  }
  fs.writeFileSync(file, source);
}
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.sort().map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
console.log(`Generated ${data.clubs.length} static profiles and ${urls.length} sitemap entries. Verification status:`, data.clubs.reduce((counts, c) => { counts[c.verification.status] = (counts[c.verification.status] || 0) + 1; return counts; }, {}));

}
build().catch(error => { console.error(error); process.exitCode = 1; });
