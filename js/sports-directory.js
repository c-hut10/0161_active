/* Sports directory: combine the planned catalog with sport types already present in club data. */
const sportsSearch = document.querySelector('#sports-search');
const sportsCount = document.querySelector('#sports-count');
const sportsGroups = document.querySelector('#sports-groups');
const sportsMessage = document.querySelector('#sports-message');
let sportRecords = [];

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

function renderSports() {
  const query = sportsSearch.value.trim().toLocaleLowerCase();
  const filtered = sportRecords.filter(sport => sport.name.toLocaleLowerCase().includes(query));
  const clubTotal = filtered.reduce((sum, sport) => sum + sport.clubCount, 0);
  sportsCount.textContent = `${filtered.length} SPORTS · ${clubTotal} CLUBS ON RECORD`;

  if (!filtered.length) {
    sportsGroups.innerHTML = '';
    sportsMessage.hidden = false;
    sportsMessage.textContent = 'No sports match that search.';
    return;
  }

  sportsMessage.hidden = true;
  const groups = new Map();
  filtered.forEach(sport => {
    const letter = sport.name.charAt(0).toLocaleUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(sport);
  });

  sportsGroups.innerHTML = [...groups.entries()].map(([letter, entries]) => `<section class="sports-letter-group" aria-labelledby="sports-letter-${letter}">
    <h2 id="sports-letter-${letter}" class="sports-letter-group__letter">${escapeDirectoryText(letter)}</h2>
    <div class="sports-directory-grid">${entries.map(sport => `<a class="sports-directory-card" href="glossary.html?sport=${encodeURIComponent(sport.slug)}">
      <span class="sports-directory-card__name">${escapeDirectoryText(sport.name)}</span>
      <span class="sports-directory-card__meta">${sport.clubCount ? `${sport.clubCount} ${sport.clubCount === 1 ? 'CLUB' : 'CLUBS'}` : 'GLOSSARY'} <span aria-hidden="true">↗</span></span>
    </a>`).join('')}</div>
  </section>`).join('');
}

/* Load catalog and current records; clubs stay linked even before their sport is catalogued. */
async function loadSportsDirectory() {
  try {
    const [sportsResponse, clubsResponse] = await Promise.all([
      fetch('../../data/sports.json'),
      fetch('../../data/clubs.json')
    ]);
    if (!sportsResponse.ok || !clubsResponse.ok) throw new Error('The sports directory could not be loaded. Please try again later.');
    const [sportsData, clubsData] = await Promise.all([sportsResponse.json(), clubsResponse.json()]);
    const names = new Map((Array.isArray(sportsData.sports) ? sportsData.sports : []).map(name => [directorySlug(name), name]));
    (Array.isArray(clubsData.clubs) ? clubsData.clubs : []).forEach(club => {
      if (club.sport) names.set(directorySlug(club.sport), club.sport);
    });
    const clubsBySport = new Map();
    (Array.isArray(clubsData.clubs) ? clubsData.clubs : []).forEach(club => {
      const slug = directorySlug(club.sport || '');
      if (slug) clubsBySport.set(slug, (clubsBySport.get(slug) || 0) + 1);
    });
    sportRecords = [...names.entries()].map(([slug, name]) => ({ name, slug, clubCount: clubsBySport.get(slug) || 0 }))
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
