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
  const entry = line.match(/^\| ([A-Z]{1,2}\d{1,2}[A-Z]? \d) \| ([^|]+) \|/);
  if (!entry) continue;
  if (Object.hasOwn(postcodeAreas, entry[1])) throw new Error(`Duplicate postcode sector: ${entry[1]}`);
  postcodeAreas[entry[1]] = entry[2].trim();
}
if (!Object.keys(postcodeAreas).length) throw new Error('The postcode rulebook has no approved sector labels.');
writeGeneratedFile(path.join(root, 'js/postcode-areas.mjs'),
  '/* Generated from docs/postcode-area-rulebook.md. Edit that table and rebuild to update labels. */\n'
  + `export const POSTCODE_AREAS = Object.freeze(${JSON.stringify(postcodeAreas, null, 2)});\n`);
const { resolveClubAreas, clubTrainingAreas } = await import(pathToFileURL(path.join(root, 'js/club-areas.mjs')).href);
data.clubs = data.clubs.map(resolveClubAreas);
const { renderClubProfile } = await import(pathToFileURL(path.join(root, 'js/club-profile-renderer.mjs')).href);
const { visibleSportRecords } = await import(pathToFileURL(path.join(root, 'js/sport-catalog.mjs')).href);
const { renderSiteNav } = await import(pathToFileURL(path.join(root, 'js/site-nav-renderer.mjs')).href);
const { renderSportClubRows } = await import(pathToFileURL(path.join(root, 'js/sport-glossary-renderer.mjs')).href);
const { renderSportsDirectory } = await import(pathToFileURL(path.join(root, 'js/sports-directory-renderer.mjs')).href);
const { renderWeekGrid } = await import(pathToFileURL(path.join(root, 'js/calendar-week-renderer.mjs')).href);
const { sportSlug } = await import(pathToFileURL(path.join(root, 'js/club-formatting.mjs')).href);
const { clubDescriptionText } = await import(pathToFileURL(path.join(root, 'js/club-description.mjs')).href);
const { siteStructuredData } = await import(pathToFileURL(path.join(root, 'js/site-structured-data.mjs')).href);
const { renderHomeGallery } = await import(pathToFileURL(path.join(root, 'js/home-gallery-renderer.mjs')).href);
const sportCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data/sports.json'), 'utf8'));
const sports = visibleSportRecords(sportCatalog, data.clubs);
const profileTemplate = fs.readFileSync(path.join(root, 'templates/club-profile.inc'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'templates/site-footer.inc'), 'utf8').trim();

/* Generated files: create missing sport folders and skip writing unchanged output. */
function writeGeneratedFile(file, source) {
  source = source.replace(/[\t ]+$/gm, '');
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === source) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source);
}

/* Profile metadata: describe the same club record used for the visible page. */
const descriptionSentences = new Intl.Segmenter('en-GB', { granularity: 'sentence' });
function clubDescription(club) {
  const sport = displaySportName(club.sport, { titleCase: true, fallback: 'Sport' });
  const location = club.area ? ` in ${canonicalArea(club.area)}` : ' on 0161 Active';
  // Keep only the first sentence in metadata; the visible club description stays complete.
  const fullDescription = clubDescriptionText(club).replace(/\s+/g, ' ').trim();
  const details = fullDescription
    ? descriptionSentences.segment(fullDescription)[Symbol.iterator]().next().value.segment.trim()
    : 'View club details, session information and available contact links.';
  return `Explore ${club.name}: ${sport}${location}. ${details}`.replace(/\s+/g, ' ').trim();
}

/* Metadata tags: one writer owns canonical URLs and social tags for every page. */
function metaTags(tags) {
  return Object.entries(tags).map(([key, value]) =>
    `  <meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`
  ).join('\n');
}
/* Global share image: every page uses the same square 0161 Active logo. */
function socialImageTags() {
  const imageUrl = new URL('img/0161 Active_Logo.png', `${base}/`).href;
  return metaTags({
    'og:image': imageUrl, 'og:image:type': 'image/png',
    'og:image:width': '1024', 'og:image:height': '1024', 'og:image:alt': '0161 Active logo',
    'twitter:image': imageUrl, 'twitter:image:alt': '0161 Active logo'
  });
}

