import { WEEK_DAYS as DAYS, sessionTime as formatTime, escapeHtml } from './club-formatting.mjs';
import { clubVerificationBadge } from './club-verification.mjs';
import { CALENDAR_DOWNLOAD_LABEL, CALENDAR_FILE_LABEL } from './club-calendar.mjs';
import { sessionTitle, sessionAddress, sessionAudience, sessionScheduleNote, sessionVenueNote, sessionVenueNoteHtml } from './session-details.mjs';
import { sportName as displaySportName } from './club-directory-filters.js';

/* Weekly calendar HTML: render the same schedule at build time and after filtering. */
export function frequencyToggle(session) {
  const note = sessionScheduleNote(session);
  return note
    ? `<details class="session-frequency"><summary aria-label="Show session details">i</summary><span>${escapeHtml(note)}</span></details>`
    : '';
}

function sitePath(path) {
  return path ? `/${path}` : '#';
}

/* Calendar eligibility: show a row only when the shared label has a supplied value. */
export function eligibilityMarkup(session) {
  const audience = sessionAudience(session);
  return audience ? `<span class="session-audience">${escapeHtml(audience)}</span>` : '';
}

/* Weekly view: render each club once using its prepared weekday session groups. */
export function renderWeekGrid(entries) {
  const header = `<div class="week-head" role="row">
    <div role="columnheader">CLUB / AREA (A–Z)</div>
    ${DAYS.map(day => `<div role="columnheader"><button type="button" data-day="${day.number}" aria-label="Show ${day.name} sessions">${day.short}</button></div>`).join('')}
  </div>`;

  const rows = entries.map(({ club, sessionsByDay }) => {
    /* Full-week sublabel: display the stored sport key in title case. */
    const sportLabel = displaySportName(club.sport);
    const cells = DAYS.map(day => {
      const sessions = sessionsByDay.get(day.number) || [];
      const content = sessions.length
        ? sessions.map(session => `<div class="week-session" aria-label="${escapeHtml(day.name)}, ${escapeHtml(formatTime(session))}, ${escapeHtml(sessionAddress(session) || session.area || 'Area to confirm')}${session.everyOtherWeek ? ', every other week' : ''}">
            <strong class="session-title">${escapeHtml(sessionTitle(club, session))}</strong>
            ${session.subtitle?.trim() ? `<span class="session-subtitle">${escapeHtml(session.subtitle)}</span>` : ''}
            <div class="week-session__top"><time>${escapeHtml(formatTime(session))}</time>${frequencyToggle(session)}</div>
            ${eligibilityMarkup(session)}
            <span class="week-session__area">${escapeHtml(session.area || 'Area to confirm')}</span>
            ${sessionVenueNote(club, session) ? `<span class="session-subtitle">${sessionVenueNoteHtml(club, session)}</span>` : ''}
          </div>`).join('')
        : '<span class="week-empty" aria-hidden="true">—</span>';
      return `<div class="week-cell" role="cell"><span class="week-day-label">${day.short}</span>${content}</div>`;
    }).join('');

    return `<div class="week-row" role="row">
      <div class="week-club" role="rowheader">
        <div class="week-club__title">
          <a href="${escapeHtml(sitePath(club.profilePath))}">${escapeHtml(club.name)}${clubVerificationBadge(club)}</a>
          <div class="club-calendar-control">
            <button type="button" class="club-calendar-download" data-calendar-club="${escapeHtml(club.id)}" aria-label="${escapeHtml(CALENDAR_DOWNLOAD_LABEL)} for ${escapeHtml(club.name)}" aria-describedby="calendar-tooltip-${escapeHtml(club.id)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-9 3v5m-3-3 3 3 3-3"/></svg>
            </button>
            <span class="club-calendar-tooltip" id="calendar-tooltip-${escapeHtml(club.id)}" role="tooltip">${escapeHtml(CALENDAR_DOWNLOAD_LABEL.toUpperCase())}<small>${escapeHtml(CALENDAR_FILE_LABEL)}</small></span>
          </div>
        </div>
        <span>${escapeHtml(`${sportLabel} · ${club.area || 'Area to confirm'}`)}</span>
      </div>${cells}
    </div>`;
  }).join('');

  return `${header}${rows || '<p class="agenda-empty">No clubs match these filters.</p>'}`;
}

