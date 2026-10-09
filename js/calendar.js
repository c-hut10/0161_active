import { renderWeekGrid, frequencyToggle, eligibilityMarkup } from './calendar-week-renderer.mjs';
import { canonicalArea, WEEK_DAYS as DAYS, sessionTime as formatTime, escapeHtml } from './club-formatting.mjs';
import { clubVerificationBadge } from './club-verification.mjs';
import { loadClubDirectory } from './site-data.mjs';
import { beginControlLoading } from './control-loading.mjs';
import { downloadClubCalendar } from './club-calendar.mjs';
import { sessionTitle, sessionAddress, sessionVenueNote, sessionVenueNoteHtml } from './session-details.mjs';
import { priceLabel, sportName as displaySportName, matchesClubFilters } from './club-directory-filters.js';

/* Calendar data: read the shared JSON directory used to build both weekly and daily views. */
const sportFilter = document.querySelector('#filter-sport');
const priceFilter = document.querySelector('#filter-price');
const areaFilter = document.querySelector('#filter-area');
const resultCount = document.querySelector('#result-count');
const calendarMessage = document.querySelector('#calendar-message');
const weekGrid = document.querySelector('#week-grid');
const weekView = document.querySelector('#week-view');
const weekOverline = document.querySelector('#week-overline');
const dayView = document.querySelector('#day-view');
const dayAgenda = document.querySelector('#day-agenda');
const dayNavigation = document.querySelector('#calendar-day-nav');
const selectionHelp = document.querySelector('#calendar-selection-help');
const clearFilters = document.querySelector('#calendar-clear-filters');
const downloadStatus = document.createElement('p');
downloadStatus.className = 'calendar-message';
downloadStatus.setAttribute('role', 'status');
downloadStatus.hidden = true;
weekGrid.before(downloadStatus);
const calendarPage = document.querySelector('.calendar-page');
const mainContent = document.querySelector('#main-content');
const weekHeadingPosition = document.querySelector('#week-heading-position');
const dayHeadingPosition = document.querySelector('#day-heading-position');

/* Keep weekday columns below the sticky view selector, including when it wraps. */
const navigationResizeObserver = new ResizeObserver(() => {
  calendarPage.style.setProperty(
    '--calendar-day-nav-height', `${dayNavigation.getBoundingClientRect().height}px`
  );
});
navigationResizeObserver.observe(dayNavigation);

let clubs = [];
// Selected days accumulate; each selected button displays its own animated rails.
const selectedDays = new Set();
let activeView = 'week';

const backToTop = document.querySelector('#calendar-back-to-top');
/* Measure an ordinary marker: the sticky table header no longer moves past the viewport. */
function updateBackToTop() {
  const marker = activeView === 'week' ? weekHeadingPosition : dayHeadingPosition;
  backToTop.hidden = marker.getBoundingClientRect().top >= 0;
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
window.addEventListener('resize', updateBackToTop);
backToTop.addEventListener('click', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.classList.contains('a11y-reduce-motion');
  mainContent.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
});

/* Session notes: explain group restrictions and special schedules without guessing times. */
/* Filter controls are populated from the dataset so future sports and areas need no UI rewrite. */
function populateFilters() {
  const sports = [...new Set(clubs.map(club => club.sport).filter(Boolean))].sort();
  const areas = [...new Set(clubs.flatMap(club => [club.area, ...(club.sessions || []).map(session => session.area)]).map(canonicalArea).filter(Boolean))].sort();

  sports.forEach(sport => sportFilter.add(new Option(displaySportName(sport), sport)));
  /* Membership includes membership-only clubs and optional memberships alongside session pricing. */
  priceFilter.replaceChildren(new Option('Any price', 'all'), new Option('Free', 'free'),
    new Option('Pay-per-session', 'per_session'), new Option('Membership', 'membership'));
  areas.forEach(area => areaFilter.add(new Option(area, area)));
}

function areaMatches(club, session) {
  const selectedArea = areaFilter.value;
  if (selectedArea === 'all') return true;
  return canonicalArea(session.area) === selectedArea;
}

function matchesFilters(club) {
  return matchesClubFilters(club, { sport: sportFilter.value, price: priceFilter.value, area: areaFilter.value });
}

