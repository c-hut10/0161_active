import { POSTCODE_AREAS } from './postcode-areas.mjs';
import { canonicalArea, formatPostcodes } from './club-formatting.mjs';

/* Address data: retain venue wording while standardising embedded and separate postcodes. */
function formatLocationFields(record) {
  const formatted = { ...record };
  for (const key of ['meetingPoint', 'postcode']) {
    if (typeof formatted[key] === 'string') formatted[key] = formatPostcodes(formatted[key]);
  }
  return formatted;
}

export function normalizeClubPostcodes(club) {
  const formatted = formatLocationFields(club);
  formatted.sessions = (club.sessions || []).map(formatLocationFields);
  if (Array.isArray(club.trainingVenues)) formatted.trainingVenues = club.trainingVenues.map(formatLocationFields);
  return formatted;
}

/* Postcode sectors: accept a sector key, a full postcode or a postcode within a venue address. */
export function postcodeSector(value) {
  const text = String(value || '').trim().toUpperCase();
  const sector = text.match(/^([A-Z]{1,2}\s*\d{1,2}[A-Z]?)\s*(\d)$/);
  const postcode = text.match(/\b([A-Z]{1,2}\s*\d{1,2}[A-Z]?)\s*(\d)\s*[A-Z]{2}\b/);
  const match = sector || postcode;
  return match ? `${match[1].replace(/\s/g, '')} ${match[2]}` : '';
}

/* Approved area lookup: use only the labels generated from the owner's rulebook. */
export function areaFromPostcode(...values) {
  for (const value of values) {
    const area = POSTCODE_AREAS[postcodeSector(value)];
    if (area) return area;
  }
  return '';
}

/* Club areas: derive each venue independently; unknown postcodes never inherit another venue's area. */
export function resolveClubAreas(club) {
  club = normalizeClubPostcodes(club);
  const sessions = club.sessions.map(session => ({
    ...session, area: areaFromPostcode(session.postcode, session.meetingPoint)
  }));
  const resolved = { ...club, sessions };
  return { ...resolved, area: clubTrainingAreas(resolved)[0] || '' };
}

/* Display areas: list each training area once, ordered by its first weekly session. */
export function clubTrainingAreas(club) {
  const sessions = Array.isArray(club.sessions) ? [...club.sessions] : [];
  const dayOrder = session => {
    const day = Number(session.dayOfWeek);
    return day >= 1 && day <= 7 ? day : 8;
  };
  sessions.sort((left, right) => dayOrder(left) - dayOrder(right)
    || (left.startTime || '99:99').localeCompare(right.startTime || '99:99'));
  // Undated venues support area discovery but never create calendar sessions.
  const venues = (club.trainingVenues || []).map(venue => areaFromPostcode(venue.postcode, venue.meetingPoint));
  return [...new Set([...sessions.map(session => canonicalArea(session.area)), ...venues].filter(Boolean))];
}
