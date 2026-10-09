import { sportSlug, displaySportName, canonicalArea, sportGlossaryUrl } from './club-formatting.mjs';
import { visibleSportRecords } from './sport-catalog.mjs';
import { loadClubDirectory, loadSportCatalog } from './site-data.mjs';
import { renderSportClubRows } from './sport-glossary-renderer.mjs';
import { beginControlLoading } from './control-loading.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
/* Sport glossary: filter clubs from the same JSON records used by profiles and calendar. */
const clubList = document.querySelector('#club-list');
const clubCount = document.querySelector('#club-count');
const areaFilter = document.querySelector('#area-filter');
const dayFilter = document.querySelector('#day-filter');
const clubSearch = document.querySelector('#club-search');
const directoryMessage = document.querySelector('#directory-message');

let sportClubs = [];
let sportName = 'Run Club';
let sportIsVisible = true;

function sportCollectionLabel(name) {
  return name === 'Run Club' ? 'run clubs' : `${name.toLocaleLowerCase()} clubs`;
}

function clubAreas(club) {
  return clubTrainingAreas(club);
}

function populateAreas() {
  const areas = [...new Set(sportClubs.flatMap(clubAreas))].sort((a, b) => a.localeCompare(b));
  areaFilter.replaceChildren(new Option('All areas', 'all'));
  areas.forEach(area => areaFilter.add(new Option(area, area)));
}

function matchingClubs() {
  const query = clubSearch.value.trim().toLocaleLowerCase();
  const selectedArea = areaFilter.value;
  const selectedDay = dayFilter.value;

  return sportClubs.filter(club => {
    if (query && !club.name.toLocaleLowerCase().includes(query)) return false;

    const sessions = Array.isArray(club.sessions) ? club.sessions : [];
    if (selectedArea !== 'all' || selectedDay !== 'all') {
      const matchingSession = sessions.some(session => {
        const matchesArea = selectedArea === 'all'
          || canonicalArea(session.area) === selectedArea;
        const matchesDay = selectedDay === 'all' || Number(session.dayOfWeek) === Number(selectedDay);
        return matchesArea && matchesDay;
      });
      const matchesClubAreaWithoutSession = selectedDay === 'all'
        && selectedArea !== 'all'
        && clubAreas(club).includes(selectedArea);
      if (!matchingSession && !matchesClubAreaWithoutSession) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function renderDirectory() {
  const filteredClubs = matchingClubs();
  clubCount.textContent = `${String(filteredClubs.length).padStart(2, '0')} CLUBS SHOWN`;

  if (!filteredClubs.length) {
    clubList.innerHTML = '';
    directoryMessage.hidden = false;
    directoryMessage.textContent = !sportIsVisible
      ? 'This sport is not currently listed.'
      : sportClubs.length
        ? `No ${sportCollectionLabel(sportName)} match these filters.`
        : `No ${sportCollectionLabel(sportName)} are listed yet. Check back soon or register your club.`;
    return;
  }

  directoryMessage.hidden = true;
  clubList.innerHTML = renderSportClubRows(filteredClubs, areaFilter.value);
}

/* Data startup: choose a sport by URL and build its area/day filtered numbered club list. */
async function loadGlossary() {
  const finishLoading = beginControlLoading([clubSearch, areaFilter, dayFilter], directoryMessage);
  try {
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = document.body.dataset.sport || sportSlug(params.get('sport') || 'run-club');
    // Older query-based links retain their area filter when opening the generated sport page.
    if (!document.body.dataset.sport) {
      window.location.replace(sportGlossaryUrl(requestedSlug, params.get('area'), '/html/sports/glossary.html'));
      return;
    }
    const [sportsData, clubsData] = await Promise.all([loadSportCatalog(), loadClubDirectory()]);
    const sports = Array.isArray(sportsData.sports) ? sportsData.sports : [];
    const canonicalSportName = sports.find(name => sportSlug(name) === requestedSlug)
      || requestedSlug.split('-').filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
      || 'Run Club';
    sportName = displaySportName(canonicalSportName);
    document.querySelector('#sport-title').textContent = sportName;
    document.querySelector('#club-list').setAttribute('aria-label', `${sportName} listings in Manchester`);
    document.querySelector('.sport-club-directory').setAttribute('aria-label', `${sportName} listings`);
    document.querySelector('.sport-glossary-filters').setAttribute('aria-label', `Filter ${sportName} listings`);
    const clubs = clubsData.clubs;
    const matchingClubs = clubs.filter(club => sportSlug(club.sport || '') === requestedSlug
      && club.hiddenFromSportList !== true);
    /* Direct glossary URLs follow the same availability rules as the menus and directory. */
    sportIsVisible = visibleSportRecords(sportsData, clubs).some(sport => sport.slug === requestedSlug);
    sportClubs = sportIsVisible ? matchingClubs : [];
    populateAreas();
    const requestedArea = canonicalArea(new URLSearchParams(window.location.search).get('area') || '');
    const matchingArea = [...areaFilter.options].find(option => option.value.toLocaleLowerCase() === requestedArea.toLocaleLowerCase());
    if (matchingArea) areaFilter.value = matchingArea.value;
    finishLoading();
    renderDirectory();
  } catch (error) {
    finishLoading(false);
    // Preserve the generated club list rather than replacing it with a loading error.
    directoryMessage.hidden = false;
    directoryMessage.textContent = 'Filters are unavailable. You can still browse the clubs below.';
  }
}

[areaFilter, dayFilter].forEach(filter => filter.addEventListener('change', renderDirectory));
clubSearch.addEventListener('input', renderDirectory);

/* League expansion: animate layout height so the content below follows the roster smoothly. */
document.querySelectorAll('.league-card__teams').forEach(details => {
  const summary = details.querySelector('summary');
  const roster = details.querySelector('.sport-club-list');
  let expanded = details.open;
  let animation = null;

  summary.addEventListener('click', event => {
    event.preventDefault();
    const currentHeight = details.getBoundingClientRect().height;
    expanded = !expanded;
    animation?.cancel();
    animation = null;
    roster.inert = !expanded;

    // Native details remains the fallback; reduced motion changes state immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      details.open = expanded;
      details.classList.remove('is-animating');
      return;
    }

    // Keep closing content rendered until its container finishes shrinking.
    details.open = true;
    const targetHeight = expanded
      ? details.getBoundingClientRect().height
      : summary.getBoundingClientRect().height;
    details.classList.add('is-animating');
    const nextAnimation = details.animate(
      [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
      { duration: 500, easing: 'cubic-bezier(.4, 0, .2, 1)' }
    );
    animation = nextAnimation;
    nextAnimation.onfinish = () => {
      if (animation !== nextAnimation) return;
      details.open = expanded;
      details.classList.remove('is-animating');
      animation = null;
    };
  });
});
loadGlossary();
