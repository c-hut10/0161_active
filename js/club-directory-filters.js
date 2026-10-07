import { canonicalArea, displaySportName } from './club-formatting.mjs';
export { PRICE_TYPE_LABELS, PRICE_TYPE_ORDER, priceType, formatPrice as priceLabel } from './club-formatting.mjs';
import { priceType } from './club-formatting.mjs';

/* Existing consumers share the same sport labels and canonical area comparisons. */
export function sportName(value) {
  return displaySportName(value, { titleCase: true, fallback: 'Sport' });
}
export function matchesClubFilters(club, { sport = 'all', price = 'all', area = 'all' }) {
  return (sport === 'all' || club.sport === sport)
    && (price === 'all' || priceType(club) === price)
    && (area === 'all' || canonicalArea(club.area) === canonicalArea(area) || (club.sessions || []).some(session => canonicalArea(session.area || club.area) === canonicalArea(area)));
}
export function validCoordinates(point) {
  return point && typeof point.lat === 'number' && typeof point.lon === 'number'
    && Number.isFinite(point.lat) && Number.isFinite(point.lon)
    && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180;
}