function getVisibleClubs() {
  return clubs.filter(matchesFilters).sort((a, b) => a.name.localeCompare(b.name));
}

/* Prepared sessions: apply the area filter once and group each club's sessions by weekday. */
function prepareCalendarEntries() {
  return getVisibleClubs().map(club => {
    const sessions = (club.sessions || []).filter(session => areaMatches(club, session));
    const sessionsByDay = new Map();
    sessions.forEach(session => {
      const day = Number(session.dayOfWeek);
      if (!sessionsByDay.has(day)) sessionsByDay.set(day, []);
      sessionsByDay.get(day).push(session);
    });
    return { club, sessions, sessionsByDay };
  });
}

function setView(viewName) {
  activeView = viewName;
  if (viewName === 'week') {
    selectedDays.clear();
  }
  weekView.hidden = viewName !== 'week';
  dayView.hidden = viewName !== 'day';
  const visibleView = viewName === 'week' ? weekView : dayView;
  visibleView.classList.remove('is-entering');
  requestAnimationFrame(() => visibleView.classList.add('is-entering'));

  dayNavigation.querySelectorAll('[data-view="week"]').forEach(button => {
    button.setAttribute('aria-pressed', String(viewName === 'week'));
  });
  dayNavigation.querySelectorAll('[data-day]').forEach(button => {
    button.setAttribute('aria-pressed', String(viewName === 'day' && selectedDays.has(Number(button.dataset.day))));
  });
  renderCalendar();
}

/* Day selection: clicks toggle individual days; removing the last restores the full week. */
function toggleDay(dayNumber) {
  if (selectedDays.has(dayNumber)) selectedDays.delete(dayNumber);
  else selectedDays.add(dayNumber);
  setView(selectedDays.size ? 'day' : 'week');
}

/* Shared eyebrows: keep sport labels and singular/plural club counts consistent in both views. */
function calendarEyebrow(sportLabel, count) {
  return `${sportLabel} · ${count} ${count === 1 ? 'club' : 'clubs'}`.toUpperCase();
}

/* Combined agenda: one eyebrow lists all chosen days; sessions retain their weekday and time. */
function renderSelectedDays(events, sportLabel, days, clubCount) {
  events.sort((left, right) => left.day.number - right.day.number
    || (left.session.startTime || '99:99').localeCompare(right.session.startTime || '99:99')
    || left.club.name.localeCompare(right.club.name));

  const dayLabel = days.map(day => day.name.toUpperCase()).join(' + ');
  const eyebrow = `${dayLabel} · ${calendarEyebrow(sportLabel, clubCount)}`;
  const cards = events.map(({ club, session, day }) => {
    /* Day-card eyebrow: identify the sport instead of showing provisional-data status. */
    const sportLabel = displaySportName(club.sport);
    return `<article class="agenda-event">
      <div class="agenda-time"><span class="agenda-day">${escapeHtml(day.name)}</span><time>${escapeHtml(formatTime(session))}</time><span class="agenda-sport">${escapeHtml(sportLabel)}</span></div>
      <a class="agenda-club" href="${escapeHtml(`/${club.profilePath}`)}">${escapeHtml(club.name)}${clubVerificationBadge(club)}</a>
      <div class="agenda-details"><strong class="session-title">${escapeHtml(sessionTitle(club, session))}</strong>${session.subtitle?.trim() ? `<span class="session-subtitle">${escapeHtml(session.subtitle)}</span>` : ''}${eligibilityMarkup(session)}<span>${escapeHtml(sessionAddress(session) || session.area || 'Area to confirm')}</span>${sessionVenueNote(club, session) ? `<span class="session-subtitle">${sessionVenueNoteHtml(club, session)}</span>` : ''}${frequencyToggle(session)}</div>
      <span class="agenda-price">${escapeHtml(priceLabel(club))}</span>
    </article>`;
  }).join('');
  const emptyMessage = days.length > 1
    ? 'No clubs have sessions on every selected day with these filters.'
    : 'No sessions match these filters for this day.';
  return `<section aria-labelledby="selected-days-overline">
    <div class="calendar-view-heading calendar-view-heading--day"><p class="calendar-eyebrow" id="selected-days-overline">${escapeHtml(eyebrow)}</p></div>
    <div class="day-agenda">${cards || `<p class="agenda-empty">${emptyMessage}</p>`}</div>
  </section>`;
}

