import { POSTCODE_AREAS } from './postcode-areas.mjs';
import { canonicalArea } from './club-formatting.mjs';

/* Postcode sectors: accept a sector key, a full postcode or a postcode within a venue address. */
export function postcodeSector(value) {
  const text = String(value || '').trim().toUpperCase();
  const sector = text.match(/^(M\s*\d{1,2})\s*(\d)$/);
  const postcode = text.match(/\b(M\s*\d{1,2})\s*(\d)\s*[A-Z]{2}\b/);
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

/* Club areas: resolve venues independently and keep existing areas where no rule matches. */
export function resolveClubAreas(club) {
  const mappedSessions = (club.sessions || []).map(session => areaFromPostcode(
    session.postcodeSector, session.postcode, session.postalCode, session.meetingPoint, session.meeting
  ));
  const area = areaFromPostcode(club.postcodeSector, club.postcode, club.postalCode, club.location)
    || mappedSessions.find(Boolean) || canonicalArea(club.area);
  return {
    ...club,
    area,
    sessions: (club.sessions || []).map((session, index) => ({
      ...session,
      area: mappedSessions[index] || canonicalArea(session.area) || area
    }))
  };
}
