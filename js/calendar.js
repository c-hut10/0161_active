/* Calendar data: read the shared JSON directory used to build both weekly and daily views. */
const DAYS = [
  { number: 1, name: 'Monday', short: 'MON' },
  { number: 2, name: 'Tuesday', short: 'TUE' },
  { number: 3, name: 'Wednesday', short: 'WED' },
  { number: 4, name: 'Thursday', short: 'THU' },
  { number: 5, name: 'Friday', short: 'FRI' },
  { number: 6, name: 'Saturday', short: 'SAT' },
  { number: 7, name: 'Sunday', short: 'SUN' }
];

const sportFilter = document.querySelector('#filter-sport');
const priceFilter = document.querySelector('#filter-price');
const areaFilter = document.querySelector('#filter-area');
/* Price types: keep filter labels and cost displays aligned with club JSON values. */
const PRICE_TYPE_LABELS = {
  free: 'Free',
  monthly_fee: 'Monthly fee',
  annual_fee: 'Annual fee',
  per_session: 'Per-session fee',
  paid: 'Paid',
  unknown: 'Price not confirmed'
};
const PRICE_TYPE_ORDER = ['free', 'monthly_fee', 'annual_fee', 'per_session', 'paid', 'unknown'];
const resultCount = document.querySelector('#result-count');
const calendarMessage = document.querySelector('#calendar-message');
const sampleNote = document.querySelector('#sample-note');
const weekGrid = document.querySelector('#week-grid');
const weekView = document.querySelector('#week-view');
const dayView = document.querySelector('#day-view');
const dayAgenda = document.querySelector('#day-agenda');
const dayHeading = document.querySelector('#day-heading');
const dayOverline = document.querySelector('#day-overline');
const dayNavigation = document.querySelector('#calendar-day-nav');
const backToWeek = document.querySelector('#back-to-week');

let clubs = [];
let activeDay = null;
let activeView = 'week';

/* Navigation frame: track the selected button so its lime rails travel with the active view. */
function positionCalendarNavFrame() {
  const activeButton = dayNavigation.querySelector('.day-nav-button[aria-pressed="true"]');
  if (!activeButton) return;

  const navBounds = dayNavigation.getBoundingClientRect();
  const buttonBounds = activeButton.getBoundingClientRect();
  dayNavigation.style.setProperty('--calendar-frame-x', `${buttonBounds.left - navBounds.left}px`);
  dayNavigation.style.setProperty('--calendar-frame-y', `${buttonBounds.top - navBounds.top}px`);
  dayNavigation.style.setProperty('--calendar-frame-width', `${buttonBounds.width}px`);
  dayNavigation.style.setProperty('--calendar-frame-height', `${buttonBounds.height}px`);
}

/* Text escaping keeps future editor-submitted club details safe to insert in the page. */
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatTime(session) {
  if (!session.startTime) return 'Time TBC';
  return session.endTime ? `${session.startTime}–${session.endTime}` : session.startTime;
}

/* Sport labels: use the preferred public label without changing JSON filter values. */
function displaySportName(name) {
  const title = String(name || 'Sport').replace(/\b\w/g, letter => letter.toUpperCase());
  return title.toLocaleLowerCase() === 'running' ? 'Run Club' : title;
}

/* Session notes: explain group restrictions and special schedules without guessing times. */
function frequencyToggle(session) {
  const note = [session.everyOtherWeek ? 'Every other week' : '', session.specialConsiderations].filter(Boolean).join(' · ');
  return note
    ? `<details class="session-frequency"><summary aria-label="Show session details">i</summary><span>${escapeHtml(note)}</span></details>`
    : '';
}

function priceType(club) {
  return club.price?.type || 'unknown';
}

function priceLabel(club) {
  const price = club.price;
  if (!price || price.type === 'unknown') return 'Price not confirmed';
  if (price.type === 'free') return 'Free';
  const feePeriods = {
    monthly_fee: 'per month',
    annual_fee: 'per year',
    per_session: 'per session'
  };
  if (Number.isFinite(price.amount)) {
    const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: price.currency || 'GBP' }).format(price.amount);
    const period = feePeriods[price.type] || price.period;
    return period ? `${amount} ${period}` : amount;
  }
  const feeLabels = { monthly_fee: 'Monthly fee', annual_fee: 'Annual fee', per_session: 'Per-session fee' };
  return feeLabels[price.type] ? `${feeLabels[price.type]} · amount not listed` : 'Paid · amount not listed';
}

