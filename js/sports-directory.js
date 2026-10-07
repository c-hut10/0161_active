import { displaySportName, sportGlossaryUrl, escapeHtml as escapeDirectoryText } from './club-formatting.mjs';
import { visibleSportRecords } from './sport-catalog.mjs';
import { loadClubDirectory, loadSportCatalog } from './site-data.mjs';

/* Sports directory: render the official sport catalog, an accessible-sports group, and club counts. */
const sportsSearch = document.querySelector('#sports-search');
const sportsCount = document.querySelector('#sports-count');
const sportsGroups = document.querySelector('#sports-groups');
const sportsMessage = document.querySelector('#sports-message');
let sportRecords = [];

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
  const accessibleEntries = filtered.filter(sport => sport.accessible);
  const otherEntries = filtered.filter(sport => !sport.accessible);
  const groups = new Map();
  otherEntries.forEach(sport => {
    const letter = displaySportName(sport.name).charAt(0).toLocaleUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(sport);
  });

  const renderCards = entries => `<div class="sports-directory-grid">${entries.map(sport => `<a class="sports-directory-card" href="${escapeDirectoryText(sportGlossaryUrl(sport.slug, null, 'glossary.html'))}">
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
    const [sportsData, clubsData] = await Promise.all([loadSportCatalog(), loadClubDirectory()]);
    sportRecords = visibleSportRecords(sportsData, clubsData.clubs);
    renderSports();
  } catch (error) {
    sportsCount.textContent = 'SPORT DIRECTORY UNAVAILABLE';
    sportsMessage.hidden = false;
    sportsMessage.textContent = error.message || 'The sports directory could not be loaded.';
  }
}

sportsSearch.addEventListener('input', renderSports);
loadSportsDirectory();
