import { postcodeSector } from './club-areas.mjs';

/* Sector-to-sector straight-line estimates. No submitted postcode leaves the browser. */
export function milesBetween(left, right) {
  const rad = degrees => degrees * Math.PI / 180;
  const dLat = rad(right[0] - left[0]);
  const dLon = rad(right[1] - left[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(left[0])) * Math.cos(rad(right[0])) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function sessionSector(session) {
  return postcodeSector(session.postcode) || postcodeSector(session.meetingPoint);
}
export function distanceLabel(miles, sameSector = false) {
  if (sameSector) return 'Same approximate area';
  return miles < 1 ? 'Under 1 mile (approx.)' : `Approx. ${Math.round(miles)} ${Math.round(miles) === 1 ? 'mile' : 'miles'}`;
}
