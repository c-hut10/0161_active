import { sportSlug, displaySportName, canonicalArea, DAY_NAMES as dayNames, sessionTime, escapeHtml } from './club-formatting.mjs';
import { visibleSportRecords } from './sport-catalog.mjs';
import { trainingTimesBadge } from './club-verification.mjs';
import { loadClubDirectory, loadSportCatalog } from './site-data.mjs';
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
  return [...new Set([club.area, ...(club.sessions || []).map(session => session.area)]
    .map(canonicalArea)
    .filter(Boolean))];
}

function populateAreas() {
  const areas = [...new Set(sportClubs.flatMap(clubAreas))].sort((a, b) => a.localeCompare(b));
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
          || canonicalArea(session.area || club.area) === selectedArea;
        const matchesDay = selectedDay === 'all' || Number(session.dayOfWeek) === Number(selectedDay);
        return matchesArea && matchesDay;
      });
      const matchesClubAreaWithoutSession = selectedDay === 'all'
        && selectedArea !== 'all'
        && canonicalArea(club.area) === selectedArea;
      if (!matchingSession && !matchesClubAreaWithoutSession) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function visibleSessions(club) {
  const selectedArea = areaFilter.value;
  return (club.sessions || []).filter(session => {
    const area = canonicalArea(session.area || club.area);
    return selectedArea === 'all' || area === selectedArea;
  });
}

function profileHref(club) {
  const path = typeof club.profilePath === 'string' ? club.profilePath : '';
  return path.startsWith('html/') ? `../${path.slice('html/'.length)}` : '#';
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
  clubList.innerHTML = filteredClubs.map(club => {
    const sessions = visibleSessions(club);
    /* Compact busy schedules: replace four or more listed entries with one summary label. */
    const schedule = (Array.isArray(club.sessions) ? club.sessions.length : 0) > 3
      ? '<span class="sport-club-row__day">3+ weekly sessions</span>'
      : sessions.length
        ? sessions.map(session => {
          const dayNumber = Number(session.dayOfWeek);
          const day = session.day || dayNames[dayNumber] || 'Day to confirm';
          return `<span class="sport-club-row__day">${escapeHtml(day)} · ${escapeHtml(sessionTime(session))}</span>`;
        }).join('')
        : '<span class="sport-club-row__day">Training schedule to confirm</span>';
    const area = canonicalArea(club.area || club.location || 'Manchester');

    return `<li>
      <article class="sport-club-row">
        <span class="sport-club-row__number" aria-hidden="true"></span>
        <div class="sport-club-row__details">
          <h3><a class="sport-club-name" href="${escapeHtml(profileHref(club))}">${escapeHtml(club.name)}${trainingTimesBadge(club)}</a></h3>
        </div>
        <p class="sport-club-row__sessions">${schedule}</p>
        <p class="sport-club-row__area">${escapeHtml(area)}</p>
        <a class="sport-club-link" href="${escapeHtml(profileHref(club))}" aria-label="Open ${escapeHtml(club.name)} profile">↗</a>
      </article>
    </li>`;
  }).join('');
}

/* Data startup: choose a sport by URL and build its area/day filtered numbered club list. */
async function loadGlossary() {
  try {
    const requestedSlug = sportSlug(new URLSearchParams(window.location.search).get('sport') || 'run-club');
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
    document.title = `${sportName} | 0161 Active`;
    document.querySelector('meta[name="description"]').content = `Explore ${sportName.toLowerCase()} clubs across Greater Manchester. Filter by area and training day, and view individual club profiles on 0161 Active.`;
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
    renderDirectory();
  } catch (error) {
    clubCount.textContent = 'CLUB DIRECTORY UNAVAILABLE';
    directoryMessage.hidden = false;
    directoryMessage.textContent = error.message || 'The club directory could not be loaded.';
  }
}

[areaFilter, dayFilter].forEach(filter => filter.addEventListener('change', renderDirectory));
clubSearch.addEventListener('input', renderDirectory);
loadGlossary();
