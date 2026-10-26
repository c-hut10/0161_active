import { displaySportName } from './club-formatting.mjs';
import { renderSportsDirectory } from './sports-directory-renderer.mjs?v=20261025-multi-sport';
import { visibleSportRecords, visibleClubCount } from './sport-catalog.mjs';
import { loadClubDirectory, loadSportCatalog } from './site-data.mjs';
import { beginControlLoading } from './control-loading.mjs';
import { selectedMapSports, addMapSport, removeMapSport } from './map-sport-selection.mjs';

/* Sports directory: render the official sport catalog, an accessible-sports group, and club counts. */
const sportsSearch = document.querySelector('#sports-search');
const sportsCount = document.querySelector('#sports-count');
const sportsGroups = document.querySelector('#sports-groups');
const sportsMessage = document.querySelector('#sports-message');
let sportRecords = [];
let directoryClubs = [];
const mapSport = document.querySelector('#home-map-sport-summary');

/* When the map is ready, sport cards control its existing filter instead of leaving the page. */
function syncMapSport() {
  if (!mapSport || mapSport.disabled) return;
  sportsGroups.querySelectorAll('[data-sport]').forEach(card => {
    const selected = selectedMapSports.has(card.dataset.sport);
    card.classList.toggle('is-selected', selected);
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', String(selected));
  });
}
sportsGroups.addEventListener('click', event => {
  const card = event.target.closest('[data-sport]');
  if (!card || !mapSport || mapSport.disabled || event.button !== 0
    || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  // The same card toggles its sport while retaining the other selected sports.
  if (selectedMapSports.has(card.dataset.sport)) removeMapSport(card.dataset.sport);
  else addMapSport(card.dataset.sport);
  window.dispatchEvent(new Event('0161-map-overview-request'));
  syncMapSport();
});
sportsGroups.addEventListener('keydown', event => {
  if (event.key !== ' ' || event.repeat || !event.target.matches('[data-sport][role="button"]')) return;
  event.preventDefault();
  event.target.click();
});
window.addEventListener('0161-map-sport-changed', syncMapSport);

function renderSports() {
  const query = sportsSearch.value.trim().toLocaleLowerCase();
  const filtered = sportRecords.filter(sport =>
    displaySportName(sport.name).toLocaleLowerCase().includes(query)
      || sport.name.toLocaleLowerCase().includes(query)
  );
  const clubTotal = visibleClubCount(filtered, directoryClubs);
  sportsCount.textContent = `${filtered.length} SPORTS · ${clubTotal} CLUBS ON RECORD`;

  if (!filtered.length) {
    sportsGroups.innerHTML = '';
    sportsMessage.hidden = false;
    sportsMessage.textContent = 'No sports match that search.';
    return;
  }

  sportsMessage.hidden = true;
  sportsGroups.innerHTML = renderSportsDirectory(filtered);
  syncMapSport();
}

/* Load the official catalog and count current club records that match its sport names. */
async function loadSportsDirectory() {
  const finishLoading = beginControlLoading([sportsSearch], sportsMessage);
  try {
    const [sportsData, clubsData] = await Promise.all([loadSportCatalog(), loadClubDirectory()]);
    directoryClubs = clubsData.clubs;
    sportRecords = visibleSportRecords(sportsData, directoryClubs);
    finishLoading();
    renderSports();
  } catch (error) {
    finishLoading(false);
    // Keep generated sport links usable when browser data loading fails.
    sportsMessage.hidden = false;
    sportsMessage.textContent = 'Search is unavailable. You can still browse the sports below.';
  }
}

sportsSearch.addEventListener('input', renderSports);
loadSportsDirectory();