/* Shared renderer: update the selected view and counts after navigation or any filter change. */
function renderCalendar() {
  /* Selection help: explain that every selected day must match and expose one reset action. */
  selectionHelp.textContent = selectedDays.size
    ? 'Showing clubs that train on every selected day.'
    : 'Select one or more days. Clubs must have a session on every day you select.';
  clearFilters.disabled = selectedDays.size === 0
    && [sportFilter, priceFilter, areaFilter].every(filter => filter.value === 'all');
  const entries = prepareCalendarEntries();
  /* Weekly eyebrow: show the chosen sport and count clubs matching every active filter. */
  const sportLabel = sportFilter.value === 'all' ? 'All sports' : displaySportName(sportFilter.value);
  let clubCount;
  let sessionCount = 0;
  if (activeView === 'week') {
    clubCount = entries.length;
    sessionCount = entries.reduce((total, entry) => total + entry.sessions.length, 0);
    weekOverline.textContent = calendarEyebrow(sportLabel, clubCount);
    weekGrid.innerHTML = renderWeekGrid(entries);
  } else {
    const days = DAYS.filter(day => selectedDays.has(day.number));
    /* Combined day filter: each club needs an area-matching session on every selected day. */
    const matchingEntries = entries.filter(({ sessionsByDay }) =>
      days.every(day => sessionsByDay.has(day.number))
    );
    const events = matchingEntries.flatMap(({ club, sessionsByDay }) =>
      days.flatMap(day => sessionsByDay.get(day.number).map(session => ({ club, session, day })))
    );
    sessionCount = events.length;
    clubCount = matchingEntries.length;
    dayAgenda.innerHTML = renderSelectedDays(events, sportLabel, days, clubCount);
  }
  resultCount.textContent = `${clubCount} ${clubCount === 1 ? 'club' : 'clubs'} · ${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`;
  requestAnimationFrame(updateBackToTop);
}

/* Navigation events: weekday selection switches views without clearing the active filters. */
dayNavigation.addEventListener('click', event => {
  const weekButton = event.target.closest('[data-view="week"]');
  if (weekButton) {
    setView('week');
    return;
  }
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) {
    toggleDay(Number(dayButton.dataset.day));
  }
});

weekGrid.addEventListener('click', async event => {
  const downloadButton = event.target.closest('[data-calendar-club]');
  if (downloadButton) {
    downloadButton.disabled = true;
    downloadButton.setAttribute('aria-busy', 'true');
    downloadStatus.textContent = 'Preparing calendar…';
    downloadStatus.hidden = false;
    try {
      const club = clubs.find(item => item.id === downloadButton.dataset.calendarClub);
      if (!club) throw new Error('Club calendar is unavailable.');
      downloadStatus.textContent = downloadClubCalendar(club, new URL(`/${club.profilePath}`, window.location.href).href);
    } catch (error) {
      downloadStatus.textContent = error.message;
    } finally {
      downloadStatus.hidden = false;
      downloadButton.disabled = false;
      downloadButton.removeAttribute('aria-busy');
    }
    return;
  }
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) toggleDay(Number(dayButton.dataset.day));
});

[sportFilter, priceFilter, areaFilter].forEach(filter => filter.addEventListener('change', renderCalendar));

/* Clear filters: reset every filter and weekday selection through the existing week-view switch. */
clearFilters.addEventListener('click', () => {
  [sportFilter, priceFilter, areaFilter].forEach(filter => { filter.value = 'all'; });
  setView('week');
});

/* Startup: load the compact static directory and gracefully report a missing or invalid file. */
async function loadCalendarData() {
  const finishLoading = beginControlLoading(
    [sportFilter, priceFilter, areaFilter, ...dayNavigation.querySelectorAll('button'),
      ...weekGrid.querySelectorAll('button')], calendarMessage
  );
  try {
    const data = await loadClubDirectory();
    clubs = data.clubs;
    populateFilters();
    finishLoading();
    renderCalendar();
  } catch (error) {
    finishLoading(false);
    // Retain the generated schedule if fresh data cannot be loaded for filtering.
    calendarMessage.textContent = 'Filters are unavailable. You can still browse the schedule and open club profiles.';
    calendarMessage.hidden = false;
  }
}

loadCalendarData();