/* Full-page template: every new JSON record can create its own complete profile HTML. */
for (const club of data.clubs) {
  const pageUrl = new URL(club.profilePath, `${base}/`).href;
  const rendered = renderClubProfile(club, data.metadata?.sampleDataNotice || '', pageUrl);
  const file = path.join(root, club.profilePath);
  const values = {
    title: escape(rendered.title), description: escape(clubDescription(club)),
    pageUrl: escape(pageUrl), clubId: escape(club.id), profileHtml: rendered.html,
    footer, socialImageTags: socialImageTags(), twitterCard: 'summary'
  };
  const source = profileTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown profile template field: ${key}`);
    return values[key];
  });
  writeGeneratedFile(file, source.replace(/[ \t]+$/gm, ''));
}
const titles = {
  'index.html': '0161 Active: Sport Club Database',
  'html/contact.html': 'Contact us | 0161 Active',
  'html/sports/glossary.html': 'Find sports clubs | 0161 Active'
};
const excluded = new Set(['404.html', 'html/privacy.html', 'html/sports/glossary.html']);

/* Sport pages: generate complete listings and metadata using the same rows as browser filters. */
const glossaryTemplate = fs.readFileSync(path.join(root, 'templates/sport-glossary.inc'), 'utf8');
const { renderLocalLeagues, renderLeagueTeamRows, leagueTeamUrl } = await import(pathToFileURL(path.join(root, 'js/league-renderer.mjs')).href);
const { leagueRecords, LEAGUE_COVERAGES } = await import(pathToFileURL(path.join(root, 'js/club-leagues.mjs')).href);
const leagueTemplate = fs.readFileSync(path.join(root, 'templates/league-page.inc'), 'utf8');
const leaguePages = new Map();
/* Generate qualifying league pages first so glossary heading links are available on the same build. */
for (const sport of sports) {
  const records = leagueRecords([...data.clubs, ...(data.leagueGuests || [])], sport.slug);
  for (const league of records) {
    const relative = league.url.slice(1);
    if (leaguePages.has(relative)) throw new Error(`Different leagues produce the same page path: ${relative}`);
    leaguePages.set(relative, league);
  }
}
for (const [relative, league] of leaguePages) {
  const sportSlugValue = relative.split('/')[2];
  const sportName = displaySportName(sports.find(sport => sport.slug === sportSlugValue).name);
  const values = {
    title: escape(`${league.name} | 0161 Active`),
    description: escape(`Explore the ${league.teams.length} teams from ${league.clubs.length} clubs in ${league.name}. View participating ${sportName} clubs and their profile or website links.`),
    pageUrl: escape(new URL(relative, `${base}/`).href), leagueName: escape(league.name),
    sportGlossaryUrl: escape(`/html/sports/${sportSlugValue}.html`), sportName: escape(sportName),
    coverageLabel: escape(`${LEAGUE_COVERAGES[league.coverage].replace(/\s+league$/i, '')} League`.toUpperCase()),
    teamRows: renderLeagueTeamRows(league), footer
  };
  writeGeneratedFile(path.join(root, relative), leagueTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown league template field: ${key}`);
    return values[key];
  }));
}
const sportPages = new Set();
for (const sport of sports) {
  const relative = `html/sports/${sport.slug}.html`;
  if (['directory', 'glossary', 'index'].includes(sport.slug)) throw new Error(`Reserved sport page name: ${sport.slug}`);
  sportPages.add(relative);
  const name = displaySportName(sport.name);
  const clubs = data.clubs.filter(club => sportSlug(club.sport) === sport.slug && club.hiddenFromSportList !== true)
    .sort((a, b) => a.name.localeCompare(b.name));
  const areas = [...new Set(clubs.flatMap(clubTrainingAreas))]
    .sort((a, b) => a.localeCompare(b));
  const values = {
    sportSlug: escape(sport.slug), sportName: escape(name), title: escape(`${name} | 0161 Active`),
    description: escape(`Explore ${name} clubs across Greater Manchester. Filter by area and training day, and view individual club profiles on 0161 Active.`),
    areaOptions: '<option value="all">All areas</option>' + areas.map(area => `<option value="${escape(area)}">${escape(area)}</option>`).join(''),
    clubCount: String(clubs.length).padStart(2, '0'), clubRows: renderSportClubRows(clubs),
    leagueCards: renderLocalLeagues(clubs, sport.slug, new Set([...leaguePages.keys()].map(relative => `/${relative}`)), data.leagueGuests || []),
    messageHidden: clubs.length ? ' hidden' : '',
    message: clubs.length ? '' : escape(`No ${name} clubs are listed yet. Check back soon or register your club.`)
  };
  writeGeneratedFile(path.join(root, relative), glossaryTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown sport template field: ${key}`);
    return values[key];
  }));
}
/* Retired sports: remove only marked generated pages when catalog visibility changes. */
for (const entry of fs.readdirSync(path.join(root, 'html/sports'))) {
  const relative = `html/sports/${entry}`;
  if (!entry.endsWith('.html') || sportPages.has(relative)) continue;
  const file = path.join(root, relative);
  if (fs.readFileSync(file, 'utf8').includes('<!-- Generated sport glossary:')) fs.unlinkSync(file);
}

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
  const tags = metaTags({
    'og:type': 'website', 'og:site_name': '0161 Active', 'og:locale': 'en_GB',
    'og:title': title, 'og:description': description, 'og:url': pageUrl,
    'twitter:card': 'summary',
    'twitter:title': title, 'twitter:description': description
  });
  source = source.replace(/\s*<link\b[^>]*rel="canonical"[^>]*>/g, '')
    .replace(/\s*<!-- Social preview -->[\s\S]*?<!-- \/Social preview -->/g, '');
  const images = `\n${socialImageTags()}`;
  return source.replace('</head>', `  <link rel="canonical" href="${escape(pageUrl)}">\n`
    + `  <!-- Social preview -->\n${tags}${images}\n  <!-- /Social preview -->\n</head>`);
}
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    // Deployment copies and private response folders are not source pages or sitemap entries.
    if (entry.name.startsWith('.') || entry.name === 'node_modules'
      || (dir === root && ['dist', 'private-imports'].includes(entry.name))) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}
const urls = [];
for (const file of htmlFiles(root)) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  let source = fs.readFileSync(file, 'utf8');
  if (relative === 'index.html') {
    /* Gallery selection: a rebuild rotates the set; browser visits reorder the same photos. */
    const photos = data.clubs.filter(club => typeof club.imagePath === 'string'
      && club.imagePath.startsWith('img/') && fs.existsSync(path.join(root, club.imagePath)));
    source = source.replace(/(<div class="grid-container" id="club-gallery"[^>]*>)[\s\S]*?(<\/div>\s*<button class="gallery-pause")/,
      (_, opening, closing) => `${opening}${renderHomeGallery(photos)}${closing}`);
  }
  /* Static navigation: browser JavaScript binds controls to this already-readable markup. */
  const active = relative.includes('/sports/') || relative.includes('/leagues/') ? 'sports' : {
    'html/calendar.html': 'calendar', 'html/register.html': 'register', 'html/contact.html': 'contact'
  }[relative] || '';
  const navigation = `<div data-site-nav>${renderSiteNav(sports, active)}</div><!-- /Site navigation -->`;
  source = source.replace(/<div data-site-nav>[\s\S]*?<!-- \/Site navigation -->|<div data-site-nav><\/div>/, () => navigation);
  if (relative === 'html/sports/directory.html') {
    source = source.replace(/(<div class="sports-directory-groups" id="sports-groups">)[\s\S]*?(<\/div>\s*<\/main>)/,
      (_, opening, closing) => `${opening}${renderSportsDirectory(sports)}${closing}`);
    source = source.replace(/(<p[^>]*id="sports-count"[^>]*>)[\s\S]*?<\/p>/,
      `$1${sports.length} SPORTS · ${sports.reduce((sum, sport) => sum + sport.clubCount, 0)} CLUBS ON RECORD</p>`);
  }
  if (relative === 'html/calendar.html') {
    const entries = [...data.clubs].sort((a, b) => a.name.localeCompare(b.name)).map(club => {
      const sessions = club.sessions || [];
      const sessionsByDay = new Map();
      for (const session of sessions) {
        const day = Number(session.dayOfWeek);
        if (!sessionsByDay.has(day)) sessionsByDay.set(day, []);
        sessionsByDay.get(day).push(session);
      }
      return { club, sessions, sessionsByDay };
    });
    source = source.replace(/(<div class="week-grid" id="week-grid"[^>]*>)[\s\S]*?(<\/div>\s*<\/section>)/,
      (_, opening, closing) => `${opening}${renderWeekGrid(entries)}${closing}`);
    source = source.replace(/(<p[^>]*id="result-count"[^>]*>)[\s\S]*?<\/p>/,
      `$1${entries.length} clubs · ${entries.reduce((sum, entry) => sum + entry.sessions.length, 0)} sessions</p>`);
    source = source.replace(/(<p[^>]*id="week-overline"[^>]*>)[\s\S]*?<\/p>/, `$1ALL SPORTS · ${entries.length} CLUBS</p>`);
  }
  /* Browser tab icon: replace page-specific paths with one global logo reference. */
  source = source.replace(/\s*<link\b[^>]*rel="(?:shortcut )?icon"[^>]*>/g, '');
  source = source.replace('</head>', '  <link rel="icon" type="image/png" href="/img/0161%20Active_Logo.png">\n</head>');
  source = source.replace(/src="(?:\.\.\/|\/)?(?:\.\.\/)?js\/site-nav\.js(?:\?[^"]*)?"/g, 'src="/js/site-nav.js?v=20261009-static-navigation"');
  source = source.replace(/href="(?:\.\.\/|\/)?(?:\.\.\/)?css\/site-nav\.css(?:\?[^"]*)?"/g, 'href="/css/site-nav.css?v=20261009-breakpoints"');
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
  /* Search semantics: embed JSON-LD in the delivered HTML, using only published records. */
  const club = data.clubs.find(record => record.profilePath === relative);
  const sport = sports.find(record => relative === `html/sports/${record.slug}.html`);
  const league = leaguePages.get(relative);
  const listedClubs = relative === 'html/calendar.html' ? [...data.clubs]
    : sport ? data.clubs.filter(record => sportSlug(record.sport) === sport.slug && record.hiddenFromSportList !== true) : [];
  listedClubs.sort((a, b) => a.name.localeCompare(b.name));
  const structured = siteStructuredData({
    origin: base, relative, club, clubs: listedClubs,
    items: league ? [...league.teams].sort((a, b) => a.teamName.localeCompare(b.teamName))
      .map(team => ({ name: team.teamName, url: leagueTeamUrl(team) })).filter(team => team.url) : [],
    sports: relative === 'html/sports/directory.html' ? sports : [],
    title: decodeHtml(source.match(/<title>([\s\S]*?)<\/title>/)[1]),
    description: decodeHtml(source.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/)[1])
  });
  source = source.replace(/\s*<!-- Structured data -->[\s\S]*?<!-- \/Structured data -->/g, '');
  const json = JSON.stringify(structured).replace(/</g, '\\u003c');
  source = source.replace('</head>', `  <!-- Structured data -->\n  <script type="application/ld+json">${json}</script>\n  <!-- /Structured data -->\n</head>`);
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
