import { displaySportName } from './club-formatting.mjs';
import { renderSportsDirectory } from './sports-directory-renderer.mjs';
import { visibleSportRecords } from './sport-catalog.mjs';
import { loadClubDirectory, loadSportCatalog } from './site-data.mjs';
import { beginControlLoading } from './control-loading.mjs';

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
  sportsGroups.innerHTML = renderSportsDirectory(filtered);
}

/* Load the official catalog and count current club records that match its sport names. */
async function loadSportsDirectory() {
  const finishLoading = beginControlLoading([sportsSearch], sportsMessage);
  try {
    const [sportsData, clubsData] = await Promise.all([loadSportCatalog(), loadClubDirectory()]);
    sportRecords = visibleSportRecords(sportsData, clubsData.clubs);
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
