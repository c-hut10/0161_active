import { renderWeekGrid, frequencyToggle, eligibilityMarkup } from './calendar-week-renderer.mjs';
import { canonicalArea, WEEK_DAYS as DAYS, sessionTime as formatTime, escapeHtml, clubSports, sessionSport, timeMinutes, compareSessionStartTimes } from './club-formatting.mjs';
import { clubVerificationBadge } from './club-verification.mjs';
import { loadClubDirectory } from './site-data.mjs';
import { beginControlLoading } from './control-loading.mjs';
import { downloadClubCalendar } from './club-calendar.mjs';
import { sessionTitle, sessionProfileUrl, sessionAddress, sessionVenueNote, sessionVenueNoteHtml, sessionTerms } from './session-details.mjs';
import { priceLabel, sportName as displaySportName, matchesSessionPrice } from './club-directory-filters.js';
import { clubTrainingAreas } from './club-areas.mjs';
import { enhanceFilterPickers, syncFilterPickers, focusFilterControl } from './filter-picker.mjs';

/* Calendar data: read the shared JSON directory used to build both weekly and daily views. */
const sportFilter = document.querySelector('#filter-sport');
const priceFilter = document.querySelector('#filter-price');
const areaFilter = document.querySelector('#filter-area');
const startingTime = document.querySelector('#filter-start-time');
const timeFlexibility = document.querySelector('#filter-time-flexibility');
const activeFilters = document.querySelector('#calendar-active-filters');
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

/* Mobile weeks: size entries to each club's tallest session, including after filters or text changes. */
const mobileWeek = window.matchMedia('(max-width: 1040px)');
let sessionSizingFrame = 0;
function sizeWeeklySessions() {
  if (sessionSizingFrame) return;
  sessionSizingFrame = requestAnimationFrame(() => {
    sessionSizingFrame = 0;
    const rows = [...weekGrid.querySelectorAll('.week-row')];
    rows.forEach(row => row.style.removeProperty('--week-session-height'));
    if (!mobileWeek.matches || weekView.hidden) return;
    // Read natural heights together before applying any row minimums.
    weekGrid.classList.add('week-grid--measuring');
    const heights = rows.map(row => Math.ceil(Math.max(0,
      ...[...row.querySelectorAll('.week-session')].map(session => session.getBoundingClientRect().height)
    )));
    rows.forEach((row, index) => row.style.setProperty('--week-session-height', `${heights[index]}px`));
    weekGrid.classList.remove('week-grid--measuring');
  });
}
let weekWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width === weekWidth) return;
  weekWidth = entry.contentRect.width;
  sizeWeeklySessions();
}).observe(weekGrid);
weekGrid.addEventListener('toggle', sizeWeeklySessions, true);
mobileWeek.addEventListener('change', sizeWeeklySessions);
window.addEventListener('resize', sizeWeeklySessions);
new MutationObserver(sizeWeeklySessions).observe(document.documentElement, {
  attributes: true, attributeFilter: ['class']
});
document.fonts?.ready.then(sizeWeeklySessions);
document.fonts?.addEventListener('loadingdone', sizeWeeklySessions);
sizeWeeklySessions();

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
const selectedSports = new Set();
const selectedAreas = new Set();
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
  const sports = [...new Set(clubs.flatMap(clubSports))].sort();
  const areas = [...new Set(clubs.flatMap(clubTrainingAreas))].sort();

  sportFilter.replaceChildren(new Option('All sports', ''), new Option('All sports (clear selections)', 'all'));
  sports.forEach(sport => sportFilter.add(new Option(displaySportName(sport), sport)));
  /* Membership includes membership-only clubs and optional memberships alongside session pricing. */
  priceFilter.replaceChildren(new Option('Any price', 'all'), new Option('Free', 'free'),
    new Option('Pay-per-session', 'per_session'), new Option('Membership', 'membership'));
  areaFilter.replaceChildren(new Option('All areas', ''), new Option('All areas (clear selections)', 'all'));
  areas.forEach(area => areaFilter.add(new Option(area, area)));
}

function areaMatches(club, session) {
  return selectedAreas.size === 0 || selectedAreas.has(canonicalArea(session.area));
}

