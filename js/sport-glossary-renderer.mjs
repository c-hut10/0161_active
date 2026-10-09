import { canonicalArea, DAY_NAMES as dayNames, sessionTime, escapeHtml } from './club-formatting.mjs';
import { clubVerificationBadge } from './club-verification.mjs';
import { clubTrainingAreas } from './club-areas.mjs';

/* Club rows: one HTML renderer keeps generated pages and live filters consistent. */
export function renderSportClubRows(clubs, selectedArea = 'all') {
  return clubs.map(club => {
    const sessions = (club.sessions || []).filter(session => selectedArea === 'all' || canonicalArea(session.area) === selectedArea);
    /* Compact busy schedules: replace four or more listed entries with one summary label. */
    const schedule = (Array.isArray(club.sessions) ? club.sessions.length : 0) > 3
      ? '<span class="sport-club-row__day">3+ weekly sessions</span>'
      : sessions.length
        ? sessions.map(session => {
          const dayNumber = Number(session.dayOfWeek);
          const day = dayNames[dayNumber] || 'Day to confirm';
          return `<span class="sport-club-row__day">${escapeHtml(day)} · ${escapeHtml(sessionTime(session))}</span>`;
        }).join('')
        : '<span class="sport-club-row__day">Training schedule to confirm</span>';
    const area = clubTrainingAreas(club).join(' · ') || 'Area to confirm';

    return `<li>
      <article class="sport-club-row">
        <span class="sport-club-row__number" aria-hidden="true"></span>
        <div class="sport-club-row__details">
          <h3><a class="sport-club-name" href="${escapeHtml(`/${club.profilePath}`)}">${escapeHtml(club.name)}${clubVerificationBadge(club)}</a></h3>
        </div>
        <p class="sport-club-row__sessions">${schedule}</p>
        <p class="sport-club-row__area">${escapeHtml(area)}</p>
        <a class="sport-club-link" href="${escapeHtml(`/${club.profilePath}`)}" aria-label="Open ${escapeHtml(club.name)} profile">↗</a>
      </article>
    </li>`;
  }).join('');
}
