import { formatPrice, formatPostcodes, escapeHtml } from './club-formatting.mjs';

/* Session names: use the supplied name or the shared Training/experience fallback. */
export function sessionTitle(club, session) {
  if (session.title?.trim()) return session.title.trim();
  return ['Training', session.eligibility?.trim()].filter(Boolean).join(' ');
}

/* Venues: display the separate postcode once alongside its training address. */
export function sessionAddress(session) {
  const address = formatPostcodes(session.meetingPoint || '');
  const postcode = formatPostcodes(session.postcode || '');
  return postcode && !address.toUpperCase().includes(postcode.toUpperCase())
    ? [address, postcode].filter(Boolean).join(', ') : address;
}

/* Eligibility labels: share the same wording across calendars and omit missing details. */
export function sessionAudience(session) {
  const audience = session.eligibility?.trim() || '';
  if (/^beginner$/i.test(audience)) return 'Beginners Welcome';
  if (/^(intermediate|advanced)$/i.test(audience)) {
    return `${audience.charAt(0).toUpperCase()}${audience.slice(1).toLowerCase()} Level`;
  }
  return audience;
}

/* Schedule notes: retain irregular frequencies wherever a session is summarised. */
export function sessionScheduleNote(session) {
  const detail = session.specialConsiderations?.trim();
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
