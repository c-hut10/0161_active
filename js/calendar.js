import { savedClubsKey, readSavedClubs } from './saved-clubs.mjs';
import { renderWeekGrid, frequencyToggle, eligibilityMarkup, removeFavouriteButton } from './calendar-week-renderer.mjs';
import { WEEK_DAYS as DAYS, sessionTime as formatTime, escapeHtml, sessionSport, compareSessionStartTimes } from './club-formatting.mjs';
import { clubVerificationBadge } from './club-verification.mjs';
import { loadClubDirectory } from './site-data.mjs';
import { beginControlLoading } from './control-loading.mjs';
import { sessionTitle, sessionProfileUrl, sessionAddress, sessionVenueNote, sessionVenueNoteHtml, sessionTerms } from './session-details.mjs';
import { priceLabel, sportName as displaySportName } from './club-directory-filters.js';

/* Calendar data: read the shared JSON directory used to build both weekly and daily views. */
const resultCount = document.querySelector('#result-count');
const calendarMessage = document.querySelector('#calendar-message');
const weekGrid = document.querySelector('#week-grid');
const weekView = document.querySelector('#week-view');
const weekOverline = document.querySelector('#week-overline');
const dayView = document.querySelector('#day-view');
const dayAgenda = document.querySelector('#day-agenda');
const dayNavigation = document.querySelector('#calendar-day-nav');
const selectionHelp = document.querySelector('#calendar-selection-help');
const calendarPage = document.querySelector('.calendar-page');
const mainContent = document.querySelector('#main-content');
const favouriteStatus = document.createElement('p');
favouriteStatus.className = 'calendar-message';
favouriteStatus.setAttribute('role', 'status');
favouriteStatus.hidden = true;
document.querySelector('#calendar-message').after(favouriteStatus);
mainContent.addEventListener('click', event => {
  const button = event.target.closest('[data-remove-favourite]');
  if (!button) return;
  const club = clubs.find(item => item.id === button.dataset.removeFavourite);
  if (!club) return;
  const saved = readSavedClubs();
  try {
    if (saved.error) throw new Error('Your saved clubs could not be read.');
    saved.ids.delete(club.id);
    if (saved.ids.size) localStorage.setItem(savedClubsKey, JSON.stringify([...saved.ids]));
    else localStorage.removeItem(savedClubsKey);
    window.dispatchEvent(new Event('saved-clubs-changed'));
    favouriteStatus.textContent = `${club.name} removed from your favourites.`;
    // The removed button no longer exists; keep focus in the current calendar view.
    const view = activeView === 'week' ? weekGrid : dayAgenda;
    (view.querySelector('[data-remove-favourite]') || dayNavigation.querySelector('[data-view="week"]')).focus({ preventScroll:true });
  } catch {
    favouriteStatus.textContent = 'Your browser could not remove this favourite. Check its site-storage settings and try again.';
  }
  favouriteStatus.hidden = false;
});
const weekHeadingPosition = document.querySelector('#week-heading-position');
const dayHeadingPosition = document.querySelector('#day-heading-position');

/* Mobile weeks: size entries to each club's tallest session, including after view or text changes. */
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
let savedClubs = readSavedClubs();
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