function sitePath(path) {
  return path ? `../${path}` : '#';
}

/* Filter controls are populated from the dataset so future sports and areas need no UI rewrite. */
function populateFilters() {
  const sports = [...new Set(clubs.map(club => club.sport).filter(Boolean))].sort();
  const priceTypes = [...new Set(clubs.map(priceType))].sort((a, b) => {
    const indexA = PRICE_TYPE_ORDER.indexOf(a);
    const indexB = PRICE_TYPE_ORDER.indexOf(b);
    return (indexA < 0 ? PRICE_TYPE_ORDER.length : indexA) - (indexB < 0 ? PRICE_TYPE_ORDER.length : indexB)
      || a.localeCompare(b);
  });
  const areas = [...new Set(clubs.flatMap(club => [club.area, ...(club.sessions || []).map(session => session.area)]).filter(Boolean))].sort();

  sports.forEach(sport => sportFilter.add(new Option(displaySportName(sport), sport)));
  priceTypes.forEach(type => {
    const label = PRICE_TYPE_LABELS[type] || 'Other price';
    priceFilter.add(new Option(label, type));
  });
  areas.forEach(area => areaFilter.add(new Option(area, area)));
}

function areaMatches(club, session) {
  const selectedArea = areaFilter.value;
  if (selectedArea === 'all') return true;
  return (session.area || club.area) === selectedArea;
}

function matchesFilters(club) {
  if (sportFilter.value !== 'all' && club.sport !== sportFilter.value) return false;
  if (priceFilter.value !== 'all' && priceType(club) !== priceFilter.value) return false;
  if (areaFilter.value === 'all') return true;
  return club.area === areaFilter.value || (club.sessions || []).some(session => areaMatches(club, session));
}

function visibleSessions(club, dayNumber = null) {
  return (club.sessions || []).filter(session =>
    (dayNumber === null || Number(session.dayOfWeek) === dayNumber) && areaMatches(club, session)
  );
}

function getVisibleClubs() {
  return clubs.filter(matchesFilters).sort((a, b) => a.name.localeCompare(b.name));
}

function setView(viewName, dayNumber = null) {
  activeView = viewName;
  activeDay = dayNumber;
  weekView.hidden = viewName !== 'week';
  dayView.hidden = viewName !== 'day';
  const visibleView = viewName === 'week' ? weekView : dayView;
  visibleView.classList.remove('is-entering');
  requestAnimationFrame(() => visibleView.classList.add('is-entering'));

  dayNavigation.querySelectorAll('[data-view="week"]').forEach(button => {
    button.setAttribute('aria-pressed', String(viewName === 'week'));
  });
  dayNavigation.querySelectorAll('[data-day]').forEach(button => {
    button.setAttribute('aria-pressed', String(viewName === 'day' && Number(button.dataset.day) === dayNumber));
  });
  requestAnimationFrame(positionCalendarNavFrame);

  if (viewName === 'day') {
    const day = DAYS.find(item => item.number === dayNumber) || DAYS[0];
    dayHeading.textContent = day.name;
    dayOverline.textContent = `${day.name.toUpperCase()} · WEEKLY SESSIONS`;
  }
  renderCalendar();
}

/* Weekly view: render each club once and place its one or two sessions under their weekdays. */
function renderWeekView(visibleClubs) {
  const header = `<div class="week-head" role="row">
    <div role="columnheader">CLUB / AREA</div>
    ${DAYS.map(day => `<div role="columnheader"><button type="button" data-day="${day.number}" aria-label="Show ${day.name} sessions">${day.short}</button></div>`).join('')}
  </div>`;

  const rows = visibleClubs.map(club => {
    /* Full-week sublabel: display the stored sport key in title case. */
    const sportLabel = displaySportName(club.sport);
    const cells = DAYS.map(day => {
      const sessions = visibleSessions(club, day.number);
      const content = sessions.length
        ? sessions.map(session => `<div class="week-session" aria-label="${escapeHtml(day.name)}, ${escapeHtml(formatTime(session))}, ${escapeHtml(session.meetingPoint || session.area || 'Manchester')}${session.everyOtherWeek ? ', every other week' : ''}">
            <div class="week-session__top"><time>${escapeHtml(formatTime(session))}</time>${frequencyToggle(session)}</div>
            <span class="week-session__area">${escapeHtml(session.area || club.area || 'Manchester')}</span>
          </div>`).join('')
        : '<span class="week-empty" aria-hidden="true">—</span>';
      return `<div class="week-cell" role="cell"><span class="week-day-label">${day.short}</span>${content}</div>`;
    }).join('');

    return `<div class="week-row" role="row">
      <div class="week-club" role="rowheader">
        <a href="${escapeHtml(sitePath(club.profilePath))}">${escapeHtml(club.name)}</a>
        <span>${escapeHtml(`${sportLabel} · ${club.area || 'Manchester'}`)}</span>
      </div>${cells}
    </div>`;
  }).join('');

  weekGrid.innerHTML = `${header}${rows || '<p class="agenda-empty">No clubs match these filters.</p>'}`;
}

