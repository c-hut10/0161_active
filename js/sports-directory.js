/* Sports directory: render the official sport catalog, an accessible-sports group, and club counts. */
const sportsSearch = document.querySelector('#sports-search');
const sportsCount = document.querySelector('#sports-count');
const sportsGroups = document.querySelector('#sports-groups');
const sportsMessage = document.querySelector('#sports-message');
let sportRecords = [];
let accessibleSportSlugs = new Set();
let visibleWhenEmptySlugs = new Set();
let hiddenSportSlugs = new Set();

function escapeDirectoryText(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function directorySlug(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Display names: relabel running as Run Club without changing its directory slug. */
function displaySportName(name) {
  return directorySlug(name) === 'running' ? 'Run Club' : name;
}

function renderSports() {
  const query = sportsSearch.value.trim().toLocaleLowerCase();
  const filtered = sportRecords.filter(sport =>
    displaySportName(sport.name).toLocaleLowerCase().includes(query)
      || sport.name.toLocaleLowerCase().includes(query)
  );
  const clubTotal = filtered.reduce((sum, sport) => sum + sport.clubCount, 0);
  sportsCount.textContent = `${filtered.length} SPORTS · ${clubTotal} CLUBS ON RECORD`;

  if (!filtered.length) {
    sportsGroups.innerHTML = '';
    sportsMessage.hidden = false;
    sportsMessage.textContent = 'No sports match that search.';
    return;
  }

  sportsMessage.hidden = true;
  const accessibleEntries = filtered.filter(sport => accessibleSportSlugs.has(sport.slug));
  const otherEntries = filtered.filter(sport => !accessibleSportSlugs.has(sport.slug));
  const groups = new Map();
  otherEntries.forEach(sport => {
    const letter = displaySportName(sport.name).charAt(0).toLocaleUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(sport);
  });

  const renderCards = entries => `<div class="sports-directory-grid">${entries.map(sport => `<a class="sports-directory-card" href="glossary.html?sport=${encodeURIComponent(sport.slug)}">
      <span class="sports-directory-card__name">${escapeDirectoryText(displaySportName(sport.name))}</span>
      <span class="sports-directory-card__meta">${sport.clubCount ? `${sport.clubCount} ${sport.clubCount === 1 ? 'CLUB' : 'CLUBS'}` : 'GLOSSARY'} <span aria-hidden="true">↗</span></span>
    </a>`).join('')}</div>`;
  const accessibleSection = accessibleEntries.length ? `<section class="sports-accessible-group" aria-labelledby="sports-accessible-title">
    <h2 id="sports-accessible-title" class="sports-accessible-group__title">ACCESSIBLE SPORTS</h2>
    ${renderCards(accessibleEntries)}
  </section>` : '';
  const otherSection = otherEntries.length ? `<section class="sports-other-group" aria-labelledby="sports-other-title">
    <h2 id="sports-other-title" class="sports-accessible-group__title">OTHER SPORTS</h2>
    ${[...groups.entries()].map(([letter, entries]) => `<section class="sports-letter-group" aria-labelledby="sports-letter-${letter}">
      <h3 id="sports-letter-${letter}" class="sports-letter-group__letter">${escapeDirectoryText(letter)}</h3>
      ${renderCards(entries)}
    </section>`).join('')}
  </section>` : '';

  sportsGroups.innerHTML = accessibleSection + otherSection;
}

/* Load the official catalog and count current club records that match its sport names. */
async function loadSportsDirectory() {
  try {
    const [sportsResponse, clubsResponse] = await Promise.all([
      fetch('../../data/sports.json'),
      fetch('../../data/clubs.json')
    ]);
    if (!sportsResponse.ok || !clubsResponse.ok) throw new Error('The sports directory could not be loaded. Please try again later.');
    const [sportsData, clubsData] = await Promise.all([sportsResponse.json(), clubsResponse.json()]);
    const names = new Map((Array.isArray(sportsData.sports) ? sportsData.sports : []).map(name => [directorySlug(name), name]));
    accessibleSportSlugs = new Set((Array.isArray(sportsData.accessibleSports) ? sportsData.accessibleSports : []).map(directorySlug));
    /* Visibility controls: keep catalog entries with clubs plus approved empty-sport placeholders. */
    visibleWhenEmptySlugs = new Set((Array.isArray(sportsData.visibleWhenEmpty) ? sportsData.visibleWhenEmpty : []).map(directorySlug));
    hiddenSportSlugs = new Set((Array.isArray(sportsData.hiddenSports) ? sportsData.hiddenSports : []).map(directorySlug));
    const clubsBySport = new Map();
    (Array.isArray(clubsData.clubs) ? clubsData.clubs : []).forEach(club => {
      const slug = directorySlug(club.sport || '');
      if (slug) clubsBySport.set(slug, (clubsBySport.get(slug) || 0) + 1);
    });
    sportRecords = [...names.entries()].map(([slug, name]) => ({ name, slug, clubCount: clubsBySport.get(slug) || 0 }))
      .filter(sport => !hiddenSportSlugs.has(sport.slug)
        && (sport.clubCount > 0 || visibleWhenEmptySlugs.has(sport.slug)))
      .sort((a, b) => a.name.localeCompare(b.name));
    renderSports();
  } catch (error) {
    sportsCount.textContent = 'SPORT DIRECTORY UNAVAILABLE';
    sportsMessage.hidden = false;
    sportsMessage.textContent = error.message || 'The sports directory could not be loaded.';
  }
}

sportsSearch.addEventListener('input', renderSports);
loadSportsDirectory();