function getVisibleClubs() {
  return clubs.filter(club => savedClubs.ids.has(club.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* Group every favourited club's sessions by weekday without discovery filters. */
function prepareCalendarEntries() {
  return getVisibleClubs().map(club => {
    const sessions = club.sessions || [];
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
    || compareSessionStartTimes(left.session, right.session)
    || left.club.name.localeCompare(right.club.name));

  const dayLabel = days.map(day => day.name.toUpperCase()).join(' + ');
  const eyebrow = `${dayLabel} · ${calendarEyebrow(sportLabel, clubCount)}`;
  const cards = events.map(({ club, session, day }) => {
    /* Day-card eyebrow: identify the sport instead of showing provisional-data status. */
    const sportLabel = displaySportName(sessionSport(club, session));
    return `<article class="agenda-event">
      <div class="agenda-time"><span class="agenda-day">${escapeHtml(day.name)}</span><time>${escapeHtml(formatTime(session))}</time><span class="agenda-sport">${escapeHtml(sportLabel)}</span></div>
      <div class="agenda-club"><a href="${escapeHtml(`/${club.profilePath}`)}">${escapeHtml(club.name)}${clubVerificationBadge(club)}</a>${removeFavouriteButton(club)}</div>
      <div class="agenda-details"><strong class="session-title"><a class="session-title-link" href="${escapeHtml(sessionProfileUrl(club))}">${escapeHtml(sessionTitle(club, session))}</a></strong>${session.subtitle?.trim() ? `<span class="session-subtitle">${escapeHtml(session.subtitle)}</span>` : ''}${eligibilityMarkup(session)}${session.distanceText ? `<span class="session-distance">${escapeHtml(session.distanceText)}</span>` : ''}<span>${escapeHtml(sessionAddress(session) || session.area || 'Area to confirm')}</span>${sessionVenueNote(club, session) ? `<span class="session-subtitle">${sessionVenueNoteHtml(club, session)}</span>` : ''}${frequencyToggle(session)}</div>
      <span class="agenda-price">${escapeHtml(priceLabel(club, session))}${sessionTerms(club, session, { includePrice: false }).map(term => `<br><span>${escapeHtml(term)}</span>`).join('')}</span>
    </article>`;
  }).join('');
  const emptyMessage = days.length > 1
    ? 'No favourited clubs have sessions on every selected day.'
    : 'No favourited club sessions on this day.';
  return `<section aria-labelledby="selected-days-overline">
    <div class="calendar-view-heading calendar-view-heading--day"><p class="calendar-eyebrow" id="selected-days-overline">${escapeHtml(eyebrow)}</p></div>
    <div class="day-agenda">${cards || `<p class="agenda-empty">${emptyMessage}</p>`}</div>
  </section>`;
}

/* Shared renderer: update the selected view and counts after navigation or saved-club changes. */
function renderCalendar() {
  savedClubs = readSavedClubs();
  /* Selection help: explain that every selected day must match and expose one reset action. */
  selectionHelp.textContent = selectedDays.size
    ? 'Showing clubs that train on every selected day.'
    : 'Select one or more days. Visible clubs will have a session on every day you select.';
  const entries = prepareCalendarEntries();
  /* Weekly eyebrow: show the chosen sport and count clubs matching every active filter. */
  const sportLabel = 'All sports';
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
  // Personal calendars never fall back to the full public schedule.
  const hasSavedClubs = clubs.some(club => savedClubs.ids.has(club.id));
  calendarMessage.hidden = hasSavedClubs && !savedClubs.error;
  if (!calendarMessage.hidden) {
    calendarMessage.textContent = savedClubs.error
      ? 'Your saved clubs could not be read. Check your browser storage settings.'
      : 'No favourited clubs in your calendar yet. Save clubs using the star on a club profile or listing. ';
    if (!savedClubs.error) {
      const link = document.createElement('a');
      link.href = '/html/sports/directory.html';
      link.textContent = 'Find a club';
      link.className = 'calendar-find-club';
      calendarMessage.append(link);
    }
    weekGrid.replaceChildren();
    dayAgenda.replaceChildren();
  }
  requestAnimationFrame(updateBackToTop);
}

// Refresh when favourites change in another tab or this page returns from browser history.
window.addEventListener('storage', event => {
  if (event.key === savedClubsKey || event.key === null) renderCalendar();
});
window.addEventListener('saved-clubs-changed', renderCalendar);
window.addEventListener('pageshow', event => { if (event.persisted) renderCalendar(); });

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

weekGrid.addEventListener('click', event => {
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) toggleDay(Number(dayButton.dataset.day));
});

/* Startup: load the compact static directory and gracefully report a missing or invalid file. */
async function loadCalendarData() {
  const finishLoading = beginControlLoading(
    [...dayNavigation.querySelectorAll('button'),
      ...weekGrid.querySelectorAll('button')], calendarMessage
  );
  try {
    const data = await loadClubDirectory();
    clubs = data.clubs;
    finishLoading();
    renderCalendar();
  } catch (error) {
    finishLoading(false);
    weekGrid.replaceChildren();
    dayAgenda.replaceChildren();
    calendarMessage.textContent = 'Your calendar could not load. Your saved clubs have been kept. Refresh the page to try again.';
    calendarMessage.hidden = false;
  }
}

loadCalendarData();