/* Day view: sort matching sessions by start time and show the full place and price details. */
function renderDayView(visibleClubs) {
  const events = visibleClubs.flatMap(club => visibleSessions(club, activeDay).map(session => ({ club, session })))
    .sort((left, right) => (left.session.startTime || '99:99').localeCompare(right.session.startTime || '99:99') || left.club.name.localeCompare(right.club.name));

  if (!events.length) {
    dayAgenda.innerHTML = '<p class="agenda-empty">No sessions match these filters for this day.</p>';
    return;
  }

  dayAgenda.innerHTML = events.map(({ club, session }) => {
    /* Day-card eyebrow: identify the sport instead of showing provisional-data status. */
    const sportLabel = displaySportName(club.sport);
    return `<article class="agenda-event">
      <time class="agenda-time">${escapeHtml(formatTime(session))}<span class="agenda-sport">${escapeHtml(sportLabel)}</span></time>
      <a class="agenda-club" href="${escapeHtml(sitePath(club.profilePath))}">${escapeHtml(club.name)}</a>
      <div class="agenda-details"><span>${escapeHtml(session.meetingPoint || session.area || 'Manchester area')}</span>${frequencyToggle(session)}</div>
      <span class="agenda-price">${escapeHtml(priceLabel(club))}</span>
    </article>`;
  }).join('');
}

/* Shared renderer: update the selected view and counts after navigation or any filter change. */
function renderCalendar() {
  const visibleClubs = getVisibleClubs();
  const sessionCount = visibleClubs.reduce((total, club) => total + visibleSessions(club).length, 0);
  resultCount.textContent = `${visibleClubs.length} ${visibleClubs.length === 1 ? 'club' : 'clubs'} · ${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`;
  renderWeekView(visibleClubs);
  if (activeView === 'day') renderDayView(visibleClubs);
}

/* Navigation events: weekday selection switches views without clearing the active filters. */
dayNavigation.addEventListener('click', event => {
  const weekButton = event.target.closest('[data-view="week"]');
  if (weekButton) {
    setView('week');
    return;
  }
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) setView('day', Number(dayButton.dataset.day));
});

weekGrid.addEventListener('click', event => {
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) setView('day', Number(dayButton.dataset.day));
});

backToWeek.addEventListener('click', () => setView('week'));
[sportFilter, priceFilter, areaFilter].forEach(filter => filter.addEventListener('change', renderCalendar));
window.addEventListener('resize', positionCalendarNavFrame);
positionCalendarNavFrame();

/* Startup: load the compact static directory and gracefully report a missing or invalid file. */
async function loadCalendarData() {
  try {
    const response = await fetch('../data/clubs.json');
    if (!response.ok) throw new Error('The club directory could not be loaded. Please try again later.');
    const data = await response.json();
    if (!Array.isArray(data.clubs)) throw new Error('The club directory has an invalid format.');
    clubs = data.clubs.filter(club => club && typeof club.id === 'string' && typeof club.name === 'string');
    populateFilters();
    if (data.metadata?.sampleDataNotice) {
      sampleNote.textContent = data.metadata.sampleDataNotice;
      sampleNote.hidden = false;
    }
    calendarMessage.hidden = true;
    renderCalendar();
  } catch (error) {
    calendarMessage.textContent = error.message || 'The club directory could not be loaded.';
    calendarMessage.hidden = false;
    resultCount.textContent = 'Sessions unavailable';
  }
}

loadCalendarData();
