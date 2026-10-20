import { canonicalArea, displaySportName, formatPrice, formatMembership, clubSports, sportSlug } from './club-formatting.mjs';
export { PRICE_TYPE_LABELS, PRICE_TYPE_ORDER, priceType } from './club-formatting.mjs';
import { priceType } from './club-formatting.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
import { sessionPricingClub } from './session-details.mjs';

/* Calendar pricing: retain the standard charge and explain optional member pricing together. */
export function priceLabel(club, session) {
  const pricedClub = sessionPricingClub(club, session);
  const membership = pricedClub.price?.type === 'free' ? '' : formatMembership(pricedClub);
  return [formatPrice(pricedClub), membership ? `Members: ${membership}` : ''].filter(Boolean).join(' · ');
}

/* Price filters match the actual session cost, including clubs offering paid and free sessions. */
export function matchesSessionPrice(club, session, price = 'all') {
  const pricedClub = sessionPricingClub(club, session);
  return price === 'all' || priceType(pricedClub) === price
    || (price === 'membership' && (['monthly_fee', 'annual_fee'].includes(priceType(pricedClub)) || Boolean(formatMembership(pricedClub))));
}

/* Existing consumers share the same sport labels and canonical area comparisons. */
export function sportName(value) {
  return displaySportName(String(value || '').replaceAll('-', ' '), { titleCase: true, fallback: 'Sport' });
}
export function matchesClubFilters(club, { sport = 'all', price = 'all', area = 'all' }) {
  return (sport === 'all' || clubSports(club).includes(sportSlug(sport)))
    && ((club.sessions || []).length
      ? club.sessions.some(session => matchesSessionPrice(club, session, price))
      : matchesSessionPrice(club, null, price))
    && (area === 'all' || clubTrainingAreas(club).includes(canonicalArea(area)));
}
export function validCoordinates(point) {
  return point && typeof point.lat === 'number' && typeof point.lon === 'number'
    && Number.isFinite(point.lat) && Number.isFinite(point.lon)
    && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180;
}