/* Preferred starting time: a blank input is unrestricted; flexibility includes either side. */
function hasTimeRange() { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startingTime.value); }
function clearTimeRange() {
  startingTime.value = '';
  timeFlexibility.value = '0';
}
function timeMatches(session) {
  if (!hasTimeRange()) return true;
  const sessionMinutes = timeMinutes(session.startTime);
  if (sessionMinutes === null) return false;
  const difference = Math.abs(sessionMinutes - timeMinutes(startingTime.value));
  // A window near midnight can include the end or beginning of the same clock cycle.
  return Math.min(difference, 1440 - difference) <= Number(timeFlexibility.value);
}

function matchesFilters(club) {
  return (!selectedSports.size || clubSports(club).some(sport => selectedSports.has(sport)))
    && (!selectedAreas.size || clubTrainingAreas(club).some(area => selectedAreas.has(area)))
    && ((club.sessions || []).length
      ? club.sessions.some(session => matchesSessionPrice(club, session, priceFilter.value))
      : matchesSessionPrice(club, null, priceFilter.value));
}

function getVisibleClubs() {
  return clubs.filter(matchesFilters).sort((a, b) => a.name.localeCompare(b.name));
}

/* Prepared sessions: apply the area filter once and group each club's sessions by weekday. */
function prepareCalendarEntries() {
  return getVisibleClubs().map(club => {
    const sessions = (club.sessions || []).filter(session => areaMatches(club, session)
      && matchesSessionPrice(club, session, priceFilter.value) && timeMatches(session)
      && (!selectedSports.size || selectedSports.has(sessionSport(club, session))));
    const sessionsByDay = new Map();
    sessions.forEach(session => {
      const day = Number(session.dayOfWeek);
      if (!sessionsByDay.has(day)) sessionsByDay.set(day, []);
      sessionsByDay.get(day).push(session);
    });
    return { club, sessions, sessionsByDay };
  }).filter(entry => entry.sessions.length || (!hasTimeRange() && !(entry.club.sessions || []).length));
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
    || compareSessionStartTimes(left.session, right.session)
    || left.club.name.localeCompare(right.club.name));

  const dayLabel = days.map(day => day.name.toUpperCase()).join(' + ');
  const eyebrow = `${dayLabel} · ${calendarEyebrow(sportLabel, clubCount)}`;
  const cards = events.map(({ club, session, day }) => {
    /* Day-card eyebrow: identify the sport instead of showing provisional-data status. */
    const sportLabel = displaySportName(sessionSport(club, session));
    return `<article class="agenda-event">
      <div class="agenda-time"><span class="agenda-day">${escapeHtml(day.name)}</span><time>${escapeHtml(formatTime(session))}</time><span class="agenda-sport">${escapeHtml(sportLabel)}</span></div>
      <a class="agenda-club" href="${escapeHtml(`/${club.profilePath}`)}">${escapeHtml(club.name)}${clubVerificationBadge(club)}</a>
      <div class="agenda-details"><strong class="session-title"><a class="session-title-link" href="${escapeHtml(sessionProfileUrl(club))}">${escapeHtml(sessionTitle(club, session))}</a></strong>${session.subtitle?.trim() ? `<span class="session-subtitle">${escapeHtml(session.subtitle)}</span>` : ''}${eligibilityMarkup(session)}<span>${escapeHtml(sessionAddress(session) || session.area || 'Area to confirm')}</span>${sessionVenueNote(club, session) ? `<span class="session-subtitle">${sessionVenueNoteHtml(club, session)}</span>` : ''}${frequencyToggle(session)}</div>
      <span class="agenda-price">${escapeHtml(priceLabel(club, session))}${sessionTerms(club, session, { includePrice: false }).map(term => `<br><span>${escapeHtml(term)}</span>`).join('')}</span>
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

/* Native pickers add or toggle choices; selection labels remain the authoritative visible state. */
function updateMultiPicker(control, selections, name, labelFor) {
  control.options[0].textContent = selections.size ? `Add another ${name}…` : `All ${name === 'sport' ? 'sports' : 'areas'}`;
  for (const option of [...control.options].slice(2)) {
    option.textContent = `${selections.has(option.value) ? '✓ ' : ''}${labelFor(option.value)}`;
  }
  control.value = '';
}

/* Active labels: each sport, area and weekday can be removed without clearing its neighbours. */
function renderActiveFilters() {
  updateMultiPicker(sportFilter, selectedSports, 'sport', displaySportName);
  updateMultiPicker(areaFilter, selectedAreas, 'area', value => value);
  const choices = [
    ...[...selectedSports].map(value => ({ type: 'sport', value, label: displaySportName(value) })),
    ...(priceFilter.value === 'all' ? [] : [{ type: 'price', value: priceFilter.value, label: priceFilter.selectedOptions[0].textContent }]),
    ...(hasTimeRange() ? [{ type: 'time', value: 'preferred', label: `Starting time: ${startingTime.value}${Number(timeFlexibility.value) ? ` ±${timeFlexibility.value} minutes` : ' (exact)'}` }] : []),
    ...[...selectedAreas].map(value => ({ type: 'area', value, label: value })),
    ...DAYS.filter(day => selectedDays.has(day.number)).map(day => ({ type: 'day', value: String(day.number), label: day.name }))
  ];
  const labels = choices.map(({ type, value, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-filter-label';
    button.dataset.filterType = type;
    button.dataset.filterValue = value;
    button.setAttribute('aria-label', `Remove ${type} filter: ${label}`);
    const text = document.createElement('span');
    text.textContent = label;
    const remove = document.createElement('span');
    remove.className = 'calendar-filter-label__remove';
    remove.setAttribute('aria-hidden', 'true');
    remove.textContent = '×';
    button.append(text, remove);
    return button;
  });
  activeFilters.replaceChildren(...labels);
  activeFilters.hidden = labels.length === 0;
}

activeFilters.addEventListener('click', event => {
  const button = event.target.closest('[data-filter-type]');
  if (!button) return;
  const { filterType: type, filterValue: value } = button.dataset;
  let focusTarget;
  if (type === 'day') {
    toggleDay(Number(value));
    focusTarget = dayNavigation.querySelector(`[data-day="${Number(value)}"]`);
  } else {
    if (type === 'sport') { selectedSports.delete(value); focusTarget = sportFilter; }
    else if (type === 'area') { selectedAreas.delete(value); focusTarget = areaFilter; }
    else if (type === 'price') { priceFilter.value = 'all'; focusTarget = priceFilter; }
    else if (type === 'time') { clearTimeRange(); focusTarget = startingTime; }
    else return;
    renderCalendar();
  }
  // The removed label no longer exists; keep keyboard focus on the corresponding control.
  focusFilterControl(focusTarget);
});

/* Shared renderer: update the selected view and counts after navigation or any filter change. */
function renderCalendar() {
  renderActiveFilters();
  syncFilterPickers();
  /* Selection help: explain that every selected day must match and expose one reset action. */
  selectionHelp.textContent = selectedDays.size
    ? 'Showing clubs that train on every selected day.'
    : 'Select one or more days. Visible clubs will have a session on every day you select.';
  clearFilters.disabled = selectedDays.size === 0
    && selectedSports.size === 0 && selectedAreas.size === 0 && priceFilter.value === 'all' && !hasTimeRange();
  const entries = prepareCalendarEntries();
  /* Weekly eyebrow: show the chosen sport and count clubs matching every active filter. */
  const sportLabel = selectedSports.size ? [...selectedSports].map(sport => displaySportName(sport)).join(' + ') : 'All sports';
  let clubCount;
  let sessionCount = 0;
  if (activeView === 'week') {
    clubCount = entries.length;
    sessionCount = entries.reduce((total, entry) => total + entry.sessions.length, 0);
    weekOverline.textContent = calendarEyebrow(sportLabel, clubCount);
    weekGrid.innerHTML = renderWeekGrid(entries);
    sizeWeeklySessions();
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

/* Sport and area picks accumulate; choosing an already selected option toggles it off. */
[[sportFilter, selectedSports], [areaFilter, selectedAreas]].forEach(([control, selections]) => {
  control.addEventListener('change', () => {
    const value = control.value;
    if (value === 'all') selections.clear();
    else if (value) {
      if (selections.has(value)) selections.delete(value);
      else selections.add(value);
    }
    renderCalendar();
  });
});
priceFilter.addEventListener('change', renderCalendar);
startingTime.addEventListener('change', renderCalendar);
timeFlexibility.addEventListener('change', renderCalendar);

/* Clear filters: reset every filter and weekday selection through the existing week-view switch. */
clearFilters.addEventListener('click', () => {
  selectedSports.clear();
  selectedAreas.clear();
  priceFilter.value = 'all';
  clearTimeRange();
  setView('week');
});

/* Startup: load the compact static directory and gracefully report a missing or invalid file. */
async function loadCalendarData() {
  const finishLoading = beginControlLoading(
    [sportFilter, priceFilter, areaFilter, startingTime, timeFlexibility, ...dayNavigation.querySelectorAll('button'),
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

enhanceFilterPickers('.calendar-filters select');
loadCalendarData();
