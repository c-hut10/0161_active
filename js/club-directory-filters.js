import { canonicalArea, displaySportName, formatPrice, formatMembership } from './club-formatting.mjs';
export { PRICE_TYPE_LABELS, PRICE_TYPE_ORDER, priceType } from './club-formatting.mjs';
import { priceType } from './club-formatting.mjs';
import { clubTrainingAreas } from './club-areas.mjs';

/* Calendar pricing: retain the standard charge and explain optional member pricing together. */
export function priceLabel(club) {
  const membership = formatMembership(club);
  return [formatPrice(club), membership ? `Members: ${membership}` : ''].filter(Boolean).join(' · ');
}

/* Existing consumers share the same sport labels and canonical area comparisons. */
export function sportName(value) {
  return displaySportName(value, { titleCase: true, fallback: 'Sport' });
}
export function matchesClubFilters(club, { sport = 'all', price = 'all', area = 'all' }) {
  return (sport === 'all' || club.sport === sport)
    && (price === 'all' || priceType(club) === price
      || (price === 'membership' && (['monthly_fee', 'annual_fee'].includes(priceType(club)) || Boolean(formatMembership(club)))))
    && (area === 'all' || clubTrainingAreas(club).includes(canonicalArea(area)));
}
export function validCoordinates(point) {
  return point && typeof point.lat === 'number' && typeof point.lon === 'number'
    && Number.isFinite(point.lat) && Number.isFinite(point.lon)
    && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180;
}
