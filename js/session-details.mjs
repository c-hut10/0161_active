import { displaySportName, formatPrice, escapeHtml } from './club-formatting.mjs';

/* Shared session labels for calendar cards and club profiles. Explicit titles and
   eligibility take precedence; a team name never implies an attendance policy. */
export function sessionTitle(club, session) {
  if (session.title?.trim()) return session.title.trim();
  const sport = displaySportName(String(club.sport || 'Club').replace(/-/g, ' '), { titleCase: true });
  const activity = club.sport === 'run-club' ? 'Run' : `${sport} session`;
  const group = session.group?.trim();
  if (!group || group === session.meetingPoint) return activity;
  return `${group} · ${activity}`;
}

export function sessionAudience(session) {
  return session.eligibility?.trim() || 'Who can attend: confirm with club';
}

/* Schedule notes: retain irregular frequencies wherever a session is summarised. */
export function sessionScheduleNote(session) {
  const detail = session.specialConsiderations !== session.group
    ? session.specialConsiderations?.trim() : '';
  return [session.everyOtherWeek ? 'Every other week' : '', detail].filter(Boolean).join(' · ');
}

/* Track access: define the charge once for all current and future arena sessions. */
const ARENA_TRACK_FEE = { type: 'paid', amount: 3.5, currency: 'GBP' };
function trackFee(club, session) {
  return ['run-club', 'athletics'].includes(club.sport)
    && /manchester\s+regional\s+arena/i.test(session.meetingPoint || '')
    ? formatPrice({ price: ARENA_TRACK_FEE }) : '';
}

export function sessionVenueNote(club, session) {
  if (session.venueNotes?.trim()) return session.venueNotes.trim();
  const fee = trackFee(club, session);
  return fee ? `There is a ${fee} charge to use the track.` : '';
}

/* Venue-note markup: escape the text before highlighting the track-access amount. */
export function sessionVenueNoteHtml(club, session) {
  const note = escapeHtml(sessionVenueNote(club, session));
  const fee = trackFee(club, session);
  return fee ? note.replace(escapeHtml(fee), `<strong class="session-fee">${escapeHtml(fee)}</strong>`) : note;
}
