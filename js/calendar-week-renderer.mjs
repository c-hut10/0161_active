import { WEEK_DAYS as DAYS, sessionTime as formatTime, escapeHtml, compareSessionStartTimes } from './club-formatting.mjs';
import { clubVerificationBadge } from './club-verification.mjs';
import { sessionTitle, sessionProfileUrl, sessionAddress, sessionAudience, sessionScheduleNote, sessionVenueNote, sessionVenueNoteHtml, sessionTerms } from './session-details.mjs';
import { sportName as displaySportName } from './club-directory-filters.js';

/* Removing a favourite changes only this browser's saved list, never the club record. */
export function removeFavouriteButton(club) {
  return `<button type="button" class="calendar-remove-favourite" data-remove-favourite="${escapeHtml(club.id)}" aria-label="Remove ${escapeHtml(club.name)} from favourites" title="Remove from favourites"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>`;
}

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
      const sessions = [...(sessionsByDay.get(day.number) || [])].sort(compareSessionStartTimes);
      const content = sessions.length
        ? sessions.map(session => `<div class="week-session" aria-label="${escapeHtml(day.name)}, ${escapeHtml(formatTime(session))}, ${escapeHtml(sessionAddress(session) || session.area || 'Area to confirm')}${session.everyOtherWeek ? ', every other week' : ''}">
            <strong class="session-title"><a class="session-title-link" href="${escapeHtml(sessionProfileUrl(club))}">${escapeHtml(sessionTitle(club, session))}</a></strong>
            ${session.subtitle?.trim() ? `<span class="session-subtitle">${escapeHtml(session.subtitle)}</span>` : ''}
            <div class="week-session__top"><time>${escapeHtml(formatTime(session))}</time>${frequencyToggle(session)}</div>
            ${eligibilityMarkup(session)}
            ${session.distanceText ? `<span class="session-distance">${escapeHtml(session.distanceText)}</span>` : ''}
            ${sessionTerms(club, session).map(term => `<span class="session-subtitle">${escapeHtml(term)}</span>`).join('')}
            <span class="week-session__area">${escapeHtml(session.area || 'Area to confirm')}</span>
            ${sessionVenueNote(club, session) ? `<span class="session-subtitle">${sessionVenueNoteHtml(club, session)}</span>` : ''}
          </div>`).join('')
        : '<span class="week-empty" aria-hidden="true">—</span>';
      return `<div class="week-cell${sessions.length ? '' : ' week-cell--empty'}" role="cell"><span class="week-day-label">${day.short}</span>${content}</div>`;
    }).join('');

    return `<div class="week-row" role="row">
      <div class="week-club" role="rowheader">
        <div class="week-club__title">
          <a href="${escapeHtml(sitePath(club.profilePath))}">${escapeHtml(club.name)}${clubVerificationBadge(club)}</a>
          <div class="club-calendar-control">
            ${removeFavouriteButton(club)}
          </div>
        </div>
        <span class="week-club__meta">${escapeHtml(`${sportLabel} · ${club.area || 'Area to confirm'}`)}</span>
      </div>${cells}${sessionsByDay.size ? '' : '<p class="week-empty-summary">Training schedule to confirm.</p>'}
    </div>`;
  }).join('');

  return `${header}${rows || '<p class="agenda-empty">No clubs match these filters.</p>'}`;
}

